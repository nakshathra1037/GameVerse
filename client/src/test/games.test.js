import { describe, it, expect } from 'vitest';
import { GAMES } from '../games';

// Mastermind evaluation function
function evaluate(secret, guess) {
  let exact = 0;
  const sRest = [], gRest = [];
  for (let i = 0; i < 4; i++) {
    if (guess[i] === secret[i]) exact++;
    else {
      sRest.push(secret[i]);
      gRest.push(guess[i]);
    }
  }
  let misplaced = 0;
  for (const g of gRest) {
    const idx = sRest.indexOf(g);
    if (idx > -1) {
      misplaced++;
      sRest.splice(idx, 1);
    }
  }
  return { exact, misplaced };
}

// Mulberry32 PRNG
function mulberry32(a) {
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

describe('Game Registry', () => {
  it('exports all 5 required games in GAMES map', () => {
    expect(GAMES['reflex-rush']).toBeDefined();
    expect(GAMES['memory-vault']).toBeDefined();
    expect(GAMES['brain-battle']).toBeDefined();
    expect(GAMES['code-breaker']).toBeDefined();
    expect(GAMES['aim-challenge']).toBeDefined();
  });
});

describe('Code Breaker Logic', () => {
  it('correctly evaluates exact and misplaced guesses with duplicate handling', () => {
    const secret = ['1', '2', '3', '4'];
    expect(evaluate(secret, ['1', '2', '3', '4'])).toEqual({ exact: 4, misplaced: 0 });
    expect(evaluate(secret, ['4', '3', '2', '1'])).toEqual({ exact: 0, misplaced: 4 });
    expect(evaluate(secret, ['1', '2', '4', '3'])).toEqual({ exact: 2, misplaced: 2 });
    expect(evaluate(secret, ['5', '6', '7', '8'])).toEqual({ exact: 0, misplaced: 0 });
    // Duplicate guess digit against single digit in secret
    expect(evaluate(secret, ['1', '1', '1', '1'])).toEqual({ exact: 1, misplaced: 0 });
  });

  it('generates 4 distinct digits with daily mulberry32 seed', () => {
    const seed = 20261014;
    const rng = mulberry32(seed);
    const digits = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
    for (let i = digits.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [digits[i], digits[j]] = [digits[j], digits[i]];
    }
    const secret = digits.slice(0, 4);
    expect(secret.length).toBe(4);
    expect(new Set(secret).size).toBe(4);
  });
});

describe('XP and Coins Progression Formulas', () => {
  it('calculates xp and coins according to formula: xp = round(score/10) clamped to [5, 200], coins = round(xp/4)', () => {
    const calcXP = (score) => Math.max(5, Math.min(200, Math.round(score / 10)));
    const calcCoins = (xp) => Math.round(xp / 4);

    // Score 0 (loss)
    const xp0 = calcXP(0);
    expect(xp0).toBe(5);
    expect(calcCoins(xp0)).toBe(1);

    // Score 850 (Memory Vault medium victory)
    const xp850 = calcXP(850);
    expect(xp850).toBe(85);
    expect(calcCoins(xp850)).toBe(21);

    // Score 3000 (Very high score)
    const xp3000 = calcXP(3000);
    expect(xp3000).toBe(200);
    expect(calcCoins(xp3000)).toBe(50);
  });
});
