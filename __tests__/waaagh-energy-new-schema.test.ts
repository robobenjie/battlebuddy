/**
 * Integration test for Waaagh! Energy rule with IMPROVED schema
 * Effects are embedded directly in userInput options
 */

import { describe, it, expect } from 'vitest';
import { evaluateRule } from '../lib/rules-engine/evaluator';
import { buildCombatContext } from '../lib/rules-engine/context';
import { Rule } from '../lib/rules-engine/types';
import { WeaponStats, TargetStats } from '../lib/combat-calculator-engine';
import { getTestRule } from '../lib/rules-engine/test-rules';

// Waaagh! Energy rule from test-rules.json
const waaaghEnergyRule: Rule = getTestRule('waaagh-energy')!;

describe('Waaagh! Energy (NEW Schema)', () => {
  const testWeapon: WeaponStats = {
    name: "'Eadbanger",
    range: 0,
    A: '6',
    WS: 2,
    S: 10,
    AP: -2,
    D: '3',
    keywords: []
  };

  const testTarget: TargetStats = {
    T: 8,
    SV: 2,
    INV: 4,
    modelCount: 10,
    categories: ['VEHICLE']
  };

  const testGame = {
    id: 'test-game',
    currentTurn: 1,
    currentPhase: 'fight'
  };

  describe('Schema structure', () => {
    it('should be a choice rule with options', () => {
      expect(waaaghEnergyRule.kind).toBe('choice');
      expect(waaaghEnergyRule.choice).toBeDefined();
      expect(waaaghEnergyRule.choice?.options).toBeDefined();

      // Check that 5-9 option has effects
      const option5_9 = waaaghEnergyRule.choice?.options?.find(o => o.v === '5-9');
      expect(option5_9).toBeDefined();
      expect(option5_9?.then).toBeDefined();
      // Should have 1 "do" block with 2 effects (+1 S and +1 D)
      expect(option5_9?.then?.[0]?.fx).toHaveLength(2);
    });

    it('should use choice structure instead of top-level effects', () => {
      // New schema: effects are in choice.options[].then, not at the top level
      expect(waaaghEnergyRule.kind).toBe('choice');
      expect(waaaghEnergyRule.choice).toBeDefined();
    });
  });

  describe('Effect application from selected option', () => {
    it('should apply no effects when 0-4 models selected', () => {
      const context = buildCombatContext({
        attacker: {
          id: 'warboss',
          armyId: 'ork-army',
          categories: ['CHARACTER', 'INFANTRY'],
          isLeader: true
        },
        defender: testTarget,
        weapon: testWeapon,
        game: testGame,
        combatPhase: 'melee',
        options: {
          modelsFiring: 1,
          withinHalfRange: false,
          blastBonusAttacks: 0,
          unitHasCharged: false,
          unitRemainedStationary: false,
          userInputs: { 'unit-size': '0-4' }
        },
        rules: [waaaghEnergyRule],
        armyStates: []
      });

      const applied = evaluateRule(waaaghEnergyRule, context);
      expect(applied).toBe(true); // Rule applies (is-leading is true)

      // No modifiers (0-4 has empty effects array)
      const sMod = context.modifiers.get('S');
      const dMod = context.modifiers.get('D');
      expect(sMod).toBe(0);
      expect(dMod).toBe(0);
    });

    it('should apply +1 S/D when 5-9 models selected', () => {
      const context = buildCombatContext({
        attacker: {
          id: 'warboss',
          armyId: 'ork-army',
          categories: ['CHARACTER', 'INFANTRY'],
          isLeader: true
        },
        defender: testTarget,
        weapon: testWeapon,
        game: testGame,
        combatPhase: 'melee',
        options: {
          modelsFiring: 1,
          withinHalfRange: false,
          blastBonusAttacks: 0,
          unitHasCharged: false,
          unitRemainedStationary: false,
          userInputs: { 'unit-size': '5-9' }
        },
        rules: [waaaghEnergyRule],
        armyStates: []
      });

      const applied = evaluateRule(waaaghEnergyRule, context);
      expect(applied).toBe(true);

      const sMod = context.modifiers.get('S');
      const dMod = context.modifiers.get('D');
      expect(sMod).toBe(1);
      expect(dMod).toBe(1);
    });

    it('should apply +2 S/D and HAZARDOUS when 10-14 models selected', () => {
      const context = buildCombatContext({
        attacker: {
          id: 'warboss',
          armyId: 'ork-army',
          categories: ['CHARACTER', 'INFANTRY'],
          isLeader: true
        },
        defender: testTarget,
        weapon: testWeapon,
        game: testGame,
        combatPhase: 'melee',
        options: {
          modelsFiring: 1,
          withinHalfRange: false,
          blastBonusAttacks: 0,
          unitHasCharged: false,
          unitRemainedStationary: false,
          userInputs: { 'unit-size': '10-14' }
        },
        rules: [waaaghEnergyRule],
        armyStates: []
      });

      const applied = evaluateRule(waaaghEnergyRule, context);
      expect(applied).toBe(true);

      const sMod = context.modifiers.get('S');
      const dMod = context.modifiers.get('D');
      expect(sMod).toBe(2);
      expect(dMod).toBe(2);

      // Check for HAZARDOUS weapon ability
      const abilityMod = context.modifiers.getModifiers('weaponAbility:hazardous');
      expect(abilityMod.length).toBeGreaterThan(0);
    });

    it('should apply +3 S/D and HAZARDOUS when 15+ models selected', () => {
      const context = buildCombatContext({
        attacker: {
          id: 'warboss',
          armyId: 'ork-army',
          categories: ['CHARACTER', 'INFANTRY'],
          isLeader: true
        },
        defender: testTarget,
        weapon: testWeapon,
        game: testGame,
        combatPhase: 'melee',
        options: {
          modelsFiring: 1,
          withinHalfRange: false,
          blastBonusAttacks: 0,
          unitHasCharged: false,
          unitRemainedStationary: false,
          userInputs: { 'unit-size': '15+' }
        },
        rules: [waaaghEnergyRule],
        armyStates: []
      });

      const applied = evaluateRule(waaaghEnergyRule, context);
      expect(applied).toBe(true);

      const sMod = context.modifiers.get('S');
      const dMod = context.modifiers.get('D');
      expect(sMod).toBe(3);
      expect(dMod).toBe(3);

      // Check for HAZARDOUS weapon ability
      const abilityMod = context.modifiers.getModifiers('weaponAbility:hazardous');
      expect(abilityMod.length).toBeGreaterThan(0);
    });
  });

  describe('Leader-only application', () => {
    it('should not apply to non-leader models', () => {
      const context = buildCombatContext({
        attacker: {
          id: 'boyz',
          armyId: 'ork-army',
          categories: ['INFANTRY'],
          isLeader: false
        },
        defender: testTarget,
        weapon: testWeapon,
        game: testGame,
        combatPhase: 'melee',
        options: {
          modelsFiring: 1,
          withinHalfRange: false,
          blastBonusAttacks: 0,
          unitHasCharged: false,
          unitRemainedStationary: false,
          userInputs: { 'unit-size': '10-14' }
        },
        rules: [waaaghEnergyRule],
        armyStates: []
      });

      const applied = evaluateRule(waaaghEnergyRule, context);
      expect(applied).toBe(false); // Rule doesn't apply (not a leader)

      const sMod = context.modifiers.get('S');
      const dMod = context.modifiers.get('D');
      expect(sMod).toBe(0);
      expect(dMod).toBe(0);
    });
  });
});
