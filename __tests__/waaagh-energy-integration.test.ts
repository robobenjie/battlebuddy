/**
 * Integration test for Waaagh! Energy rule
 * Tests the complete flow from rule definition to combat calculation
 */

import { describe, it, expect } from 'vitest';
import { evaluateRule } from '../lib/rules-engine/evaluator';
import { buildCombatContext } from '../lib/rules-engine/context';
import { Rule } from '../lib/rules-engine/types';
import { WeaponStats, TargetStats, CombatOptions } from '../lib/combat-calculator-engine';
import { getTestRule } from '../lib/rules-engine/test-rules';

// Waaagh! Energy rule from test-rules.json
const waaaghEnergyRule: Rule = getTestRule('waaagh-energy')!;

describe('Waaagh! Energy Integration (Current Structure)', () => {
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

  describe('Rule structure', () => {
    it('should be a choice rule with unit-size options', () => {
      expect(waaaghEnergyRule.kind).toBe('choice');
      expect(waaaghEnergyRule.choice).toBeDefined();
      expect(waaaghEnergyRule.choice?.id).toBe('unit-size');
    });

    it('should have 4 options', () => {
      expect(waaaghEnergyRule.choice?.options).toHaveLength(4);
      expect(waaaghEnergyRule.choice?.options?.[0].v).toBe('0-4');
      expect(waaaghEnergyRule.choice?.options?.[3].v).toBe('15+');
    });

    it('should have isLeading condition', () => {
      expect(waaaghEnergyRule.when).toBeDefined();
      // Check for isLeading in the when clause
      const whenStr = JSON.stringify(waaaghEnergyRule.when);
      expect(whenStr).toContain('isLeading');
    });
  });

  describe('Effect application based on user input', () => {
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

      // But no modifiers should be added (0-4 has no effects)
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
