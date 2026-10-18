"""
Centralized Game Rules, Scoring Formulas, and Anti-Cheat Thresholds for GameVerse.
Kept in one centralized configuration file as per project requirements.
"""
import math

# Anti-cheat thresholds
MIN_HUMAN_REACTION_MS = 100  # Physical human physiological limit
TIMING_TOLERANCE_SECONDS = 0.5  # Network/transmission latency allowance

# Base XP per game
BASE_XP = {
    "reflex-rush": 50,
    "memory-vault": 60,
    "brain-battle": 70,
    "code-breaker": 80,
    "aim-challenge": 75,
}

# Difficulty presets for Memory Vault
MEMORY_DIFFICULTIES = {
    "easy": {"rows": 3, "cols": 4, "pairs": 6, "peek_allowed": 1, "bonus_xp": 10},
    "medium": {"rows": 4, "cols": 4, "pairs": 8, "peek_allowed": 1, "bonus_xp": 25},
    "hard": {"rows": 4, "cols": 6, "pairs": 12, "peek_allowed": 1, "bonus_xp": 45},
}

# Brain Battle Game Settings
BRAIN_ROUND_DURATION_SECONDS = 60
BRAIN_INITIAL_LIVES = 3
BRAIN_QUESTION_TIME_LIMITS = {
    "easy": 20,
    "medium": 15,
    "hard": 12,
}

# Code Breaker Settings
CODE_BREAKER_MAX_GUESSES = 8
CODE_BREAKER_CODE_LENGTH = 4
CODE_BREAKER_HINT_COIN_COST = 10

# Aim Challenge Settings
AIM_CHALLENGE_DURATION_SECONDS = 30
AIM_MAX_CLICKS_PER_SECOND = 15  # Anti-cheat rate limit


def calculate_reflex_xp(avg_ms: int) -> int:
    """
    Computes total XP for a Reflex Rush session based on reaction speed tiers:
    XP = base_xp + performance_bonus
    """
    base = BASE_XP["reflex-rush"]
    if avg_ms < 200:
        performance_bonus = 50
    elif avg_ms < 250:
        performance_bonus = 35
    elif avg_ms < 300:
        performance_bonus = 20
    elif avg_ms < 400:
        performance_bonus = 10
    else:
        performance_bonus = 5
    return base + performance_bonus


def calculate_memory_xp(score: int, difficulty: str) -> int:
    """
    Calculates XP for Memory Vault based on performance score and difficulty.
    """
    base = BASE_XP["memory-vault"]
    diff_bonus = MEMORY_DIFFICULTIES.get(difficulty, {}).get("bonus_xp", 10)
    score_bonus = min(60, math.floor(score / 50))
    return base + diff_bonus + score_bonus


def calculate_brain_xp(score: int, correct_count: int) -> int:
    """
    Calculates XP for Brain Battle based on score and number of correct questions.
    """
    base = BASE_XP["brain-battle"]
    correct_bonus = correct_count * 5
    score_bonus = min(50, math.floor(score / 100))
    return base + correct_bonus + score_bonus


def calculate_code_breaker_xp(won: bool, guesses_used: int, elapsed_seconds: int) -> int:
    """
    Calculates XP for Code Breaker based on deduction efficiency and victory.
    """
    base = BASE_XP["code-breaker"]
    if not won:
        return max(15, base // 3)
    efficiency_bonus = max(10, (CODE_BREAKER_MAX_GUESSES - guesses_used) * 12)
    speed_bonus = 20 if elapsed_seconds < 60 else (10 if elapsed_seconds < 120 else 0)
    return base + efficiency_bonus + speed_bonus


def calculate_aim_xp(score: int, accuracy_pct: float) -> int:
    """
    Calculates XP for Aim Challenge based on points and accuracy.
    """
    base = BASE_XP["aim-challenge"]
    score_bonus = min(50, math.floor(score / 40))
    accuracy_bonus = math.floor(accuracy_pct / 5)
    return base + score_bonus + accuracy_bonus


def calculate_coins(xp: int) -> int:
    """
    Formula: Coins = floor(XP / 10)
    Guarantees at least 1 coin for completing a legitimate session.
    """
    return max(1, math.floor(xp / 10))


def calculate_level_from_xp(total_xp: int) -> int:
    """
    Computes player level based on cumulative XP using formula:
    xp_needed(level) = round(100 * (level ** 1.5))
    """
    level = 1
    while True:
        next_level_threshold = round(100 * (level ** 1.5))
        if total_xp >= next_level_threshold:
            level += 1
        else:
            break
    return level
