import { describe, it, expect } from 'vitest';
import { buildCombatState, WeaponStats, TargetStats } from '../lib/combat-calculator-engine';
import { getTestRule } from '../lib/rules-engine/test-rules';

describe('setToughness effect', () => {
  it('sets effective target Toughness to a fixed value', () => {
    const setToughnessRule = getTestRule('set-toughness-seven');
    if (!setToughnessRule) {
      throw new Error('set-toughness-seven rule not found in test-rules.json');
    }

    const weapon: WeaponStats = {
      name: 'Test Weapon',
      range: 24,
      A: '2',
      WS: 3,
      S: 4,
      AP: 0,
      D: '1',
      keywords: []
    };

    const target: TargetStats = {
      T: 5,
      SV: 3,
      modelCount: 10,
      categories: ['INFANTRY']
    };

    const combatState = buildCombatState({
      attacker: {
        id: 'attacker-1',
        armyId: 'attacker-army',
        name: 'Attacker Unit',
        categories: ['INFANTRY']
      },
      defender: {
        id: 'defender-1',
        armyId: 'defender-army',
        name: 'Defender Unit',
        categories: ['INFANTRY'],
        models: [{ T: 5, SV: 3 }]
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
      attackerRules: [setToughnessRule],
      defenderRules: [],
      attackerArmyStates: [],
      defenderArmyStates: [],
      target
    });

    expect(combatState.effectiveTarget.T).toBe(7);
  });
});
