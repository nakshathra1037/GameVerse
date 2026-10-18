from datetime import UTC, datetime
from typing import Annotated

from beanie import Document, Indexed
from pydantic import Field


class User(Document):
    """
    MongoDB Document representing a GameVerse player in the 'users' collection.
    Managed asynchronously by Beanie ODM.
    """
    username: Annotated[str, Indexed(unique=True)]
    email: Annotated[str, Indexed(unique=True)]
    hashed_password: str
    avatar: str = Field(default="cyber-ninja", description="Identifier for chosen avatar preset")
    level: int = Field(default=1, description="Player level calculated from XP")
    xp: int = Field(default=0, ge=0, description="Total earned Experience Points")
    coins: int = Field(
        default=50,
        ge=0,
        description="In-game currency balance (starts with 50 bonus coins)"
    )
    is_active: bool = Field(default=True)
    refresh_token_hashes: list[str] = Field(
        default_factory=list,
        description="List of active hashed refresh tokens for session management & revocation"
    )
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(UTC))

    class Settings:
        name = "users"
        use_state_management = True

    def __repr__(self) -> str:
        return (
            f"<User username='{self.username}' level={self.level} "
            f"xp={self.xp} coins={self.coins}>"
        )
