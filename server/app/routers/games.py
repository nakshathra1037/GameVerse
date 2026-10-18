from fastapi import APIRouter, Depends

from app.models.user import User
from app.schemas.common import APIResponse
from app.schemas.game import (
    GameFinishRequest,
    GameFinishResponse,
    GameStartResponse,
    GenericHistoryResponse,
    LeaderboardResponse,
    RecentHistoryResponse,
    ReflexFinishRequest,
    ReflexFinishResponse,
    ReflexHistoryResponse,
    ReflexStartResponse,
)
from app.services.auth_service import get_current_user
from app.services.game_service import (
    finish_game_session,
    finish_reflex_session,
    get_game_leaderboard,
    get_generic_game_history,
    get_recent_history,
    get_reflex_history,
    start_game_session,
    start_reflex_session,
)

router = APIRouter(prefix="/games", tags=["Mini-Games"])


@router.post(
    "/reflex-rush/start",
    response_model=APIResponse[ReflexStartResponse],
    summary="Start a new Reflex Rush session",
)
async def start_reflex(current_user: User = Depends(get_current_user)):
    """
    Initializes a new 5-round Reflex Rush session.
    Generates 5 random delay intervals and returns the session ID and start timestamp.
    """
    data = await start_reflex_session(current_user)
    return APIResponse(success=True, data=data)


@router.post(
    "/reflex-rush/finish",
    response_model=APIResponse[ReflexFinishResponse],
    summary="Validate and finalize a Reflex Rush session",
)
async def finish_reflex(
    payload: ReflexFinishRequest,
    current_user: User = Depends(get_current_user),
):
    """
    Validates the submitted 5 round reaction times against anti-cheat rules:
    - Rejects reaction times < 100 ms.
    - Rejects timing where elapsed server time is less than expected round delays.
    - Computes average score (lower is better), XP, coins, and updates personal records.
    """
    data = await finish_reflex_session(current_user, payload)
    return APIResponse(success=True, data=data)


@router.get(
    "/reflex-rush/history",
    response_model=APIResponse[ReflexHistoryResponse],
    summary="Get user's Reflex Rush session history",
)
async def get_history(current_user: User = Depends(get_current_user)):
    """
    Retrieves the authenticated player's last 10 completed Reflex Rush sessions
    along with their all-time personal best reaction score.
    """
    data = await get_reflex_history(current_user)
    return APIResponse(success=True, data=data)


@router.get(
    "/recent-history",
    response_model=APIResponse[RecentHistoryResponse],
    summary="Get user's recent sessions across all mini-games",
)
async def get_all_recent_history(current_user: User = Depends(get_current_user)):
    """
    Returns the player's last 10 completed sessions across all 5 mini-games,
    along with their current personal bests for each game.
    """
    data = await get_recent_history(current_user)
    return APIResponse(success=True, data=data)


@router.post(
    "/{game_slug}/start",
    response_model=APIResponse[GameStartResponse],
    summary="Start a new game session",
)
async def start_game(
    game_slug: str,
    current_user: User = Depends(get_current_user),
):
    """
    Initializes a new session for the specified mini-game.
    """
    data = await start_game_session(current_user, game_slug)
    return APIResponse(success=True, data=data)


@router.post(
    "/{game_slug}/finish",
    response_model=APIResponse[GameFinishResponse],
    summary="Submit and finalize a game session score",
)
async def finish_game(
    game_slug: str,
    payload: GameFinishRequest,
    current_user: User = Depends(get_current_user),
):
    """
    Finalizes the session, computes XP and coins, and updates personal records.
    """
    data = await finish_game_session(current_user, game_slug, payload)
    return APIResponse(success=True, data=data)


@router.get(
    "/{game_slug}/history",
    response_model=APIResponse[GenericHistoryResponse],
    summary="Get user's session history for a specific game",
)
async def get_game_history(
    game_slug: str,
    current_user: User = Depends(get_current_user),
):
    """
    Retrieves the authenticated player's last 10 completed sessions and personal best for the specified game.
    """
    data = await get_generic_game_history(current_user, game_slug)
    return APIResponse(success=True, data=data)


@router.get(
    "/{game_slug}/leaderboard",
    response_model=APIResponse[LeaderboardResponse],
    summary="Get top leaderboard entries for a specific game",
)
async def get_leaderboard(game_slug: str):
    """
    Returns the leaderboard of top personal records for the specified game.
    """
    data = await get_game_leaderboard(game_slug)
    return APIResponse(success=True, data=data)


