import pytest
from httpx import ASGITransport, AsyncClient

from app.core.database import close_db, init_db
from app.core.security import login_rate_limiter
from app.main import app
from app.models.user import User


@pytest.fixture(autouse=True)
async def setup_database():
    """Initializes the database connection before running tests and cleans up after."""
    await init_db()
    login_rate_limiter.reset_all()
    yield
    await close_db()


@pytest.mark.asyncio
async def test_health_endpoint():
    """Verify health endpoint returns standard envelope with connected database."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.get("/api/v1/health")
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["data"]["status"] == "ok"
        assert data["data"]["database"] == "connected"


@pytest.mark.asyncio
async def test_auth_full_lifecycle():
    """
    Comprehensive test of Stage 1 Authentication:
    - Registration with 50 bonus starter coins & level 1
    - Duplicate registration rejection
    - Login via username and email
    - Invalid password rejection with consistent error envelope
    - User profile (/me) retrieval with Bearer token
    - Refresh token rotation flow (/refresh)
    - Session revocation on logout (/logout)
    """
    test_username = "stage1_cyberhero"
    test_email = "stage1_cyberhero@gameverse.io"
    test_password = "SecurePassword123!"

    # 1. Clean up any leftover test data
    existing = await User.find_one({"username": test_username})
    if existing:
        await existing.delete()

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        # 2. Register player
        reg_payload = {
            "username": test_username,
            "email": test_email,
            "password": test_password,
            "avatar": "neon-phoenix"
        }
        reg_res = await ac.post("/api/v1/auth/register", json=reg_payload)
        assert reg_res.status_code == 201, f"Register failed: {reg_res.text}"
        reg_json = reg_res.json()
        assert reg_json["success"] is True
        assert "data" in reg_json
        token_data = reg_json["data"]
        assert "access_token" in token_data
        assert "refresh_token" in token_data
        assert token_data["user"]["username"] == test_username
        assert token_data["user"]["avatar"] == "neon-phoenix"
        assert token_data["user"]["level"] == 1
        assert token_data["user"]["xp"] == 0
        assert token_data["user"]["coins"] == 50

        access_token = token_data["access_token"]
        refresh_token = token_data["refresh_token"]

        # 3. Duplicate registration should return 400 with standard error envelope
        dup_res = await ac.post("/api/v1/auth/register", json=reg_payload)
        assert dup_res.status_code == 400
        dup_json = dup_res.json()
        assert dup_json["success"] is False
        assert dup_json["error"]["code"] == "BAD_REQUEST"

        # 4. Login with username
        login_res = await ac.post(
            "/api/v1/auth/login",
            json={"login": test_username, "password": test_password}
        )
        assert login_res.status_code == 200
        login_json = login_res.json()
        assert login_json["success"] is True
        assert login_json["data"]["user"]["email"] == test_email

        # 5. Login with email
        email_login_res = await ac.post(
            "/api/v1/auth/login",
            json={"login": test_email, "password": test_password}
        )
        assert email_login_res.status_code == 200

        # 6. Login with wrong password should fail with 401
        bad_login_res = await ac.post(
            "/api/v1/auth/login",
            json={"login": test_username, "password": "WrongPassword!"}
        )
        assert bad_login_res.status_code == 401
        bad_json = bad_login_res.json()
        assert bad_json["success"] is False
        assert bad_json["error"]["code"] == "UNAUTHORIZED"

        # 7. Get current user profile (/me)
        me_res = await ac.get(
            "/api/v1/auth/me",
            headers={"Authorization": f"Bearer {access_token}"}
        )
        assert me_res.status_code == 200
        me_json = me_res.json()
        assert me_json["success"] is True
        assert me_json["data"]["username"] == test_username
        assert me_json["data"]["coins"] == 50

        # 8. Refresh token rotation flow
        refresh_res = await ac.post(
            "/api/v1/auth/refresh",
            json={"refresh_token": refresh_token}
        )
        assert refresh_res.status_code == 200
        refresh_json = refresh_res.json()
        assert refresh_json["success"] is True
        new_access_token = refresh_json["data"]["access_token"]
        new_refresh_token = refresh_json["data"]["refresh_token"]
        assert new_access_token != access_token

        # 9. Old refresh token cannot be reused (rotation security)
        old_refresh_res = await ac.post(
            "/api/v1/auth/refresh",
            json={"refresh_token": refresh_token}
        )
        assert old_refresh_res.status_code == 401

        # 10. Logout and session revocation
        logout_res = await ac.post(
            "/api/v1/auth/logout",
            json={"refresh_token": new_refresh_token},
            headers={"Authorization": f"Bearer {new_access_token}"}
        )
        assert logout_res.status_code == 200
        assert logout_res.json()["success"] is True

        # 11. Refreshing after logout should fail
        revoked_res = await ac.post(
            "/api/v1/auth/refresh",
            json={"refresh_token": new_refresh_token}
        )
        assert revoked_res.status_code == 401

    # Clean up test user
    cleanup_user = await User.find_one({"username": test_username})
    if cleanup_user:
        await cleanup_user.delete()


@pytest.mark.asyncio
async def test_login_rate_limiting():
    """Verify that exceeding failed login attempts triggers HTTP 429 Too Many Requests."""
    login_rate_limiter.reset_all()

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        # Submit 5 failed attempts
        for _ in range(5):
            res = await ac.post(
                "/api/v1/auth/login",
                json={"login": "nonexistent_target", "password": "WrongPassword"}
            )
            assert res.status_code == 401

        # 6th attempt should be blocked by rate limiter
        blocked_res = await ac.post(
            "/api/v1/auth/login",
            json={"login": "nonexistent_target", "password": "WrongPassword"}
        )
        assert blocked_res.status_code == 429
        blocked_json = blocked_res.json()
        assert blocked_json["success"] is False
        assert blocked_json["error"]["code"] == "RATE_LIMIT_EXCEEDED"
        assert "Retry-After" in blocked_res.headers
