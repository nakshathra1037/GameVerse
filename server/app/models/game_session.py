from datetime import UTC, datetime
from typing import Annotated

from beanie import Document, Indexed, PydanticObjectId
from pydantic import Field


class GameSession(Document):
    """
    MongoDB Document representing an individual game play session.
    Used for anti-cheat verification, session timing, and historical auditing.
    """
    user_id: Annotated[PydanticObjectId, Indexed()]
    game_id: Annotated[str, Indexed()]
    delays: list[float] | None = Field(default=None, description="Server-generated round delays in seconds (Reflex Rush)")
    reaction_times: list[int] | None = Field(
        default=None,
        description="Recorded reaction times in ms (Reflex Rush)"
    )
    game_data: dict | None = Field(
        default=None,
        description="Server-side private game data (e.g. secret code, question IDs, grid config)"
    )
    details: dict | None = Field(
        default=None,
        description="Performance metrics (moves, combo, streak, accuracy, hints used, etc.)"
    )
    difficulty: str | None = Field(default=None, description="Game difficulty mode if applicable")
    score: int | None = Field(default=None, description="Final computed session score")
    xp_earned: int | None = Field(default=None, description="XP awarded for session")
    coins_earned: int | None = Field(default=None, description="Coins awarded for session")
    status: str = Field(default="IN_PROGRESS", description="IN_PROGRESS, COMPLETED, or INVALIDATED")
    start_time: datetime = Field(default_factory=lambda: datetime.now(UTC))
    end_time: datetime | None = Field(default=None)
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))

    class Settings:
        name = "game_sessions"
        use_state_management = True
        indexes = [
            [("user_id", 1), ("game_id", 1), ("created_at", -1)],
        ]

    def __repr__(self) -> str:
        return (
            f"<GameSession id={self.id} user={self.user_id} "
            f"game={self.game_id} status={self.status}>"
        )
