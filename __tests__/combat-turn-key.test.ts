import { describe, it, expect } from 'vitest';
import { resolveCurrentTurnKey } from '../lib/combat-turn-key';

describe('resolveCurrentTurnKey', () => {
  it('falls back to resolved current player id when propCurrentPlayer is not provided', () => {
    const key = resolveCurrentTurnKey(2, undefined, 'player-from-game');
    expect(key).toBe('2-player-from-game');
  });
});
