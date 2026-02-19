import { describe, it, expect } from 'vitest';
import { calculateCombatModifiers, WeaponStats } from '../lib/combat-calculator-engine';
import { getTestRule } from '../lib/rules-engine/test-rules';

describe('Defender Hit Modifier Merge', () => {
  it('applies defender modHitAgainst to final hit modifier', () => {
    const defenderHitPenaltyRule = getTestRule('defensive-hit-penalty');
    if (!defenderHitPenaltyRule) {
      throw new Error('defensive-hit-penalty rule not found in test-rules.json');
    }

    const weapon: WeaponStats = {
      name: 'Bolt Rifle',
      range: 24,
      A: '2',
      WS: 3,
      S: 4,
      AP: -1,
      D: '1',
      keywords: []
    };

    const result = calculateCombatModifiers({
      attacker: {
        id: 'attacker-1',
        armyId: 'army-a',
        name: 'Attacker Unit',
        categories: ['Infantry']
      },
      defender: {
        id: 'defender-1',
        armyId: 'army-b',
        name: 'Defender Unit',
        categories: ['Infantry'],
        models: [{ T: 4, SV: 3 }]
      },
      weapon,
      game: {
        id: 'game-1',
        currentTurn: 1,
        currentPhase: 'shooting'
      },
      combatPhase: 'shooting',
      options: {
        modelsFiring: 1,
        withinHalfRange: false,
        blastBonusAttacks: 0,
        unitHasCharged: false,
        unitRemainedStationary: false
      },
      attackerRules: [],
      defenderRules: [defenderHitPenaltyRule],
      attackerArmyStates: [],
      defenderArmyStates: []
    });

    expect(result.appliedDefenderRules.map(r => r.id)).toContain('defensive-hit-penalty');
    expect(result.hitModifier).toBe(-1);
  });
});
