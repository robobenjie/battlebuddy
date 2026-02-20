import { describe, it, expect, vi, afterEach } from 'vitest';
import { rollAttacks } from '../lib/dice-utils';

describe('rollAttacks - reroll all handling', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('rerolls only failed hits when rerollHits is "all"', () => {
    const randomValues = [0.99, 0.8, 0.4, 0.99];
    let callIndex = 0;

    vi.spyOn(Math, 'random').mockImplementation(() => {
      const value = randomValues[callIndex] ?? 0;
      callIndex += 1;
      return value;
    });

    const result = rollAttacks(3, 4, { rerollHits: 'all' });
    const rerollCount = result.attackRolls.filter((roll) => roll.isReroll).length;

    expect(rerollCount).toBe(1);
    expect(result.attackRolls[0].isReroll).toBeUndefined();
    expect(result.attackRolls[1].isReroll).toBeUndefined();
    expect(result.attackRolls[2].isReroll).toBe(true);
  });
});
