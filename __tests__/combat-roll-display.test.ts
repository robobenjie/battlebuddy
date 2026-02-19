import { describe, it, expect } from 'vitest';
import { buildRollDisplayPayload } from '../lib/combat-roll-display';

describe('buildRollDisplayPayload', () => {
  it('uses freshly computed modifier sources for the roll payload', () => {
    const freshSources = {
      hit: ['new-hit-rule'],
      wound: ['new-wound-rule'],
      rerollHit: ['new-reroll-rule']
    };

    const payload = buildRollDisplayPayload({
      hitModifier: -1,
      woundModifier: 1,
      addedKeywords: ['Lethal Hits'],
      computedModifierSources: freshSources,
      appliedRules: [
        {
          id: 'rule-1',
          name: 'Rule 1',
          kind: 'passive',
          description: '',
          faction: 'Test',
          scope: 'unit',
          trigger: { t: 'automatic', phase: 'any', turn: 'both', limit: 'none' },
          when: { t: 'true' },
          then: [{ t: 'do', fx: [] }]
        } as any
      ],
      hitThresholdOverride: 4,
      woundThresholdOverride: 3,
    });

    expect(payload.modifierSources).toEqual(freshSources);
  });
});
