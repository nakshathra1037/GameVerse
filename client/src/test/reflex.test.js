import { describe, it, expect } from 'vitest';

describe('Reflex Rush Scoring & Logic', () => {
  it('calculates average score in milliseconds across 5 rounds', () => {
    const reactionTimes = [210, 230, 225, 240, 205];
    const avgScore = Math.round(
      reactionTimes.reduce((acc, t) => acc + t, 0) / reactionTimes.length
    );
    expect(avgScore).toBe(222);
  });

  it('correctly determines if a new score beats personal best (lower is better)', () => {
    const currentBest = 240;
    const newScoreBeats = 215;
    const newScoreLoses = 255;

    const isRecord1 = currentBest === null || newScoreBeats < currentBest;
    const isRecord2 = currentBest === null || newScoreLoses < currentBest;

    expect(isRecord1).toBe(true);
    expect(isRecord2).toBe(false);
  });

  it('validates human physiological limit >= 100ms', () => {
    const validTimes = [150, 200, 220, 180, 190];
    const impossibleTimes = [150, 80, 220, 180, 190]; // 80ms is impossible

    const isValid = (times) => times.every((t) => t >= 100);

    expect(isValid(validTimes)).toBe(true);
    expect(isValid(impossibleTimes)).toBe(false);
  });

  it('requires exactly 5 rounds before completing game', () => {
    const partialTimes = [210, 220, 230];
    const fullTimes = [210, 220, 230, 240, 250];

    expect(partialTimes.length === 5).toBe(false);
    expect(fullTimes.length === 5).toBe(true);
  });
});
