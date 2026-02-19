import { describe, it, expect } from 'vitest';
import { buildCombatSessionResultsPayload } from '../lib/combat-session-payload';

describe('buildCombatSessionResultsPayload', () => {
  it('includes rollDisplay in results payload for session replay parity', () => {
    const payload = buildCombatSessionResultsPayload({
      combatResult: {} as any,
      targetStats: { T: 4, SV: 3, modelCount: 5, categories: [] },
      effectiveTargetStats: { T: 3, SV: 4, modelCount: 5, categories: [] },
      selectedTargetId: 'target-1',
      selectedWeaponId: 'weapon-1',
      rollDisplay: {
        hitModifier: -1,
        woundModifier: 1,
        addedKeywords: ['Lethal Hits']
      }
    });

    expect(payload.rollDisplay).toEqual({
      hitModifier: -1,
      woundModifier: 1,
      addedKeywords: ['Lethal Hits']
    });
  });
});
