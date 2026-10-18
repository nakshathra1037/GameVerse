from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator


class UserRegister(BaseModel):
    """Schema for registering a new player."""
    username: str = Field(
        ...,
        min_length=3,
        max_length=20,
        description="Unique username for the player",
        examples=["pixel_ninja"]
    )
    email: EmailStr = Field(
        ...,
        description="Valid player email address",
        examples=["player@gameverse.io"]
    )
    password: str = Field(
        ...,
        min_length=6,
        max_length=100,
        description="Secret password (min 6 chars)",
        examples=["SecretPass123!"]
    )
    avatar: str | None = Field(
        default="cyber-ninja",
        description="Chosen avatar preset ID",
        examples=["cyber-ninja"]
    )

    @field_validator("username")
    @classmethod
    def validate_username(cls, v: str) -> str:
        cleaned = v.strip()
        if not all(c.isalnum() or c in "_-" for c in cleaned):
            raise ValueError(
                "Username may only contain letters, numbers, hyphens, and underscores."
            )
        return cleaned


class UserLogin(BaseModel):
    """Schema for player login using either username or email."""
    login: str = Field(
        ...,
        min_length=3,
        description="Username or email address",
        examples=["pixel_ninja"]
    )
    password: str = Field(
        ...,
        min_length=1,
        description="Account password",
        examples=["SecretPass123!"]
    )


class UserResponse(BaseModel):
    """Public player profile schema returned to client."""
    id: str = Field(..., examples=["65f1234abcd5678ef9012345"])
    username: str = Field(..., examples=["pixel_ninja"])
    email: EmailStr = Field(..., examples=["player@gameverse.io"])
    avatar: str = Field(..., examples=["cyber-ninja"])
    level: int = Field(..., examples=[1])
    xp: int = Field(..., examples=[0])
    coins: int = Field(..., examples=[50])
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class TokenResponse(BaseModel):
    """Authentication response payload containing JWT tokens and player profile."""
    access_token: str = Field(..., description="Short-lived JWT access token for API authorization")
    refresh_token: str = Field(..., description="Long-lived JWT refresh token to renew access")
    token_type: str = Field(default="bearer", description="Token standard type")
    user: UserResponse


class RefreshTokenRequest(BaseModel):
    """Payload to exchange a valid refresh token for a fresh token pair."""
    refresh_token: str = Field(..., description="Existing valid refresh token")


class LogoutRequest(BaseModel):
    """Optional payload when logging out to explicitly revoke a specific refresh token."""
    refresh_token: str | None = Field(default=None, description="Optional refresh token to revoke")
