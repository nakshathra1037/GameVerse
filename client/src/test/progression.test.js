import { describe, it, expect } from 'vitest';
import { getLevelProgress, formatNumber, formatDate } from '../utils/formatters';
import { AVATAR_OPTIONS, AVATAR_MAP, STORAGE_KEYS } from '../utils/constants';

describe('GameVerse Progression & Formulas', () => {
  it('calculates level threshold using xp_needed(level) = 100 * level^1.5 (rounded)', () => {
    // Level 1: 100 * 1^1.5 = 100
    // Level 2: 100 * 2^1.5 = 100 * 2.8284 = 283
    // Level 3: 100 * 3^1.5 = 100 * 5.196 = 520
    const lvl1Progress = getLevelProgress(50, 1);
    expect(lvl1Progress.currentLevelXpRequired).toBe(100);
    expect(lvl1Progress.prevLevelXpRequired).toBe(0);
    expect(lvl1Progress.percentage).toBe(50);

    const lvl2Progress = getLevelProgress(150, 2);
    expect(lvl2Progress.currentLevelXpRequired).toBe(283);
    expect(lvl2Progress.prevLevelXpRequired).toBe(100);
  });

  it('formats numbers with thousand separators correctly', () => {
    expect(formatNumber(1000)).toBe('1,000');
    expect(formatNumber(50)).toBe('50');
    expect(formatNumber(0)).toBe('0');
    expect(formatNumber(null)).toBe('0');
  });

  it('formats dates consistently', () => {
    const formatted = formatDate('2026-10-11T12:00:00Z');
    expect(formatted).toContain('2026');
  });
});

describe('GameVerse Presets & Constants', () => {
  it('provides 6 distinct avatar options with valid colors and icons', () => {
    expect(AVATAR_OPTIONS.length).toBe(6);
    expect(AVATAR_MAP['cyber-ninja']).toBeDefined();
    expect(AVATAR_MAP['cyber-ninja'].icon).toBe('🥷');
  });

  it('defines persistent storage keys for access token and refresh token', () => {
    expect(STORAGE_KEYS.ACCESS_TOKEN).toBe('gv_access_token');
    expect(STORAGE_KEYS.REFRESH_TOKEN).toBe('gv_refresh_token');
    expect(STORAGE_KEYS.USER).toBe('gv_user');
  });
});
