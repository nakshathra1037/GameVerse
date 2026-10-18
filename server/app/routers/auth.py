from fastapi import APIRouter, Depends, Request, status

from app.models.user import User
from app.schemas.common import APIResponse
from app.schemas.user import (
    LogoutRequest,
    RefreshTokenRequest,
    TokenResponse,
    UserLogin,
    UserRegister,
    UserResponse,
)
from app.services.auth_service import (
    authenticate_user,
    get_current_user,
    logout_user,
    refresh_access_token,
    register_user,
    user_to_response,
)

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post(
    "/register",
    response_model=APIResponse[TokenResponse],
    status_code=status.HTTP_201_CREATED,
    summary="Register a new player account"
)
async def register(data: UserRegister):
    """
    Creates a new user profile with starting level 1, 0 XP, and 50 bonus starter coins.
    Returns access token, refresh token, and player details.
    """
    token_resp = await register_user(data)
    return APIResponse(success=True, data=token_resp)


@router.post(
    "/login",
    response_model=APIResponse[TokenResponse],
    summary="Log into existing player account"
)
async def login(data: UserLogin, request: Request):
    """
    Authenticates via username or email and password.
    Enforces rate limiting on consecutive failed attempts.
    Returns access token, refresh token, and player details.
    """
    client_ip = request.client.host if request.client else "unknown"
    token_resp = await authenticate_user(data, client_ip=client_ip)
    return APIResponse(success=True, data=token_resp)


@router.post(
    "/refresh",
    response_model=APIResponse[TokenResponse],
    summary="Renew access token using a refresh token"
)
async def refresh_token(data: RefreshTokenRequest):
    """
    Validates the provided refresh token and performs token rotation,
    issuing a fresh access token and a renewed refresh token.
    """
    token_resp = await refresh_access_token(data.refresh_token)
    return APIResponse(success=True, data=token_resp)


@router.post(
    "/logout",
    response_model=APIResponse[dict],
    summary="Revoke player session and refresh token"
)
async def logout(
    data: LogoutRequest | None = None,
    current_user: User = Depends(get_current_user)
):
    """
    Invalidates current session by deleting the active refresh token hash.
    If no specific token is provided in the body, revokes all player sessions.
    """
    refresh_token = data.refresh_token if data else None
    await logout_user(current_user, refresh_token)
    return APIResponse(
        success=True,
        data={"message": "Successfully logged out and session revoked."}
    )


@router.get(
    "/me",
    response_model=APIResponse[UserResponse],
    summary="Get current authenticated player profile"
)
async def get_me(current_user: User = Depends(get_current_user)):
    """
    Validates JWT token from the Authorization header and returns current player details.
    Used by frontend to restore user sessions on page load or refresh.
    """
    return APIResponse(success=True, data=user_to_response(current_user))
