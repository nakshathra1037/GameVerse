import random
from datetime import UTC, datetime

from beanie import PydanticObjectId
from fastapi import HTTPException, status

from app.core.game_rules import (
    MIN_HUMAN_REACTION_MS,
    TIMING_TOLERANCE_SECONDS,
    calculate_coins,
    calculate_level_from_xp,
    calculate_reflex_xp,
)
from app.models.game_session import GameSession
from app.models.score import Score
from app.models.transaction import Transaction
from app.models.user import User
from app.schemas.game import (
    GameFinishRequest,
    GameFinishResponse,
    GameHistoryItem,
    GameStartResponse,
    GenericHistoryResponse,
    LeaderboardEntry,
    LeaderboardResponse,
    RecentHistoryResponse,
    RecentSessionItem,
    ReflexFinishRequest,
    ReflexFinishResponse,
    ReflexHistoryResponse,
    ReflexStartResponse,
)


async def start_reflex_session(user: User) -> ReflexStartResponse:
    """
    Initializes a new Reflex Rush session:
    - Generates 5 random delay intervals between 1.0s and 4.0s.
    - Records server start timestamp for anti-cheat verification.
    """
    delays = [round(random.uniform(1.0, 4.0), 2) for _ in range(5)]
    now = datetime.now(UTC)

    session = GameSession(
        user_id=user.id,
        game_id="reflex-rush",
        delays=delays,
        status="IN_PROGRESS",
        start_time=now,
        created_at=now,
    )
    await session.insert()

    return ReflexStartResponse(
        session_id=str(session.id),
        delays=delays,
        start_time=session.start_time,
    )


async def finish_reflex_session(user: User, data: ReflexFinishRequest) -> ReflexFinishResponse:
    """
    Validates a submitted Reflex Rush session against anti-cheat rules:
    1. Session existence, ownership, and active state.
    2. Physiological lower threshold (reaction time >= 100 ms).
    3. Elapsed server time matching cumulative delays and round durations.
    4. Computes score, XP, coins, and updates personal records.
    """
    # 1. Parse session ID
    try:
        session_obj_id = PydanticObjectId(data.session_id)
    except (ValueError, TypeError):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid session identifier format."
        ) from None

    # 2. Retrieve session
    session = await GameSession.get(session_obj_id)
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Game session not found."
        )

    # 3. Verify ownership
    if session.user_id != user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to finalize this session."
        )

    # 4. Check status
    if session.status != "IN_PROGRESS":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Session is already {session.status.lower()}."
        )

    # 5. Check reaction times count
    if len(data.reaction_times) != 5:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Submission must include exactly 5 round reaction times."
        )

    now = datetime.now(UTC)

    # 6. Anti-cheat check 1: Physiological minimum (100 ms)
    for idx, rt in enumerate(data.reaction_times):
        if rt < MIN_HUMAN_REACTION_MS:
            session.status = "INVALIDATED"
            session.end_time = now
            await session.save()
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=(
                    f"Impossible reaction time detected in round {idx + 1} ({rt} ms). "
                    f"Human physiological minimum is {MIN_HUMAN_REACTION_MS} ms."
                )
            )

    # 7. Anti-cheat check 2: Total elapsed time matching server timestamps
    session_start = session.start_time
    if session_start.tzinfo is None:
        session_start = session_start.replace(tzinfo=UTC)

    actual_elapsed_seconds = (now - session_start).total_seconds()
    reaction_sum_seconds = sum(data.reaction_times) / 1000.0
    min_expected_seconds = sum(session.delays) + reaction_sum_seconds - TIMING_TOLERANCE_SECONDS

    if actual_elapsed_seconds < min_expected_seconds:
        session.status = "INVALIDATED"
        session.end_time = now
        await session.save()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "Elapsed session duration does not match round delays and reaction times. "
                f"Required at least {min_expected_seconds:.2f}s, "
                f"but only {actual_elapsed_seconds:.2f}s elapsed."
            )
        )

    # 8. Score calculation: Average reaction time in ms (lower is better)
    score = round(sum(data.reaction_times) / 5)

    # 9. Server calculates XP and Coins
    xp_earned = calculate_reflex_xp(score)
    coins_earned = calculate_coins(xp_earned)

    # 10. Update user balances and level
    user.xp += xp_earned
    user.coins += coins_earned
    user.level = calculate_level_from_xp(user.xp)
    user.updated_at = now
    await user.save()

    # 11. Record transaction audit log
    tx = Transaction(
        user_id=user.id,
        amount_coins=coins_earned,
        amount_xp=xp_earned,
        source="game:reflex-rush",
        reference_id=str(session.id),
        created_at=now,
    )
    await tx.insert()

    # 12. Check and record Personal Best
    existing_best = await Score.find(
        {"user_id": user.id, "game_id": "reflex-rush"}
    ).sort("+score").first_or_none()

    is_new_best = False
    if existing_best is None or score < existing_best.score:
        is_new_best = True
        personal_best = score
        # Demote previous best markers
        await Score.find(
            {"user_id": user.id, "game_id": "reflex-rush", "is_personal_best": True}
        ).set({"is_personal_best": False})
    else:
        personal_best = existing_best.score

    new_score = Score(
        user_id=user.id,
        game_id="reflex-rush",
        score=score,
        is_personal_best=is_new_best,
        created_at=now,
    )
    await new_score.insert()

    # 13. Complete session
    session.reaction_times = data.reaction_times
    session.score = score
    session.xp_earned = xp_earned
    session.coins_earned = coins_earned
    session.status = "COMPLETED"
    session.end_time = now
    await session.save()

    return ReflexFinishResponse(
        session_id=str(session.id),
        reaction_times=data.reaction_times,
        score=score,
        is_new_best=is_new_best,
        personal_best=personal_best,
        xp_earned=xp_earned,
        coins_earned=coins_earned,
        level=user.level,
        total_xp=user.xp,
        total_coins=user.coins,
    )


async def get_reflex_history(user: User) -> ReflexHistoryResponse:
    """
    Fetches the user's last 10 completed Reflex Rush sessions and personal best.
    """
    recent_sessions = await GameSession.find(
        {"user_id": user.id, "game_id": "reflex-rush", "status": "COMPLETED"}
    ).sort("-created_at").limit(10).to_list()

    best_score_doc = await Score.find(
        {"user_id": user.id, "game_id": "reflex-rush"}
    ).sort("+score").first_or_none()

    total_played = await GameSession.find(
        {"user_id": user.id, "game_id": "reflex-rush", "status": "COMPLETED"}
    ).count()

    history_items = [
        GameHistoryItem(
            session_id=str(s.id),
            score=s.score or 0,
            reaction_times=s.reaction_times or [],
            xp_earned=s.xp_earned or 0,
            coins_earned=s.coins_earned or 0,
            created_at=s.created_at,
        )
        for s in recent_sessions
    ]

    return ReflexHistoryResponse(
        game_id="reflex-rush",
        personal_best=best_score_doc.score if best_score_doc else None,
        total_played=total_played,
        sessions=history_items,
    )


async def get_recent_history(user: User) -> RecentHistoryResponse:
    """
    Fetches the user's last 10 completed sessions across all mini-games
    and personal best scores for each game.
    """
    recent_sessions = await GameSession.find(
        {"user_id": user.id, "status": "COMPLETED"}
    ).sort("-created_at").limit(10).to_list()

    games = ["reflex-rush", "memory-vault", "brain-battle", "code-breaker", "aim-challenge"]
    personal_bests: dict[str, int | None] = {}

    for gid in games:
        # Reflex rush: lower is better (+score), other games: higher is better (-score)
        sort_order = "+score" if gid == "reflex-rush" else "-score"
        best_doc = await Score.find(
            {"user_id": user.id, "game_id": gid}
        ).sort(sort_order).first_or_none()
        personal_bests[gid] = best_doc.score if best_doc else None

    items = [
        RecentSessionItem(
            session_id=str(s.id),
            game_id=s.game_id,
            score=s.score or 0,
            xp_earned=s.xp_earned or 0,
            coins_earned=s.coins_earned or 0,
            details=s.details,
            created_at=s.created_at,
        )
        for s in recent_sessions
    ]

    return RecentHistoryResponse(sessions=items, personal_bests=personal_bests)


VALID_GAMES = ["reflex-rush", "memory-vault", "brain-battle", "code-breaker", "aim-challenge"]


async def start_game_session(user: User, game_slug: str) -> GameStartResponse:
    """
    Initializes a new gameplay session for any registered mini-game.
    Checks daily availability for Code Breaker.
    """
    if game_slug not in VALID_GAMES:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Game '{game_slug}' is not recognized in the GameVerse arena."
        )

    now = datetime.now(UTC)
    delays = None
    if game_slug == "reflex-rush":
        delays = [round(random.uniform(1.0, 4.0), 2) for _ in range(5)]

    is_daily_available = None
    if game_slug == "code-breaker":
        today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
        has_played_today = await GameSession.find({
            "user_id": user.id,
            "game_id": "code-breaker",
            "status": "COMPLETED",
            "created_at": {"$gte": today_start},
            "details.is_practice": {"$ne": True}
        }).count() > 0
        is_daily_available = not has_played_today

    session = GameSession(
        user_id=user.id,
        game_id=game_slug,
        delays=delays,
        status="IN_PROGRESS",
        start_time=now,
        created_at=now,
    )
    await session.insert()

    return GameStartResponse(
        session_id=str(session.id),
        game_id=game_slug,
        start_time=session.start_time,
        delays=delays,
        is_daily_available=is_daily_available,
    )


async def finish_game_session(user: User, game_slug: str, data: GameFinishRequest) -> GameFinishResponse:
    """
    Finalizes any mini-game session:
    - Validates session ownership and IN_PROGRESS status.
    - Handles Code Breaker daily scored vs practice plays.
    - Computes XP and coins using: xp = round(score / 10) clamped to [5, 200], coins = round(xp / 4).
    - Updates higher-is-better personal records (or lower-is-better for Reflex Rush).
    - Updates user XP, Coins, Level and creates audit transaction.
    """
    if game_slug not in VALID_GAMES:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Game '{game_slug}' is not recognized."
        )

    # 1. Parse session ID
    try:
        session_obj_id = PydanticObjectId(data.session_id)
    except (ValueError, TypeError):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid session identifier format."
        ) from None

    # 2. Retrieve session
    session = await GameSession.get(session_obj_id)
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Game session not found."
        )

    # 3. Verify ownership & game
    if session.user_id != user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to finalize this session."
        )

    if session.game_id != game_slug:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Session belongs to '{session.game_id}', not '{game_slug}'."
        )

    if session.status != "IN_PROGRESS":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Session is already {session.status.lower()}."
        )

    now = datetime.now(UTC)

    # 4. Check daily practice condition for Code Breaker
    is_practice = False
    if game_slug == "code-breaker":
        today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
        existing_daily = await GameSession.find({
            "user_id": user.id,
            "game_id": "code-breaker",
            "status": "COMPLETED",
            "created_at": {"$gte": today_start},
            "details.is_practice": {"$ne": True}
        }).first_or_none()
        if existing_daily is not None:
            is_practice = True

    # 5. Calculate XP and Coins
    # Formula: xp = round(score / 10) clamped to [5, 200], coins = round(xp / 4)
    if is_practice:
        xp_earned = 0
        coins_earned = 0
    else:
        raw_xp = round(data.score / 10)
        xp_earned = max(5, min(200, raw_xp))
        coins_earned = round(xp_earned / 4)

        user.xp += xp_earned
        user.coins += coins_earned
        user.level = calculate_level_from_xp(user.xp)
        user.updated_at = now
        await user.save()

        # Audit transaction
        tx = Transaction(
            user_id=user.id,
            amount_coins=coins_earned,
            amount_xp=xp_earned,
            source=f"game:{game_slug}",
            reference_id=str(session.id),
            created_at=now,
        )
        await tx.insert()

    # 6. Personal Best calculation
    # Reflex Rush is lower-is-better (+score), all 4 new games are higher-is-better (-score)
    sort_order = "+score" if game_slug == "reflex-rush" else "-score"
    existing_best = await Score.find(
        {"user_id": user.id, "game_id": game_slug}
    ).sort(sort_order).first_or_none()

    is_new_best = False
    if not is_practice:
        if existing_best is None:
            is_new_best = True
            personal_best = data.score
        elif game_slug == "reflex-rush" and data.score < existing_best.score:
            is_new_best = True
            personal_best = data.score
        elif game_slug != "reflex-rush" and data.score > existing_best.score:
            is_new_best = True
            personal_best = data.score
        else:
            personal_best = existing_best.score

        if is_new_best:
            await Score.find(
                {"user_id": user.id, "game_id": game_slug, "is_personal_best": True}
            ).set({"is_personal_best": False})

        new_score = Score(
            user_id=user.id,
            game_id=game_slug,
            score=data.score,
            is_personal_best=is_new_best,
            created_at=now,
        )
        await new_score.insert()
    else:
        is_new_best = False
        personal_best = existing_best.score if existing_best else None

    # 7. Update Session
    meta_dict = data.meta or {}
    meta_dict["is_practice"] = is_practice
    session.score = data.score
    session.xp_earned = xp_earned
    session.coins_earned = coins_earned
    session.details = meta_dict
    session.status = "COMPLETED"
    session.end_time = now
    await session.save()

    return GameFinishResponse(
        session_id=str(session.id),
        game_id=game_slug,
        score=data.score,
        is_new_best=is_new_best,
        personal_best=personal_best,
        xp_earned=xp_earned,
        coins_earned=coins_earned,
        level=user.level,
        total_xp=user.xp,
        total_coins=user.coins,
        is_practice=is_practice,
    )


async def get_generic_game_history(user: User, game_slug: str) -> GenericHistoryResponse:
    """
    Fetches the user's last 10 completed sessions and personal best for any game.
    """
    sort_order = "+score" if game_slug == "reflex-rush" else "-score"

    recent_sessions = await GameSession.find(
        {"user_id": user.id, "game_id": game_slug, "status": "COMPLETED"}
    ).sort("-created_at").limit(10).to_list()

    best_score_doc = await Score.find(
        {"user_id": user.id, "game_id": game_slug}
    ).sort(sort_order).first_or_none()

    total_played = await GameSession.find(
        {"user_id": user.id, "game_id": game_slug, "status": "COMPLETED"}
    ).count()

    items = [
        RecentSessionItem(
            session_id=str(s.id),
            game_id=s.game_id,
            score=s.score or 0,
            xp_earned=s.xp_earned or 0,
            coins_earned=s.coins_earned or 0,
            details=s.details,
            created_at=s.created_at,
        )
        for s in recent_sessions
    ]

    return GenericHistoryResponse(
        game_id=game_slug,
        personal_best=best_score_doc.score if best_score_doc else None,
        total_played=total_played,
        sessions=items,
    )


async def get_game_leaderboard(game_slug: str, limit: int = 20) -> LeaderboardResponse:
    """
    Fetches top personal records for the specified game.
    """
    sort_order = "+score" if game_slug == "reflex-rush" else "-score"

    best_scores = await Score.find(
        {"game_id": game_slug, "is_personal_best": True}
    ).sort(sort_order).limit(limit).to_list()

    user_ids = [s.user_id for s in best_scores]
    users = await User.find({"_id": {"$in": user_ids}}).to_list()
    user_map = {u.id: u for u in users}

    entries = []
    for rank, s in enumerate(best_scores, start=1):
        player = user_map.get(s.user_id)
        entries.append(
            LeaderboardEntry(
                rank=rank,
                user_id=str(s.user_id),
                username=player.username if player else "Unknown Player",
                avatar=player.avatar if player else None,
                score=s.score,
                level=player.level if player else 1,
                created_at=s.created_at,
            )
        )

    return LeaderboardResponse(game_id=game_slug, entries=entries)


