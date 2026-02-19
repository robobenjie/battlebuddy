import { describe, it, expect, vi, afterEach } from 'vitest';
import { rollWounds } from '../lib/dice-utils';

describe('rollWounds - reroll all handling', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('rerolls only failed wounds when rerollWounds is "all"', () => {
    const randomValues = [0.99, 0.8, 0.4, 0.99];
    let callIndex = 0;

    vi.spyOn(Math, 'random').mockImplementation(() => {
      const value = randomValues[callIndex] ?? 0;
      callIndex += 1;
      return value;
    });

    const result = rollWounds(3, [], 4, { rerollWounds: 'all' });
    const rerollCount = result.woundRolls.filter((roll) => roll.isReroll).length;

    expect(rerollCount).toBe(1);
    expect(result.woundRolls[0].isReroll).toBeUndefined();
    expect(result.woundRolls[1].isReroll).toBeUndefined();
    expect(result.woundRolls[2].isReroll).toBe(true);
  });
});
