/**
 * Tests for appliesTo field in rules engine
 */

import { describe, it, expect } from 'vitest';
import { Rule } from '../lib/rules-engine/types';
import { CombatContext, buildCombatContext } from '../lib/rules-engine/context';
import { evaluateRule } from '../lib/rules-engine/evaluator';
import { ModifierStack } from '../lib/rules-engine/modifier-stack';

describe('Rules Engine - appliesTo field', () => {
  // Helper to create a basic combat context
  const createTestContext = (attackerIsLeader: boolean): CombatContext => {
    const attacker = {
      id: 'unit-1',
      armyId: 'army-1',
      categories: attackerIsLeader ? ['Infantry', 'Character'] : ['Infantry'],
    };

    const defender = {
      id: 'unit-2',
      armyId: 'army-2',
      categories: ['Infantry'],
      models: [{ T: 3, SV: 6 }],
    };

    const weapon = {
      name: 'Test Weapon',
      range: 24,
      A: '2',
      WS: 3,
      S: 4,
      AP: 0,
      D: '1',
      keywords: [],
    };

    const game = {
      id: 'game-1',
      currentTurn: 1,
      currentPhase: 'shooting',
    };

    return buildCombatContext({
      attacker,
      defender,
      weapon,
      game,
      combatPhase: 'shooting',
      options: {
        modelsFiring: 5,
        withinHalfRange: false,
        unitRemainedStationary: false,
        unitHasCharged: false,
        blastBonusAttacks: 0,
      },
      rules: [],
      armyStates: [],
    });
  };

  it('should apply effect with appliesTo: "bodyguard" to non-leader units', () => {
    const rule: Rule = {
      id: 'test-bodyguard-buff',
      name: 'Test Bodyguard Buff',
      description: 'Adds +1 to hit for bodyguard models',
      scope: 'unit',
      conditions: [],
      effects: [
        {
          type: 'modify-hit',
          target: 'self',
          params: { modifier: 1 },
          appliesTo: 'bodyguard',
        },
      ],
      duration: 'permanent',
    };

    const context = createTestContext(false); // Non-leader (bodyguard)
    const applied = evaluateRule(rule, context);

    expect(applied).toBe(true);
    expect(context.modifiers.get('hit')).toBe(1);
  });

  it('should NOT apply effect with appliesTo: "bodyguard" to leader units', () => {
    const rule: Rule = {
      id: 'test-bodyguard-buff',
      name: 'Test Bodyguard Buff',
      description: 'Adds +1 to hit for bodyguard models',
      scope: 'unit',
      conditions: [],
      effects: [
        {
          type: 'modify-hit',
          target: 'self',
          params: { modifier: 1 },
          appliesTo: 'bodyguard',
        },
      ],
      duration: 'permanent',
    };

    const context = createTestContext(true); // Leader (CHARACTER)
    const applied = evaluateRule(rule, context);

    expect(applied).toBe(true); // Rule still applies (no conditions failed)
    expect(context.modifiers.get('hit')).toBe(0); // But effect is skipped
  });

  it('should apply effect with appliesTo: "leader" to leader units', () => {
    const rule: Rule = {
      id: 'test-leader-buff',
      name: 'Test Leader Buff',
      description: 'Adds +1 to wound for leader models',
      scope: 'unit',
      conditions: [],
      effects: [
        {
          type: 'modify-wound',
          target: 'self',
          params: { modifier: 1 },
          appliesTo: 'leader',
        },
      ],
      duration: 'permanent',
    };

    const context = createTestContext(true); // Leader (CHARACTER)
    const applied = evaluateRule(rule, context);

    expect(applied).toBe(true);
    expect(context.modifiers.get('wound')).toBe(1);
  });

  it('should NOT apply effect with appliesTo: "leader" to bodyguard units', () => {
    const rule: Rule = {
      id: 'test-leader-buff',
      name: 'Test Leader Buff',
      description: 'Adds +1 to wound for leader models',
      scope: 'unit',
      conditions: [],
      effects: [
        {
          type: 'modify-wound',
          target: 'self',
          params: { modifier: 1 },
          appliesTo: 'leader',
        },
      ],
      duration: 'permanent',
    };

    const context = createTestContext(false); // Non-leader (bodyguard)
    const applied = evaluateRule(rule, context);

    expect(applied).toBe(true); // Rule still applies (no conditions failed)
    expect(context.modifiers.get('wound')).toBe(0); // But effect is skipped
  });

  it('should apply effect with appliesTo: "all" to all units', () => {
    const rule: Rule = {
      id: 'test-universal-buff',
      name: 'Test Universal Buff',
      description: 'Adds +1 to hit for all models',
      scope: 'unit',
      conditions: [],
      effects: [
        {
          type: 'modify-hit',
          target: 'self',
          params: { modifier: 1 },
          appliesTo: 'all',
        },
      ],
      duration: 'permanent',
    };

    // Test with bodyguard
    const contextBodyguard = createTestContext(false);
    const appliedBodyguard = evaluateRule(rule, contextBodyguard);
    expect(appliedBodyguard).toBe(true);
    expect(contextBodyguard.modifiers.get('hit')).toBe(1);

    // Test with leader
    const contextLeader = createTestContext(true);
    const appliedLeader = evaluateRule(rule, contextLeader);
    expect(appliedLeader).toBe(true);
    expect(contextLeader.modifiers.get('hit')).toBe(1);
  });

  it('should default to "all" when appliesTo is not specified', () => {
    const rule: Rule = {
      id: 'test-default-buff',
      name: 'Test Default Buff',
      description: 'Adds +1 to hit (no appliesTo specified)',
      scope: 'unit',
      conditions: [],
      effects: [
        {
          type: 'modify-hit',
          target: 'self',
          params: { modifier: 1 },
          // No appliesTo field
        },
      ],
      duration: 'permanent',
    };

    // Test with bodyguard
    const contextBodyguard = createTestContext(false);
    const appliedBodyguard = evaluateRule(rule, contextBodyguard);
    expect(appliedBodyguard).toBe(true);
    expect(contextBodyguard.modifiers.get('hit')).toBe(1);

    // Test with leader
    const contextLeader = createTestContext(true);
    const appliedLeader = evaluateRule(rule, contextLeader);
    expect(appliedLeader).toBe(true);
    expect(contextLeader.modifiers.get('hit')).toBe(1);
  });

  it('should handle Super Runts rule correctly', () => {
    const superRuntsRule: Rule = {
      id: 'super-runts',
      name: 'Super Runts',
      description: 'Bodyguard models get +1 to hit and wound',
      scope: 'unit',
      conditions: [],
      effects: [
        {
          type: 'modify-hit',
          target: 'self',
          params: { modifier: 1 },
          appliesTo: 'bodyguard',
        },
        {
          type: 'modify-wound',
          target: 'self',
          params: { modifier: 1 },
          appliesTo: 'bodyguard',
        },
      ],
      duration: 'permanent',
    };

    // Test with Gretchin (bodyguard) - should get bonuses
    const gretchinContext = createTestContext(false);
    evaluateRule(superRuntsRule, gretchinContext);
    expect(gretchinContext.modifiers.get('hit')).toBe(1);
    expect(gretchinContext.modifiers.get('wound')).toBe(1);

    // Test with Zogrod (leader) - should NOT get bonuses
    const zogrodContext = createTestContext(true);
    evaluateRule(superRuntsRule, zogrodContext);
    expect(zogrodContext.modifiers.get('hit')).toBe(0);
    expect(zogrodContext.modifiers.get('wound')).toBe(0);
  });
});
