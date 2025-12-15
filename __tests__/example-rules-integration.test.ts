/**
 * Integration tests for EXAMPLE_RULES
 *
 * Verifies that the example rules we show to OpenAI actually work correctly
 * in the combat engine and produce the expected effects.
 */

import { describe, it, expect } from 'vitest';
import { EXAMPLE_RULES } from '../lib/rules-engine/example-rules';
import { buildCombatContext } from '../lib/rules-engine/context';
import { evaluateRule, getAddedKeywords } from '../lib/rules-engine/evaluator';

describe('Example Rules Integration', () => {
  // Helper to create basic test data
  const createTestContext = (params: {
    weapon?: any;
    attacker?: any;
    defender?: any;
    userInputs?: Record<string, any>;
    armyStates?: string[];
    combatRole?: 'attacker' | 'defender';
    combatPhase?: 'shooting' | 'melee';
    unitHasCharged?: boolean;
  } = {}) => {
    const {
      weapon = {
        name: 'Test Weapon',
        range: 24, // ranged weapon (range > 0)
        A: '2',
        WS: 3,
        S: 4,
        AP: 0,
        D: '1',
        keywords: [],
      },
      attacker = {
        id: 'unit-1',
        armyId: 'army-1',
        categories: ['Infantry'],
      },
      defender = {
        id: 'unit-2',
        armyId: 'army-2',
        categories: ['Infantry'],
        models: [{ T: 3, SV: 6 }],
      },
      userInputs = {},
      armyStates = [],
      combatRole = 'attacker',
      combatPhase = 'shooting',
      unitHasCharged = false,
    } = params;

    const game = {
      id: 'game-1',
      currentTurn: 1,
      currentPhase: combatPhase,
    };

    return buildCombatContext({
      attacker,
      defender,
      weapon,
      game,
      combatPhase,
      combatRole,
      options: {
        modelsFiring: 5,
        withinHalfRange: false,
        unitRemainedStationary: false,
        unitHasCharged,
        blastBonusAttacks: 0,
        userInputs,
      },
      rules: [],
      armyStates: armyStates.map(state => ({
        armyId: 'army-1',
        state,
        activatedAt: Date.now(),
      })),
    });
  };

  describe('Waaagh! Energy (radio input)', () => {
    const rule = EXAMPLE_RULES.find(r => r.id === 'waaagh-energy')!;

    it('should not modify weapon when 0-4 models selected', () => {
      const context = createTestContext({
        weapon: { name: "'Eadbanger", range: 0, S: 10, D: 3, A: '1', WS: 3, AP: -2, keywords: [] },
        attacker: { id: 'unit-1', armyId: 'army-1', categories: ['Character'] },
        userInputs: { 'unit-size': '0-4' },
      });

      evaluateRule(rule, context);

      // 0-4 models option has no effects
      expect(context.modifiers.get('S')).toBe(0);
      expect(context.modifiers.get('D')).toBe(0);
      const keywords = getAddedKeywords(context);
      expect(keywords).toHaveLength(0);
    });

    it('should add +1 S/D when 5-9 models selected', () => {
      const context = createTestContext({
        weapon: { name: "'Eadbanger", range: 0, S: 10, D: 3, A: '1', WS: 3, AP: -2, keywords: [] },
        attacker: { id: 'unit-1', armyId: 'army-1', categories: ['Character'] },
        userInputs: { 'unit-size': '5-9' },
      });

      evaluateRule(rule, context);

      // +1 S/D from 5-9 models option
      expect(context.modifiers.get('S')).toBe(1);
      expect(context.modifiers.get('D')).toBe(1);
      const keywords = getAddedKeywords(context);
      expect(keywords).not.toContain('Hazardous');
    });

    it('should add +2 S/D and HAZARDOUS when 10-14 models selected', () => {
      const context = createTestContext({
        weapon: { name: "'Eadbanger", range: 0, S: 10, D: 3, A: '1', WS: 3, AP: -2, keywords: [] },
        attacker: { id: 'unit-1', armyId: 'army-1', categories: ['Character'] },
        userInputs: { 'unit-size': '10-14' },
      });

      evaluateRule(rule, context);

      // +2 S/D and HAZARDOUS from 10-14 models option
      expect(context.modifiers.get('S')).toBe(2);
      expect(context.modifiers.get('D')).toBe(2);
      const keywords = getAddedKeywords(context);
      expect(keywords).toContain('Hazardous');
    });

    it('should only apply when is-leading condition is met', () => {
      const context = createTestContext({
        weapon: { name: "'Eadbanger", range: 0, S: 10, D: 3, A: '1', WS: 3, AP: -2, keywords: [] },
        attacker: { id: 'unit-1', armyId: 'army-1', categories: ['Infantry'] }, // Not a CHARACTER
        userInputs: { 'unit-size': '5-9' },
      });

      const applied = evaluateRule(rule, context);

      // Should not apply - is-leading condition not met (not a CHARACTER)
      expect(applied).toBe(false);
      expect(context.modifiers.get('S')).toBe(0);
    });
  });

  describe('Drive-by Dakka (toggle input)', () => {
    const rule = EXAMPLE_RULES.find(r => r.id === 'drive-by-dakka')!;

    it('should improve AP by 1 when advanced', () => {
      const context = createTestContext({
        weapon: { name: 'Dakka Gun', range: 24, AP: -1, A: '2', WS: 3, S: 4, D: '1', keywords: [] },
        userInputs: {
          'advanced-this-turn': true
        },
      });

      evaluateRule(rule, context);

      // AP improvement: -1 modifier
      expect(context.modifiers.get('AP')).toBe(-1);
    });

    it('should not improve AP when not advanced', () => {
      const context = createTestContext({
        weapon: { name: 'Dakka Gun', range: 24, AP: -1, A: '2', WS: 3, S: 4, D: '1', keywords: [] },
        userInputs: {
          'advanced-this-turn': false
        },
      });

      evaluateRule(rule, context);

      // Toggle set to false - no effect
      expect(context.modifiers.get('AP')).toBe(0);
    });

    it('should not apply to melee weapons', () => {
      const context = createTestContext({
        weapon: { name: 'Choppa', range: 0, AP: -1, A: '2', WS: 3, S: 4, D: '1', keywords: [] },
        userInputs: {
          'advanced-this-turn': true
        },
      });

      const applied = evaluateRule(rule, context);

      // Rule doesn't apply - weapon-type condition not met (melee weapon)
      expect(applied).toBe(false);
      expect(context.modifiers.get('AP')).toBe(0);
    });
  });

  describe('Dakka Dakka Dakka (automatic)', () => {
    const rule = EXAMPLE_RULES.find(r => r.id === 'dakka-dakka-dakka')!;

    it('should add Lethal Hits to ranged weapons', () => {
      const context = createTestContext({
        weapon: { name: 'Slugga', range: 12, A: '2', WS: 3, S: 4, AP: 0, D: '1', keywords: [] },
      });

      evaluateRule(rule, context);

      const keywords = getAddedKeywords(context);
      expect(keywords).toContain('Lethal Hits');
    });

    it('should not apply to melee weapons', () => {
      const context = createTestContext({
        weapon: { name: 'Choppa', range: 0, A: '2', WS: 3, S: 4, AP: 0, D: '1', keywords: [] },
      });

      const applied = evaluateRule(rule, context);

      // Rule doesn't apply - weapon-type condition not met (melee weapon)
      expect(applied).toBe(false);
      const keywords = getAddedKeywords(context);
      expect(keywords).not.toContain('Lethal Hits');
    });
  });

  describe('Tank Hunter (automatic)', () => {
    const rule = EXAMPLE_RULES.find(r => r.id === 'tank-hunter')!;

    it('should add reroll wounds of 1 against VEHICLE targets', () => {
      const context = createTestContext({
        weapon: { name: 'Rokkit Launcha', range: 24, A: '1', WS: 3, S: 8, AP: -2, D: '3', keywords: [] },
        defender: {
          id: 'unit-2',
          armyId: 'army-2',
          categories: ['Vehicle'],
          models: [{ T: 10, SV: 3 }],
        },
      });

      evaluateRule(rule, context);

      const rerollMods = context.modifiers.getModifiers('reroll:wound:ones');
      expect(rerollMods.length).toBeGreaterThan(0);
    });

    it('should not apply against non-VEHICLE targets', () => {
      const context = createTestContext({
        weapon: { name: 'Rokkit Launcha', range: 24, A: '1', WS: 3, S: 8, AP: -2, D: '3', keywords: [] },
        defender: {
          id: 'unit-2',
          armyId: 'army-2',
          categories: ['Infantry'],
          models: [{ T: 3, SV: 6 }],
        },
      });

      const applied = evaluateRule(rule, context);

      // Rule doesn't apply - target-category condition not met
      expect(applied).toBe(false);
      const rerollMods = context.modifiers.getModifiers('reroll:wound:ones');
      expect(rerollMods.length).toBe(0);
    });

    it('should not apply to melee weapons', () => {
      const context = createTestContext({
        weapon: { name: 'Choppa', range: 0, A: '2', WS: 3, S: 4, AP: 0, D: '1', keywords: [] },
        defender: {
          id: 'unit-2',
          armyId: 'army-2',
          categories: ['Vehicle'],
          models: [{ T: 10, SV: 3 }],
        },
      });

      const applied = evaluateRule(rule, context);

      // Rule doesn't apply - weapon-type condition not met (melee weapon)
      expect(applied).toBe(false);
      const rerollMods = context.modifiers.getModifiers('reroll:wound:ones');
      expect(rerollMods.length).toBe(0);
    });
  });

  describe('Furious Charge (unit status)', () => {
    const rule = EXAMPLE_RULES.find(r => r.id === 'furious-charge')!;

    it('should add +1 Strength when charged', () => {
      const context = createTestContext({
        weapon: { name: 'Choppa', range: 0, S: 4, A: '2', WS: 3, AP: 0, D: '1', keywords: [] },
        combatRole: 'attacker',
        combatPhase: 'melee',
        unitHasCharged: true,
      });

      evaluateRule(rule, context);

      expect(context.modifiers.get('S')).toBe(1);
    });

    it('should not apply when not charged', () => {
      const context = createTestContext({
        weapon: { name: 'Choppa', range: 0, S: 4, A: '2', WS: 3, AP: 0, D: '1', keywords: [] },
        unitHasCharged: false,
      });

      const applied = evaluateRule(rule, context);

      // Rule doesn't apply - unit-status condition not met
      expect(applied).toBe(false);
      expect(context.modifiers.get('S')).toBe(0);
    });

    it('should not apply to ranged weapons', () => {
      const context = createTestContext({
        weapon: { name: 'Slugga', range: 12, S: 4, A: '2', WS: 3, AP: 0, D: '1', keywords: [] },
        unitHasCharged: true,
      });

      const applied = evaluateRule(rule, context);

      // Rule doesn't apply - weapon-type condition not met (ranged weapon)
      expect(applied).toBe(false);
      expect(context.modifiers.get('S')).toBe(0);
    });
  });

  describe('Super Runts (leader with appliesTo)', () => {
    const rule = EXAMPLE_RULES.find(r => r.id === 'super-runts')!;

    it('should add Scouts 9" keyword to bodyguard units', () => {
      const context = createTestContext({
        weapon: { name: 'Slugga', range: 12, A: '2', WS: 3, S: 4, AP: 0, D: '1', keywords: [] },
        attacker: { id: 'unit-1', armyId: 'army-1', categories: ['Infantry'], leaderId: 'leader-1' },
      });

      evaluateRule(rule, context);

      // Scouts keyword applies to bodyguard (unit being led)
      const keywords = getAddedKeywords(context);
      expect(keywords).toContain('Scouts 9');
    });

    it('should add +1 to hit for bodyguard when attacking', () => {
      const context = createTestContext({
        weapon: { name: 'Slugga', range: 12, A: '2', WS: 3, S: 4, AP: 0, D: '1', keywords: [] },
        attacker: { id: 'unit-1', armyId: 'army-1', categories: ['Infantry'], leaderId: 'leader-1' },
        combatRole: 'attacker',
      });

      evaluateRule(rule, context);

      expect(context.modifiers.get('hit')).toBe(1);
    });

    it('should add +1 to wound for bodyguard when attacking', () => {
      const context = createTestContext({
        weapon: { name: 'Slugga', range: 12, A: '2', WS: 3, S: 4, AP: 0, D: '1', keywords: [] },
        attacker: { id: 'unit-1', armyId: 'army-1', categories: ['Infantry'], leaderId: 'leader-1' },
        combatRole: 'attacker',
      });

      evaluateRule(rule, context);

      expect(context.modifiers.get('wound')).toBe(1);
    });

    it('should subtract 1 from wound rolls against bodyguard when defending', () => {
      const context = createTestContext({
        weapon: { name: 'Slugga', range: 12, A: '2', WS: 3, S: 4, AP: 0, D: '1', keywords: [] },
        attacker: { id: 'unit-1', armyId: 'army-1', categories: ['Infantry'], leaderId: 'leader-1' },
        combatRole: 'defender',
      });

      evaluateRule(rule, context);

      // When defending, the wound modifier should be -1
      expect(context.modifiers.get('wound')).toBe(-1);
    });

    it('should not apply when unit is not being led', () => {
      const context = createTestContext({
        weapon: { name: 'Slugga', range: 12, A: '2', WS: 3, S: 4, AP: 0, D: '1', keywords: [] },
        attacker: { id: 'unit-1', armyId: 'army-1', categories: ['Infantry'] }, // No leaderId
        combatRole: 'attacker',
      });

      const applied = evaluateRule(rule, context);

      // Rule doesn't apply - being-led condition not met
      expect(applied).toBe(false);
      expect(context.modifiers.get('hit')).toBe(0);
    });
  });

  describe('Bomb Squigs (reminder-only rule)', () => {
    const rule = EXAMPLE_RULES.find(r => r.id === 'bomb-squigs')!;

    it('should not modify any combat stats', () => {
      const context = createTestContext({});

      evaluateRule(rule, context);

      // No effects - this is a reminder-only rule
      expect(context.modifiers.get('S')).toBe(0);
      expect(context.modifiers.get('A')).toBe(0);
      expect(context.modifiers.get('AP')).toBe(0);
      const keywords = getAddedKeywords(context);
      expect(keywords).toHaveLength(0);
    });

    it('should have manual activation in movement phase', () => {
      expect(rule.activation.type).toBe('manual');
      expect(rule.activation.phase).toBe('movement');
    });
  });

  describe('Shooty Power Trip (radio with multiple outcomes)', () => {
    const rule = EXAMPLE_RULES.find(r => r.id === 'shooty-power-trip')!;

    it('should add +1 Strength when 3-4 rolled', () => {
      const context = createTestContext({
        weapon: { name: 'Shootas', range: 18, S: 4, A: '2', WS: 3, AP: 0, D: '1', keywords: [] },
        userInputs: {
          'power-trip-roll': '3-4'
        },
      });

      evaluateRule(rule, context);

      expect(context.modifiers.get('S')).toBe(1);
      expect(context.modifiers.get('A')).toBe(0);
    });

    it('should add +1 Attacks when 5-6 rolled', () => {
      const context = createTestContext({
        weapon: { name: 'Shootas', range: 18, A: '2', WS: 3, S: 4, AP: 0, D: '1', keywords: [] },
        userInputs: {
          'power-trip-roll': '5-6'
        },
      });

      evaluateRule(rule, context);

      expect(context.modifiers.get('A')).toBe(1);
      expect(context.modifiers.get('S')).toBe(0);
    });

    it('should not apply effects when 1-2 rolled', () => {
      const context = createTestContext({
        weapon: { name: 'Shootas', range: 18, A: '2', WS: 3, S: 4, AP: 0, D: '1', keywords: [] },
        userInputs: {
          'power-trip-roll': '1-2'
        },
      });

      evaluateRule(rule, context);

      // 1-2 option has no effects
      expect(context.modifiers.get('S')).toBe(0);
      expect(context.modifiers.get('A')).toBe(0);
    });

    it('should not apply effects when no roll made', () => {
      const context = createTestContext({
        weapon: { name: 'Shootas', range: 18, A: '2', WS: 3, S: 4, AP: 0, D: '1', keywords: [] },
        userInputs: {
          'power-trip-roll': 'no-roll'
        },
      });

      evaluateRule(rule, context);

      expect(context.modifiers.get('S')).toBe(0);
      expect(context.modifiers.get('A')).toBe(0);
    });

    it('should not apply to melee weapons', () => {
      const context = createTestContext({
        weapon: { name: 'Choppa', range: 0, A: '2', WS: 3, S: 4, AP: 0, D: '1', keywords: [] },
        userInputs: {
          'power-trip-roll': '5-6'
        },
      });

      const applied = evaluateRule(rule, context);

      // Rule doesn't apply - weapon-type condition not met (melee weapon)
      expect(applied).toBe(false);
      expect(context.modifiers.get('A')).toBe(0);
    });
  });

  describe('Waaagh! Call (army-state)', () => {
    const rule = EXAMPLE_RULES.find(r => r.id === 'waaagh-call')!;

    it('should add +1 Attacks when Waaagh is active', () => {
      const context = createTestContext({
        weapon: { name: 'Choppa', range: 0, A: '2', WS: 3, S: 4, AP: 0, D: '1', keywords: [] },
        armyStates: ['waaagh'],
        combatPhase: 'melee',
      });

      evaluateRule(rule, context);

      expect(context.modifiers.get('A')).toBe(1);
    });

    it('should not apply when Waaagh is not active', () => {
      const context = createTestContext({
        weapon: { name: 'Choppa', range: 0, A: '2', WS: 3, S: 4, AP: 0, D: '1', keywords: [] },
        armyStates: [],
      });

      const applied = evaluateRule(rule, context);

      // Rule doesn't apply - army-state condition not met
      expect(applied).toBe(false);
      expect(context.modifiers.get('A')).toBe(0);
    });

    it('should not apply to ranged weapons', () => {
      const context = createTestContext({
        weapon: { name: 'Slugga', range: 12, A: '2', WS: 3, S: 4, AP: 0, D: '1', keywords: [] },
        armyStates: ['waaagh'],
      });

      const applied = evaluateRule(rule, context);

      // Rule doesn't apply - weapon-type condition not met (ranged weapon)
      expect(applied).toBe(false);
      expect(context.modifiers.get('A')).toBe(0);
    });
  });

  describe('Wild Ride (Movement)', () => {
    const rule = EXAMPLE_RULES.find(r => r.id === 'wild-ride-movement')!;

    it('should be a reminder-only rule that always applies', () => {
      const context = createTestContext({});

      const applied = evaluateRule(rule, context);

      // Rule applies (no conditions to fail)
      expect(applied).toBe(true);

      // But it has no effects (reminder only)
      const keywords = getAddedKeywords(context);
      expect(keywords).toHaveLength(0);
      expect(context.modifiers.get('Move')).toBe(0);
    });

    it('should have manual activation in movement phase', () => {
      expect(rule.activation.type).toBe('manual');
      expect(rule.activation.phase).toBe('movement');
      expect(rule.activation.turn).toBe('own');
      expect(rule.activation.limit).toBe(null); // Can use multiple times
    });

    it('should have no conditions or effects', () => {
      expect(rule.conditions).toHaveLength(0);
      expect(rule.effects).toHaveLength(0);
      expect(rule.userInput).toBe(null);
    });
  });

  describe('Wild Ride (Charge)', () => {
    const rule = EXAMPLE_RULES.find(r => r.id === 'wild-ride-charge')!;

    it('should be a reminder-only rule that always applies', () => {
      const context = createTestContext({});

      const applied = evaluateRule(rule, context);

      // Rule applies (no conditions to fail)
      expect(applied).toBe(true);

      // But it has no effects (reminder only)
      const keywords = getAddedKeywords(context);
      expect(keywords).toHaveLength(0);
    });

    it('should have manual activation in charge phase', () => {
      expect(rule.activation.type).toBe('manual');
      expect(rule.activation.phase).toBe('charge');
      expect(rule.activation.turn).toBe('own');
      expect(rule.activation.limit).toBe(null);
    });

    it('should have no conditions or effects', () => {
      expect(rule.conditions).toHaveLength(0);
      expect(rule.effects).toHaveLength(0);
      expect(rule.userInput).toBe(null);
    });

    it('should have same name and description as movement version', () => {
      const movementRule = EXAMPLE_RULES.find(r => r.id === 'wild-ride-movement')!;
      expect(rule.name).toBe(movementRule.name);
      expect(rule.description).toBe(movementRule.description);
    });
  });
});
