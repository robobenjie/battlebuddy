/**
 * Tests for user input conditions in rules engine
 */

import { describe, it, expect } from 'vitest';
import { Rule } from '../lib/rules-engine/types';
import { CombatContext, buildCombatContext } from '../lib/rules-engine/context';
import { evaluateRule } from '../lib/rules-engine/evaluator';

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

  describe('Drive-by Dakka (toggle input)', () => {
    const driveByDakkaRule: Rule = {
      id: 'drive-by-dakka',
      name: 'Drive-by Dakka',
      description: 'Each time a model in this unit makes a ranged attack that targets a unit within 9", improve the Armour Penetration characteristic of that attack by 1.',
      scope: 'unit',
      conditions: [],
      effects: [
        {
          type: 'modify-characteristic',
          target: 'weapon',
          params: {
            stat: 'AP',
            modifier: -1, // Improve AP by 1 means subtract 1
          },
          conditions: [
            {
              type: 'weapon-type',
              params: {
                weaponTypes: ['ranged'],
              },
            },
            {
              type: 'user-input',
              params: {
                inputId: 'within-9',
                inputValue: true,
              },
            },
          ],
        },
      ],
      duration: 'permanent',
      reactive: false,
      userInput: {
        type: 'toggle',
        id: 'within-9',
        label: 'Target within 9"',
        defaultValue: false,
      },
    };

    it('should apply AP improvement when user confirms target is within 9"', () => {
      const context = createTestContext({ 'within-9': true });
      const applied = evaluateRule(driveByDakkaRule, context);

      expect(applied).toBe(true);
      expect(context.modifiers.get('AP')).toBe(-1);
    });

    it('should NOT apply AP improvement when user confirms target is NOT within 9"', () => {
      const context = createTestContext({ 'within-9': false });
      const applied = evaluateRule(driveByDakkaRule, context);

      expect(applied).toBe(true); // Rule still applies (conditions met)
      expect(context.modifiers.get('AP')).toBe(0); // But effect is skipped
    });

    it('should NOT apply AP improvement when no user input provided', () => {
      const context = createTestContext({}); // No user input
      const applied = evaluateRule(driveByDakkaRule, context);

      expect(applied).toBe(true);
      expect(context.modifiers.get('AP')).toBe(0); // Effect skipped
    });
  });

  describe('Shooty Power Trip (radio input)', () => {
    const shootyPowerTripRule: Rule = {
      id: 'shooty-power-trip',
      name: 'Shooty Power Trip',
      description: 'Each time this unit is selected to shoot, you can roll one D6: On a 1-2, this unit suffers D3 mortal wounds. On a 3-4, until the end of the phase, add 1 to the Strength characteristic of ranged weapons. On a 5-6, until the end of the phase, add 1 to the Attacks characteristic of ranged weapons.',
      scope: 'unit',
      conditions: [],
      effects: [
        {
          type: 'modify-characteristic',
          target: 'weapon',
          params: {
            stat: 'S',
            modifier: 1,
          },
          conditions: [
            {
              type: 'weapon-type',
              params: {
                weaponTypes: ['ranged'],
              },
            },
            {
              type: 'user-input',
              params: {
                inputId: 'power-trip-roll',
                inputValue: '3-4',
              },
            },
          ],
        },
        {
          type: 'modify-characteristic',
          target: 'weapon',
          params: {
            stat: 'A',
            modifier: 1,
          },
          conditions: [
            {
              type: 'weapon-type',
              params: {
                weaponTypes: ['ranged'],
              },
            },
            {
              type: 'user-input',
              params: {
                inputId: 'power-trip-roll',
                inputValue: '5-6',
              },
            },
          ],
        },
      ],
      duration: 'permanent',
      reactive: false,
      userInput: {
        type: 'radio',
        id: 'power-trip-roll',
        label: 'Power Trip Roll Result',
        options: [
          {
            value: '1-2',
            label: '1-2: This unit suffers D3 mortal wounds',
          },
          {
            value: '3-4',
            label: '3-4: +1 Strength',
          },
          {
            value: '5-6',
            label: '5-6: +1 Attacks',
          },
        ],
        defaultValue: null,
      },
    };

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

      expect(applied).toBe(true);
      expect(context.modifiers.get('S')).toBe(0);
      expect(context.modifiers.get('A')).toBe(0);
      // Note: Mortal wounds would be handled separately, not by modifiers
    });

    it('should NOT apply any effects when no user input provided', () => {
      const context = createTestContext({});
      const applied = evaluateRule(shootyPowerTripRule, context);

      expect(applied).toBe(true);
      expect(context.modifiers.get('S')).toBe(0);
      expect(context.modifiers.get('A')).toBe(0);
    });
  });
});
