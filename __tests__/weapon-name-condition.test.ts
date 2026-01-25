import { describe, it, expect } from 'vitest';
import { buildCombatContext } from '../lib/rules-engine/context';
import { evaluateRule } from '../lib/rules-engine/evaluator';
import { getTestRule } from '../lib/rules-engine/test-rules';

function createTestContext(params: any) {
  const optionsOverride = params.options || {};
  const { options, ...rest } = params;
  return buildCombatContext({
    game: {
      id: 'game-1',
      currentTurn: 1,
      currentPhase: 'fight'
    },
    combatPhase: 'melee',
    combatRole: 'attacker',
    options: {
      modelsFiring: 1,
      withinHalfRange: false,
      blastBonusAttacks: 0,
      unitHasCharged: true,
      unitRemainedStationary: false,
      ...optionsOverride
    },
    ...rest
  });
}

describe('Weapon name condition', () => {
  const thunderousChargeRule = getTestRule('thunderous-charge');

  if (!thunderousChargeRule) {
    throw new Error('thunderous-charge rule not found in TEST_RULES');
  }

  it('should apply when weapon name matches (case-insensitive) and unit charged', () => {
    const context = createTestContext({
      weapon: {
        name: 'wolf guard weapon',
        range: 0,
        A: '2',
        WS: 3,
        S: 5,
        AP: -1,
        D: '2',
        keywords: []
      },
      attacker: {
        id: 'attacker-1',
        name: 'Thunderwolf Cavalry',
        categories: ['Mounted', 'Adeptus Astartes'],
        isLeader: false
      },
      defender: {
        id: 'defender-1',
        name: 'Ork Boy',
        categories: ['Infantry', 'Orks'],
        T: 4,
        SV: 6,
        W: 1
      },
      armyStates: []
    });

    const applied = evaluateRule(thunderousChargeRule, context);
    expect(applied).toBe(true);

    const damageModifiers = context.modifiers.getModifiers('D');
    expect(damageModifiers.length).toBeGreaterThan(0);
    expect(damageModifiers[0].value).toBe(1);
  });

  it('should not apply when weapon name does not match', () => {
    const context = createTestContext({
      weapon: {
        name: 'Bolt pistol',
        range: 0,
        A: '1',
        WS: 3,
        S: 4,
        AP: 0,
        D: '1',
        keywords: []
      },
      attacker: {
        id: 'attacker-1',
        name: 'Thunderwolf Cavalry',
        categories: ['Mounted', 'Adeptus Astartes'],
        isLeader: false
      },
      defender: {
        id: 'defender-1',
        name: 'Ork Boy',
        categories: ['Infantry', 'Orks'],
        T: 4,
        SV: 6,
        W: 1
      },
      armyStates: []
    });

    const applied = evaluateRule(thunderousChargeRule, context);
    expect(applied).toBe(false);
    expect(context.modifiers.getModifiers('D').length).toBe(0);
  });

  it('should not apply when unit did not charge', () => {
    const context = createTestContext({
      weapon: {
        name: 'Wolf Guard weapon',
        range: 0,
        A: '2',
        WS: 3,
        S: 5,
        AP: -1,
        D: '2',
        keywords: []
      },
      attacker: {
        id: 'attacker-1',
        name: 'Thunderwolf Cavalry',
        categories: ['Mounted', 'Adeptus Astartes'],
        isLeader: false
      },
      defender: {
        id: 'defender-1',
        name: 'Ork Boy',
        categories: ['Infantry', 'Orks'],
        T: 4,
        SV: 6,
        W: 1
      },
      armyStates: [],
      options: {
        unitHasCharged: false
      }
    });

    const applied = evaluateRule(thunderousChargeRule, context);
    expect(applied).toBe(false);
    expect(context.modifiers.getModifiers('D').length).toBe(0);
  });
});
