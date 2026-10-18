from datetime import UTC, datetime, timedelta

import pytest
from httpx import ASGITransport, AsyncClient

from app.core.database import close_db, init_db
from app.main import app
from app.models.game_session import GameSession
from app.models.score import Score
from app.models.user import User


@pytest.fixture(autouse=True)
async def setup_db():
    await init_db()
    yield
    await close_db()


@pytest.mark.asyncio
async def test_reflex_rush_full_flow():
    """
    Tests the complete Reflex Rush lifecycle:
    1. Register user and obtain token.
    2. Start game session -> receives session_id and 5 delays.
    3. Anti-cheat: Reaction time < 100ms rejected.
    4. Anti-cheat: Premature submission (elapsed time too short) rejected.
    5. Legitimate submission -> score, XP, coins, and personal best calculated.
    6. Repeated submission rejected.
    7. Fetch history -> verified.
    """
    test_username = "reflex_champion"
    test_email = "reflex@gameverse.io"
    test_password = "Password123!"

    # Clean up test user
    cleanup = await User.find_one({"username": test_username})
    if cleanup:
        await cleanup.delete()

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        # 1. Register
        reg_res = await ac.post("/api/v1/auth/register", json={
            "username": test_username,
            "email": test_email,
            "password": test_password,
            "avatar": "shadow-rogue"
        })
        assert reg_res.status_code == 201
        token = reg_res.json()["data"]["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        # 2. Start game session
        start_res = await ac.post("/api/v1/games/reflex-rush/start", headers=headers)
        assert start_res.status_code == 200
        start_data = start_res.json()["data"]
        session_id = start_data["session_id"]
        delays = start_data["delays"]

        assert len(delays) == 5
        assert all(1.0 <= d <= 4.0 for d in delays)

        # 3. Anti-cheat check 1: Reaction time < 100 ms must be rejected
        bad_rt_res = await ac.post("/api/v1/games/reflex-rush/finish", json={
            "session_id": session_id,
            "reaction_times": [250, 240, 80, 220, 210]  # 80ms is impossible
        }, headers=headers)
        assert bad_rt_res.status_code == 400
        assert "Impossible reaction time" in bad_rt_res.json()["error"]["message"]

        # 4. Start a fresh session for timing check
        start_res2 = await ac.post("/api/v1/games/reflex-rush/start", headers=headers)
        assert start_res2.status_code == 200
        session_id2 = start_res2.json()["data"]["session_id"]

        # Anti-cheat check 2: Submitting without waiting (timing forgery) must be rejected
        fast_res = await ac.post("/api/v1/games/reflex-rush/finish", json={
            "session_id": session_id2,
            "reaction_times": [250, 240, 230, 220, 210]
        }, headers=headers)
        assert fast_res.status_code == 400
        assert "Elapsed session duration" in fast_res.json()["error"]["message"]

        # 5. Start a valid session and simulate elapsed time passage by backdating start_time in DB
        start_res3 = await ac.post("/api/v1/games/reflex-rush/start", headers=headers)
        assert start_res3.status_code == 200
        session_id3 = start_res3.json()["data"]["session_id"]

        # Simulate 25 seconds of valid gameplay elapsed
        session_doc = await GameSession.get(session_id3)
        session_doc.start_time = datetime.now(UTC) - timedelta(seconds=25)
        await session_doc.save()

        # Submit valid reaction times: avg = (210 + 220 + 230 + 240 + 250) / 5 = 230 ms
        valid_finish_res = await ac.post("/api/v1/games/reflex-rush/finish", json={
            "session_id": session_id3,
            "reaction_times": [210, 220, 230, 240, 250]
        }, headers=headers)
        assert valid_finish_res.status_code == 200
        finish_data = valid_finish_res.json()["data"]

        assert finish_data["score"] == 230
        assert finish_data["is_new_best"] is True
        assert finish_data["personal_best"] == 230
        assert finish_data["xp_earned"] > 0
        assert finish_data["coins_earned"] > 0

        # 6. Re-submitting the same finished session must fail with 400
        repeat_res = await ac.post("/api/v1/games/reflex-rush/finish", json={
            "session_id": session_id3,
            "reaction_times": [210, 220, 230, 240, 250]
        }, headers=headers)
        assert repeat_res.status_code == 400
        assert "already completed" in repeat_res.json()["error"]["message"]

        # 7. Query history endpoint
        history_res = await ac.get("/api/v1/games/reflex-rush/history", headers=headers)
        assert history_res.status_code == 200
        history_data = history_res.json()["data"]

        assert history_data["game_id"] == "reflex-rush"
        assert history_data["personal_best"] == 230
        assert len(history_data["sessions"]) == 1
        assert history_data["sessions"][0]["score"] == 230

        # 8. Query cross-game recent-history endpoint
        recent_res = await ac.get("/api/v1/games/recent-history", headers=headers)
        assert recent_res.status_code == 200
        recent_data = recent_res.json()["data"]
        assert len(recent_data["sessions"]) == 1
        assert recent_data["sessions"][0]["game_id"] == "reflex-rush"
        assert recent_data["sessions"][0]["score"] == 230
        assert recent_data["personal_bests"]["reflex-rush"] == 230


    # Clean up test user and records
    cleanup_user = await User.find_one({"username": test_username})
    if cleanup_user:
        await GameSession.find({"user_id": cleanup_user.id}).delete()
        await Score.find({"user_id": cleanup_user.id}).delete()
        await cleanup_user.delete()
