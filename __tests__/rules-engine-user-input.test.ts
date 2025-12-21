/**
 * Tests for user input conditions in rules engine
 */

import { describe, it, expect } from 'vitest';
import { Rule } from '../lib/rules-engine/types';
import { CombatContext, buildCombatContext } from '../lib/rules-engine/context';
import { evaluateRule } from '../lib/rules-engine/evaluator';
import { getTestRule } from '../lib/rules-engine/test-rules';

describe('Rules Engine - User Input Conditions', () => {
  // Helper to create a basic combat context
  const createTestContext = (userInputs?: Record<string, any>): CombatContext => {
    const attacker = {
      id: 'unit-1',
      armyId: 'army-1',
      categories: ['Infantry'],
    };

    const defender = {
      id: 'unit-2',
      armyId: 'army-2',
      categories: ['Infantry'],
      models: [{ T: 3, SV: 6 }],
    };

    const weapon = {
      name: 'Dakka Gun',
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
        userInputs: userInputs || {},
      },
      rules: [],
      armyStates: [],
    });
  };

  describe('Drive-by Dakka (range check choice)', () => {
    const driveByDakkaRule: Rule = getTestRule('drive-by-dakka')!;

    it('should apply AP improvement when target is within 9"', () => {
      const context = createTestContext({ 'target-within-9': 'yes' });
      const applied = evaluateRule(driveByDakkaRule, context);

      expect(applied).toBe(true);
      expect(context.modifiers.get('AP')).toBe(-1);
    });

    it('should NOT apply AP improvement when target is beyond 9"', () => {
      const context = createTestContext({ 'target-within-9': 'no' });
      const applied = evaluateRule(driveByDakkaRule, context);

      expect(applied).toBe(true); // Rule still applies (when conditions met)
      expect(context.modifiers.get('AP')).toBe(0); // But effect is skipped
    });

    it('should NOT apply rule when no user input provided', () => {
      const context = createTestContext({}); // No user input
      const applied = evaluateRule(driveByDakkaRule, context);

      expect(applied).toBe(false); // Choice rules don't apply without input
      expect(context.modifiers.get('AP')).toBe(0);
    });
  });

  describe('Shooty Power Trip (radio input)', () => {
    const shootyPowerTripRule: Rule = getTestRule('shooty-power-trip')!;

    it('should apply +1 Strength when user selects 3-4 result', () => {
      const context = createTestContext({ 'power-trip-roll': '3-4' });
      const applied = evaluateRule(shootyPowerTripRule, context);

      expect(applied).toBe(true);
      expect(context.modifiers.get('S')).toBe(1);
      expect(context.modifiers.get('A')).toBe(0); // Not the 5-6 effect
    });

    it('should apply +1 Attacks when user selects 5-6 result', () => {
      const context = createTestContext({ 'power-trip-roll': '5-6' });
      const applied = evaluateRule(shootyPowerTripRule, context);

      expect(applied).toBe(true);
      expect(context.modifiers.get('A')).toBe(1);
      expect(context.modifiers.get('S')).toBe(0); // Not the 3-4 effect
    });

    it('should NOT apply any effects when user selects 1-2 result', () => {
      const context = createTestContext({ 'power-trip-roll': '1-2' });
      const applied = evaluateRule(shootyPowerTripRule, context);

      expect(applied).toBe(true); // Rule applies but no combat modifiers
      expect(context.modifiers.get('S')).toBe(0);
      expect(context.modifiers.get('A')).toBe(0);
      // Note: Mortal wounds would be handled separately, not by modifiers
    });

    it('should NOT apply rule when no user input provided', () => {
      const context = createTestContext({});
      const applied = evaluateRule(shootyPowerTripRule, context);

      expect(applied).toBe(false); // Choice rules don't apply without input
      expect(context.modifiers.get('S')).toBe(0);
      expect(context.modifiers.get('A')).toBe(0);
    });
  });
});
