from datetime import UTC, datetime

from beanie import PydanticObjectId
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.core.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    hash_password,
    hash_token,
    login_rate_limiter,
    verify_password,
)
from app.models.user import User
from app.schemas.user import TokenResponse, UserLogin, UserRegister, UserResponse

# HTTPBearer extracts the token automatically from "Authorization: Bearer <token>" header
security_scheme = HTTPBearer(auto_error=True)


def user_to_response(user: User) -> UserResponse:
    """Transforms a MongoDB Beanie User Document into a clean UserResponse Pydantic schema."""
    return UserResponse(
        id=str(user.id),
        username=user.username,
        email=user.email,
        avatar=user.avatar,
        level=user.level,
        xp=user.xp,
        coins=user.coins,
        created_at=user.created_at,
    )


async def register_user(data: UserRegister) -> TokenResponse:
    """
    Registers a new player after verifying uniqueness of username and email.
    Saves hashed password to MongoDB, initializes refresh token store, and returns tokens.
    """
    clean_username = data.username.strip()
    clean_email = data.email.lower().strip()

    # Check if username is already taken
    existing_username = await User.find_one({"username": clean_username})
    if existing_username:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A player with this username already exists."
        )

    # Check if email is already registered
    existing_email = await User.find_one({"email": clean_email})
    if existing_email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An account with this email address already exists."
        )

    # Hash the password securely using bcrypt
    hashed = hash_password(data.password)

    # Create new player document with 50 bonus starter coins
    new_user = User(
        username=clean_username,
        email=clean_email,
        hashed_password=hashed,
        avatar=data.avatar or "cyber-ninja",
        level=1,
        xp=0,
        coins=50,
        is_active=True,
        refresh_token_hashes=[]
    )
    await new_user.insert()

    # Generate JWT access token & refresh token
    access_token = create_access_token(subject=str(new_user.id))
    refresh_token = create_refresh_token(subject=str(new_user.id))

    # Persist the hash of the refresh token for revocation tracking
    new_user.refresh_token_hashes.append(hash_token(refresh_token))
    await new_user.save()

    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        token_type="bearer",
        user=user_to_response(new_user)
    )


async def authenticate_user(login_data: UserLogin, client_ip: str = "unknown") -> TokenResponse:
    """
    Authenticates a player using either username or email,
    enforcing rate limiting on brute force attempts and returning fresh tokens.
    """
    rate_key = f"{client_ip}:{login_data.login.lower()}"

    # Check rate limit
    is_allowed, retry_after = login_rate_limiter.is_allowed(rate_key)
    if not is_allowed:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Too many failed login attempts. Please try again in {retry_after} seconds.",
            headers={"Retry-After": str(retry_after)}
        )

    login_identifier = login_data.login.strip()

    # Query MongoDB for matching username OR email
    user = await User.find_one({
        "$or": [
            {"username": login_identifier},
            {"email": login_identifier.lower()}
        ]
    })

    if not user or not verify_password(login_data.password, user.hashed_password):
        login_rate_limiter.record_failure(rate_key)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username/email or password.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This account has been deactivated."
        )

    # Successful login: reset rate limit attempts for this player/IP
    login_rate_limiter.clear(rate_key)

    access_token = create_access_token(subject=str(user.id))
    refresh_token = create_refresh_token(subject=str(user.id))

    # Keep at most 5 recent sessions to avoid unbounded array growth
    user.refresh_token_hashes = user.refresh_token_hashes[-4:]
    user.refresh_token_hashes.append(hash_token(refresh_token))
    user.updated_at = datetime.now(UTC)
    await user.save()

    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        token_type="bearer",
        user=user_to_response(user)
    )


async def refresh_access_token(refresh_token: str) -> TokenResponse:
    """
    Validates an existing refresh token, rotates it, and issues a fresh token pair.
    """
    payload = decode_token(refresh_token, expected_type="refresh")
    if not payload or "sub" not in payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired refresh token.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    try:
        user_id = PydanticObjectId(payload["sub"])
    except (ValueError, TypeError):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid user token format.",
            headers={"WWW-Authenticate": "Bearer"},
        ) from None

    user = await User.get(user_id)
    if not user or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found or account deactivated.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token_hash = hash_token(refresh_token)
    if token_hash not in user.refresh_token_hashes:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token has been revoked or is no longer valid.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Token rotation: remove old refresh token hash and append new one
    user.refresh_token_hashes.remove(token_hash)
    new_access_token = create_access_token(subject=str(user.id))
    new_refresh_token = create_refresh_token(subject=str(user.id))
    user.refresh_token_hashes.append(hash_token(new_refresh_token))
    user.updated_at = datetime.now(UTC)
    await user.save()

    return TokenResponse(
        access_token=new_access_token,
        refresh_token=new_refresh_token,
        token_type="bearer",
        user=user_to_response(user)
    )


async def logout_user(user: User, refresh_token: str | None = None):
    """
    Invalidates session by revoking the specific refresh token or all stored tokens.
    """
    if refresh_token:
        token_hash = hash_token(refresh_token)
        if token_hash in user.refresh_token_hashes:
            user.refresh_token_hashes.remove(token_hash)
    else:
        # Clear all active sessions
        user.refresh_token_hashes.clear()

    user.updated_at = datetime.now(UTC)
    await user.save()


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security_scheme)
) -> User:
    """
    FastAPI dependency that extracts and validates the Bearer access token from request headers.
    Loads and returns the active User document from MongoDB.
    """
    token = credentials.credentials
    payload = decode_token(token, expected_type="access")

    if not payload or "sub" not in payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials or token expired.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user_id_str = payload["sub"]
    try:
        user_id = PydanticObjectId(user_id_str)
    except (ValueError, TypeError):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid user token format.",
            headers={"WWW-Authenticate": "Bearer"},
        ) from None

    user = await User.get(user_id)
    if not user or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found or account is deactivated.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return user
