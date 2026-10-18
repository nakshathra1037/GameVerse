from datetime import datetime

from pydantic import BaseModel, Field


class ReflexStartResponse(BaseModel):
    """Payload returned upon initializing a Reflex Rush session."""
    session_id: str = Field(..., description="Unique server session tracking identifier")
    delays: list[float] = Field(
        ...,
        description="List of 5 server-generated delay durations in seconds (1.0 - 4.0s)",
        examples=[[1.85, 2.40, 3.10, 1.25, 2.90]]
    )
    start_time: datetime = Field(..., description="Server UTC start timestamp")


class ReflexFinishRequest(BaseModel):
    """Payload submitted by the client upon finishing 5 rounds of Reflex Rush."""
    session_id: str = Field(..., description="Session identifier obtained from /start")
    reaction_times: list[int] = Field(
        ...,
        min_length=5,
        max_length=5,
        description="Reaction times in milliseconds for each of the 5 rounds",
        examples=[[245, 210, 230, 260, 220]]
    )


class ReflexFinishResponse(BaseModel):
    """Result data returned upon successful session validation and score computation."""
    session_id: str
    reaction_times: list[int]
    score: int = Field(..., description="Average reaction time in milliseconds (lower is better)")
    is_new_best: bool = Field(..., description="True if this session set a new personal record")
    personal_best: int = Field(..., description="Current lowest average reaction time")
    xp_earned: int = Field(..., description="Experience Points calculated and awarded")
    coins_earned: int = Field(..., description="Coins awarded based on XP")
    level: int = Field(..., description="Current player level after applying XP")
    total_xp: int = Field(..., description="Player's cumulative XP balance")
    total_coins: int = Field(..., description="Player's updated coin balance")


class GameHistoryItem(BaseModel):
    """Summary of a past completed session."""
    session_id: str
    score: int
    reaction_times: list[int]
    xp_earned: int
    coins_earned: int
    created_at: datetime


class ReflexHistoryResponse(BaseModel):
    """Recent session history and personal record for Reflex Rush."""
    game_id: str = "reflex-rush"
    personal_best: int | None = None
    total_played: int = 0
    sessions: list[GameHistoryItem]


class RecentSessionItem(BaseModel):
    """Summary of a past completed session across any game."""
    session_id: str
    game_id: str
    score: int
    xp_earned: int
    coins_earned: int
    details: dict | None = None
    created_at: datetime


class RecentHistoryResponse(BaseModel):
    """Player's recent session history and personal bests across all games."""
    sessions: list[RecentSessionItem]
    personal_bests: dict[str, int | None]


class GameStartResponse(BaseModel):
    """Response returned upon starting a session for any game."""
    session_id: str
    game_id: str
    start_time: datetime
    delays: list[float] | None = None
    is_daily_available: bool | None = None


class GameFinishRequest(BaseModel):
    """Generic payload submitted when finishing a game round."""
    session_id: str
    score: int
    duration_ms: int | None = None
    meta: dict | None = None
    reaction_times: list[int] | None = None


class GameFinishResponse(BaseModel):
    """Result data returned upon finalizing any game session."""
    session_id: str
    game_id: str
    score: int
    is_new_best: bool
    personal_best: int | None = None
    xp_earned: int
    coins_earned: int
    level: int
    total_xp: int
    total_coins: int
    is_practice: bool = False


class GenericHistoryResponse(BaseModel):
    """Recent session history and personal record for any game."""
    game_id: str
    personal_best: int | None = None
    total_played: int = 0
    sessions: list[RecentSessionItem]


class LeaderboardEntry(BaseModel):
    """Ranked leaderboard entry for a player."""
    rank: int
    user_id: str
    username: str
    avatar: str | None = None
    score: int
    level: int
    created_at: datetime


class LeaderboardResponse(BaseModel):
    """Leaderboard response for a specific game."""
    game_id: str
    entries: list[LeaderboardEntry]



