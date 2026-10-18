/**
 * Formatters and helper functions for numbers, dates, and scores.
 */

export const formatNumber = (num) => {
  if (num === null || num === undefined) return '0';
  return Number(num).toLocaleString();
};

export const formatDate = (dateString) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

/**
 * Calculates XP progress towards the next level using the required formula:
 * xp_needed(level) = Math.round(100 * Math.pow(level, 1.5))
 */
export const getLevelProgress = (xp, level) => {
  const currentLevelXpRequired = Math.round(100 * Math.pow(level, 1.5));
  const prevLevelXpRequired = level > 1 ? Math.round(100 * Math.pow(level - 1, 1.5)) : 0;
  const levelBracket = currentLevelXpRequired - prevLevelXpRequired;
  const earnedInLevel = Math.max(0, xp - prevLevelXpRequired);
  const percentage = Math.min(100, Math.round((earnedInLevel / (levelBracket || 100)) * 100));

  return {
    currentLevelXpRequired,
    prevLevelXpRequired,
    earnedInLevel,
    percentage,
  };
};
