from datetime import UTC, datetime
from typing import Annotated

from beanie import Document, Indexed, PydanticObjectId
from pydantic import Field


class Score(Document):
    """
    MongoDB Document representing a player's score record for a mini-game.
    Indexed for fast leaderboard aggregation and personal best lookups.
    """
    user_id: Annotated[PydanticObjectId, Indexed()]
    game_id: Annotated[str, Indexed()]
    score: Annotated[int, Indexed()]
    is_personal_best: bool = Field(default=False)
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))

    class Settings:
        name = "scores"
        use_state_management = True
        indexes = [
            [("game_id", 1), ("score", 1)],
            [("user_id", 1), ("game_id", 1), ("score", 1)],
            [("user_id", 1), ("game_id", 1), ("is_personal_best", 1)],
        ]

    def __repr__(self) -> str:
        return f"<Score user={self.user_id} game={self.game_id} score={self.score}>"