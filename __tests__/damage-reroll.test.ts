/**
 * Test damage reroll functionality
 */

import { describe, it, expect } from 'vitest';
import { evaluateRule } from '../lib/rules-engine/evaluator';
import { CombatContext } from '../lib/rules-engine/types';
import { getTestRule } from '../lib/rules-engine/test-rules';
import { ModifierStack } from '../lib/rules-engine/modifier-stack';

describe('Damage Reroll', () => {
  const createTestContext = (weaponType: 'ranged' | 'melee' = 'melee'): CombatContext => ({
    attacker: {
      unitId: 'test-unit',
      armyId: 'test-army',
      categories: ['INFANTRY'],
      modelCount: 10,
      T: 5,
      SV: 4,
      isLeader: false
    },
    defender: {
      unitId: 'enemy-unit',
      armyId: 'enemy-army',
      categories: ['INFANTRY'],
      modelCount: 10,
      T: 4,
      SV: 3
    },
    weapon: {
      type: weaponType,
      range: weaponType === 'melee' ? 0 : 24,
      name: 'Power Klaw',
      S: 8,
      AP: -2,
      D: 2
    },
    game: {
      id: 'game1',
      currentTurn: 1,
      currentPhase: weaponType === 'melee' ? 'fight' : 'shooting'
    },
    combatPhase: weaponType === 'melee' ? 'fight' : 'shooting',
    userInputs: {},
    unitStatuses: [],
    armyStates: [],
    modifiers: new ModifierStack(),
    options: {
      unitHasCharged: false
    }
  });

  describe('Devastating Strikes', () => {
    const devastatingStrikesRule = getTestRule('devastating-strikes');

    it('should add damage reroll modifier when attacking with melee weapons', () => {
      if (!devastatingStrikesRule) {
        throw new Error('devastating-strikes rule not found');
      }

      const context = createTestContext('melee');

      const applied = evaluateRule(devastatingStrikesRule, context);
      expect(applied).toBe(true);

      // Check for damage reroll modifier
      const allModifiers = context.modifiers.getAllModifiers();
      const damageRerollModifiers = Array.from(allModifiers.entries())
        .filter(([stat]) => stat.startsWith('reroll:damage'));

      expect(damageRerollModifiers.length).toBeGreaterThan(0);

      // Verify the modifier format
      const [stat, modifiers] = damageRerollModifiers[0];
      expect(stat).toBe('reroll:damage:all');
      expect(modifiers[0].source).toBe('devastating-strikes');
      expect(modifiers[0].value).toBe(1);
    });

    it('should not apply to ranged weapons', () => {
      const context = createTestContext('ranged');

      const applied = evaluateRule(devastatingStrikesRule, context);
      expect(applied).toBe(false);

      // Check that no damage reroll modifier was added
      const allModifiers = context.modifiers.getAllModifiers();
      const damageRerollModifiers = Array.from(allModifiers.entries())
        .filter(([stat]) => stat.startsWith('reroll:damage'));

      expect(damageRerollModifiers.length).toBe(0);
    });

    it('should work in both player turns', () => {
      // Own turn
      const ownTurnContext = createTestContext('melee');
      ownTurnContext.game.currentTurn = 1;

      const appliedOwnTurn = evaluateRule(devastatingStrikesRule, ownTurnContext);
      expect(appliedOwnTurn).toBe(true);

      // Opponent turn (fight back)
      const opponentTurnContext = createTestContext('melee');
      opponentTurnContext.game.currentTurn = 2;

      const appliedOpponentTurn = evaluateRule(devastatingStrikesRule, opponentTurnContext);
      expect(appliedOpponentTurn).toBe(true);
    });
  });

  describe('Modifier Format', () => {
    it('should use correct format for damage reroll modifiers', () => {
      const devastatingStrikesRule = getTestRule('devastating-strikes');

      const context = createTestContext('melee');
      evaluateRule(devastatingStrikesRule, context);

      const allModifiers = context.modifiers.getAllModifiers();
      const damageRerollModifiers = Array.from(allModifiers.entries())
        .filter(([stat]) => stat.startsWith('reroll:damage'));

      // Verify format matches "reroll:{phase}:{kind}"
      expect(damageRerollModifiers[0][0]).toMatch(/^reroll:damage:(ones|failed|all)$/);
    });
  });
});
