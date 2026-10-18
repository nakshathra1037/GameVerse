from datetime import UTC, datetime
from typing import Annotated

from beanie import Document, Indexed, PydanticObjectId
from pydantic import Field


class Transaction(Document):
    """
    MongoDB Document maintaining an immutable audit log of all coin & XP rewards.
    """
    user_id: Annotated[PydanticObjectId, Indexed()]
    amount_coins: int = Field(default=0)
    amount_xp: int = Field(default=0)
    source: str = Field(..., description="Action trigger: e.g. game_session:reflex-rush")
    reference_id: str | None = Field(
        default=None,
        description="Related entity ID such as session_id"
    )
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))

    class Settings:
        name = "transactions"
        use_state_management = True
        indexes = [
            [("user_id", 1), ("created_at", -1)],
        ]

    def __repr__(self) -> str:
        return f"<Transaction user={self.user_id} coins={self.amount_coins} xp={self.amount_xp}>"
