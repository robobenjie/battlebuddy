/**
 * Test for Get Da Good Bitz rule (objective control reminder)
 *
 * Tests that reminder-only rules for objective control are properly structured
 * and trigger at the correct phase.
 */

import { describe, it, expect } from 'vitest';
import { ALL_TEST_RULES } from '../lib/rules-engine/test-rules';
import { buildCombatContext } from '../lib/rules-engine/context';
import { evaluateRule } from '../lib/rules-engine/evaluator';

describe('Get Da Good Bitz (Objective Control Reminder)', () => {
  const rule = ALL_TEST_RULES.find(r => r.id === 'get-da-good-bitz')!;

  it('should exist in test rules', () => {
    expect(rule).toBeDefined();
    expect(rule.name).toBe('Get Da Good Bitz');
  });

  it('should be a reminder-only rule', () => {
    expect(rule.kind).toBe('reminder');
  });

  it('should have reactive trigger in command phase', () => {
    expect(rule.trigger.t).toBe('reactive');
    expect(rule.trigger.phase).toBe('command');
    expect(rule.trigger.turn).toBe('own');
  });

  it('should have unit scope', () => {
    expect(rule.scope).toBe('unit');
  });

  it('should always evaluate to true (no conditions)', () => {
    const unit = {
      id: 'boyz-1',
      name: 'Ork Boyz',
      armyId: 'ork-army-1',
      categories: ['INFANTRY'],
      models: [
        {
          M: 6,
          T: 5,
          SV: 5,
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
      name: 'Choppa',
      range: 0,
      A: '2',
      WS: 3,
      S: 4,
      AP: -1,
      D: '1',
      keywords: [],
      type: 'melee' as const
    };

    const context = buildCombatContext({
      attacker: unit,
      defender,
      weapon,
      game: {
        id: 'test-game',
        currentTurn: 1,
        currentPhase: 'command'
      },
      combatPhase: 'shooting',
      combatRole: 'attacker',
      options: {
        modelsFiring: 10,
        withinHalfRange: false,
        userInputs: {}
      },
      rules: [rule],
      armyStates: []
    });

    // Evaluate the rule
    const ruleApplied = evaluateRule(rule, context);

    // Reminder rules should evaluate to true if conditions are met
    expect(ruleApplied).toBe(true);
  });

  it('should not modify any combat stats (reminder only)', () => {
    const unit = {
      id: 'boyz-1',
      name: 'Ork Boyz',
      armyId: 'ork-army-1',
      categories: ['INFANTRY'],
      models: [
        {
          M: 6,
          T: 5,
          SV: 5,
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
      name: 'Choppa',
      range: 0,
      A: '2',
      WS: 3,
      S: 4,
      AP: -1,
      D: '1',
      keywords: [],
      type: 'melee' as const
    };

    const context = buildCombatContext({
      attacker: unit,
      defender,
      weapon,
      game: {
        id: 'test-game',
        currentTurn: 1,
        currentPhase: 'command'
      },
      combatPhase: 'shooting',
      combatRole: 'attacker',
      options: {
        modelsFiring: 10,
        withinHalfRange: false,
        userInputs: {}
      },
      rules: [rule],
      armyStates: []
    });

    // Evaluate the rule
    evaluateRule(rule, context);

    // Verify no modifiers were added
    expect(context.modifiers.get('hit')).toBe(0);
    expect(context.modifiers.get('wound')).toBe(0);
    expect(context.modifiers.get('S')).toBe(0);
    expect(context.modifiers.get('AP')).toBe(0);
    expect(context.modifiers.get('A')).toBe(0);
    expect(context.modifiers.get('D')).toBe(0);
  });

  it('should have Orks faction', () => {
    expect(rule.faction).toBe('Orks');
  });

  it('should have a description', () => {
    expect(rule.description).toBeDefined();
    expect(rule.description.length).toBeGreaterThan(0);
  });
});
