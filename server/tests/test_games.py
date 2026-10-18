import pytest
from httpx import ASGITransport, AsyncClient

from app.core.database import close_db, init_db
from app.main import app
from app.models.user import User


@pytest.fixture(autouse=True)
async def setup_db():
    await init_db()
    yield
    await close_db()


@pytest.mark.asyncio
async def test_arena_games_flow():
    """
    Tests the new arena games (memory-vault, brain-battle, code-breaker, aim-challenge):
    - Starting a session
    - Finishing a session (higher-is-better scoring)
    - XP = round(score/10) clamped to [5, 200], Coins = round(xp/4)
    - Personal best update
    - Code Breaker daily practice handling
    """
    test_username = "arena_tester"
    test_email = "arena_tester@gameverse.io"
    test_password = "Password123!"

    cleanup = await User.find_one({"username": test_username})
    if cleanup:
        await cleanup.delete()

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        # Register user
        reg_res = await ac.post("/api/v1/auth/register", json={
            "username": test_username,
            "email": test_email,
            "password": test_password,
            "avatar": "cyber-ninja"
        })
        assert reg_res.status_code == 201
        token = reg_res.json()["data"]["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        # 1. Memory Vault: start and finish
        mv_start = await ac.post("/api/v1/games/memory-vault/start", headers=headers)
        assert mv_start.status_code == 200
        mv_session_id = mv_start.json()["data"]["session_id"]

        mv_finish = await ac.post("/api/v1/games/memory-vault/finish", headers=headers, json={
            "session_id": mv_session_id,
            "score": 850,
            "duration_ms": 45000,
            "meta": {"gridSize": "4x4", "moves": 16, "maxCombo": 4}
        })
        assert mv_finish.status_code == 200
        mv_data = mv_finish.json()["data"]
        assert mv_data["score"] == 850
        assert mv_data["is_new_best"] is True
        assert mv_data["personal_best"] == 850
        # XP = round(850 / 10) = 85 clamped to [5, 200] -> 85, Coins = round(85 / 4) = 21
        assert mv_data["xp_earned"] == 85
        assert mv_data["coins_earned"] == 21

        # 2. Memory Vault: lower score should NOT overwrite personal best (higher-is-better)
        mv_start2 = await ac.post("/api/v1/games/memory-vault/start", headers=headers)
        mv_finish2 = await ac.post("/api/v1/games/memory-vault/finish", headers=headers, json={
            "session_id": mv_start2.json()["data"]["session_id"],
            "score": 600,
            "duration_ms": 50000,
        })
        assert mv_finish2.status_code == 200
        mv_data2 = mv_finish2.json()["data"]
        assert mv_data2["score"] == 600
        assert mv_data2["is_new_best"] is False
        assert mv_data2["personal_best"] == 850

        # 3. Code Breaker: daily code first play is scored, second play is practice
        cb_start1 = await ac.post("/api/v1/games/code-breaker/start", headers=headers)
        assert cb_start1.status_code == 200
        assert cb_start1.json()["data"]["is_daily_available"] is True

        cb_finish1 = await ac.post("/api/v1/games/code-breaker/finish", headers=headers, json={
            "session_id": cb_start1.json()["data"]["session_id"],
            "score": 450,
            "duration_ms": 30000,
            "meta": {"daily": True, "attemptsUsed": 4, "hintsUsed": 0}
        })
        assert cb_finish1.status_code == 200
        assert cb_finish1.json()["data"]["is_practice"] is False
        assert cb_finish1.json()["data"]["xp_earned"] == 45
        assert cb_finish1.json()["data"]["coins_earned"] == 11

        # Second play today should be marked practice
        cb_start2 = await ac.post("/api/v1/games/code-breaker/start", headers=headers)
        assert cb_start2.status_code == 200
        assert cb_start2.json()["data"]["is_daily_available"] is False

        cb_finish2 = await ac.post("/api/v1/games/code-breaker/finish", headers=headers, json={
            "session_id": cb_start2.json()["data"]["session_id"],
            "score": 700,
            "duration_ms": 25000,
            "meta": {"daily": True, "attemptsUsed": 3, "hintsUsed": 0}
        })
        assert cb_finish2.status_code == 200
        assert cb_finish2.json()["data"]["is_practice"] is True
        assert cb_finish2.json()["data"]["xp_earned"] == 0
        assert cb_finish2.json()["data"]["coins_earned"] == 0
        assert cb_finish2.json()["data"]["personal_best"] == 450

        # 4. Fetch history and leaderboards
        hist_res = await ac.get("/api/v1/games/memory-vault/history", headers=headers)
        assert hist_res.status_code == 200
        assert hist_res.json()["data"]["personal_best"] == 850
        assert len(hist_res.json()["data"]["sessions"]) == 2

        lb_res = await ac.get("/api/v1/games/memory-vault/leaderboard")
        assert lb_res.status_code == 200
        assert len(lb_res.json()["data"]["entries"]) >= 1
