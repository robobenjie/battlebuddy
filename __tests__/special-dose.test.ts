/**
 * Test for Special Dose rule (movement characteristic modification)
 *
 * Tests that the modMove effect works correctly and is applied only during
 * the movement phase when Waaagh! is active.
 */

import { describe, it, expect } from 'vitest';
import { ALL_TEST_RULES } from '../lib/rules-engine/test-rules';
import { buildCombatContext } from '../lib/rules-engine/context';
import { evaluateRule } from '../lib/rules-engine/evaluator';

describe('Special Dose (Movement Modifier)', () => {
  const rule = ALL_TEST_RULES.find(r => r.id === 'special-dose')!;

  it('should exist in test rules', () => {
    expect(rule).toBeDefined();
    expect(rule.name).toBe('Special Dose');
  });

  it('should add +6" to Move when Waaagh! is active in movement phase', () => {
    // Mock unit with Special Dose rule
    const unit = {
      id: 'mad-dok-1',
      name: 'Mad Dok Grotsnik',
      armyId: 'ork-army-1',
      categories: ['CHARACTER'],
      models: [
        {
          M: 5, // Base move characteristic
          T: 5,
          SV: 4,
        }
      ]
    };

    const defender = {
      id: 'target-1',
      name: 'Target Unit',
      armyId: 'enemy-army-1',
      categories: [],
      models: [{ T: 4, SV: 3 }]
    };

    const weapon = {
      name: 'Power Klaw',
      range: 0,
      A: '3',
      WS: 3,
      S: 10,
      AP: -2,
      D: '2',
      keywords: [],
      type: 'melee' as const
    };

    // Build context with Waaagh! active
    const context = buildCombatContext({
      attacker: unit,
      defender,
      weapon,
      game: {
        id: 'test-game',
        currentTurn: 1,
        currentPhase: 'movement'
      },
      combatPhase: 'shooting', // Not relevant for movement
      combatRole: 'attacker',
      options: {
        modelsFiring: 1,
        withinHalfRange: false,
        userInputs: {}
      },
      rules: [rule],
      armyStates: [
        {
          id: 'waaagh-state-1',
          armyId: 'ork-army-1',
          state: 'waaagh',
          activatedTurn: 1
        }
      ]
    });

    // Evaluate the rule
    const ruleApplied = evaluateRule(rule, context);

    // Verify the rule was applied
    expect(ruleApplied).toBe(true);

    // Verify it added +6 to Move modifier
    const moveModifier = context.modifiers.get('M');
    expect(moveModifier).toBe(6);
  });

  it('should NOT apply when Waaagh! is not active', () => {
    const unit = {
      id: 'mad-dok-1',
      name: 'Mad Dok Grotsnik',
      armyId: 'ork-army-1',
      categories: ['CHARACTER'],
      models: [
        {
          M: 5,
          T: 5,
          SV: 4,
        }
      ]
    };

    const defender = {
      id: 'target-1',
      name: 'Target Unit',
      armyId: 'enemy-army-1',
      categories: [],
      models: [{ T: 4, SV: 3 }]
    };

    const weapon = {
      name: 'Power Klaw',
      range: 0,
      A: '3',
      WS: 3,
      S: 10,
      AP: -2,
      D: '2',
      keywords: [],
      type: 'melee' as const
    };

    // Build context WITHOUT Waaagh! active
    const context = buildCombatContext({
      attacker: unit,
      defender,
      weapon,
      game: {
        id: 'test-game',
        currentTurn: 1,
        currentPhase: 'movement'
      },
      combatPhase: 'shooting',
      combatRole: 'attacker',
      options: {
        modelsFiring: 1,
        withinHalfRange: false,
        userInputs: {}
      },
      rules: [rule],
      armyStates: [] // No Waaagh!
    });

    // Evaluate the rule
    const ruleApplied = evaluateRule(rule, context);

    // Verify the rule was NOT applied
    expect(ruleApplied).toBe(false);

    // Verify no Move modifier was added
    const moveModifier = context.modifiers.get('M');
    expect(moveModifier).toBe(0);
  });

  it('should have movement phase trigger', () => {
    expect(rule.trigger.phase).toBe('movement');
  });

  it('should require Waaagh! army state', () => {
    expect(rule.when).toMatchObject({
      t: 'armyState',
      is: ['waaagh']
    });
  });

  it('should have model scope', () => {
    expect(rule.scope).toBe('model');
  });
});
