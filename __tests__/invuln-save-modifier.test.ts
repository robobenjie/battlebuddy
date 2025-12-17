/**
 * Test for invulnerable save modifiers from rules
 * Verifies that INV modifiers are correctly applied using 'set' operation
 */

import { describe, it, expect } from 'vitest';
import { evaluateRule } from '../lib/rules-engine/evaluator';
import { buildCombatContext } from '../lib/rules-engine/context';
import { Rule, ArmyState } from '../lib/rules-engine/types';
import { WeaponStats, TargetStats } from '../lib/combat-calculator-engine';

// Waaagh invuln save rule
const waaaghInvulnRule: Rule = {
  id: 'waaagh-invuln-save',
  name: 'Waaagh! - Invulnerable Save',
  description: 'While the Waaagh! is active, models from your army have a 5+ invulnerable save.',
  faction: 'Orks',
  scope: 'army',
  conditions: [
    {
      type: 'army-state',
      params: {
        armyStates: ['waaagh-active']
      }
    }
  ],
  effects: [
    {
      type: 'add-keyword',
      target: 'unit',
      params: {
        keyword: 'Invulnerable Save',
        keywordValue: 5
      }
    }
  ],
  duration: {
    type: 'permanent'
  },
  activation: {
    phase: 'any',
    trigger: 'automatic'
  }
};

describe('Invulnerable Save Modifiers', () => {
  const testWeapon: WeaponStats = {
    name: 'Choppa',
    range: 0,
    A: '3',
    WS: 3,
    S: 5,
    AP: 0,
    D: '1',
    keywords: []
  };

  const testTarget: TargetStats = {
    T: 4,
    SV: 5,
    INV: undefined,
    modelCount: 10,
    categories: ['INFANTRY']
  };

  const testGame = {
    id: 'test-game',
    currentTurn: 2,
    currentPhase: 'fight'
  };

  describe('Waaagh invuln save rule', () => {
    it('should add INV modifier with "set" operation when Waaagh is active', () => {
      const orkArmyId = 'ork-army-123';
      const waaaghState: ArmyState = {
        id: 'waaagh-state-1',
        state: 'waaagh-active',
        activatedTurn: 2,
        armyId: orkArmyId
      };

      const context = buildCombatContext({
        attacker: {
          id: 'space-marine',
          armyId: 'space-marine-army',
          categories: ['INFANTRY']
        },
        defender: {
          id: 'ork-boy',
          armyId: orkArmyId,
          categories: ['INFANTRY'],
          T: 5,
          SV: 5,
          INV: undefined,
          modelCount: 10
        },
        weapon: testWeapon,
        game: testGame,
        combatPhase: 'melee',
        combatRole: 'defender',
        options: {
          modelsFiring: 1,
          withinHalfRange: false,
          blastBonusAttacks: 0,
          unitHasCharged: false,
          unitRemainedStationary: false
        },
        rules: [waaaghInvulnRule],
        armyStates: [waaaghState]
      });

      const applied = evaluateRule(waaaghInvulnRule, context);
      expect(applied).toBe(true);

      // Check that the keyword modifier was added
      const invModifiers = context.modifiers.getModifiers('keyword:Invulnerable Save');
      expect(invModifiers.length).toBe(1);
      expect(invModifiers[0].value).toBe(5);

      // Check that we can extract the value
      const invValue = invModifiers.length > 0
        ? Math.min(...invModifiers.map(m => m.value))
        : undefined;
      expect(invValue).toBe(5);
    });

    it('should not apply when Waaagh is not active', () => {
      const context = buildCombatContext({
        attacker: {
          id: 'space-marine',
          armyId: 'space-marine-army',
          categories: ['INFANTRY']
        },
        defender: {
          id: 'ork-boy',
          armyId: 'ork-army',
          categories: ['INFANTRY'],
          T: 5,
          SV: 5,
          INV: undefined,
          modelCount: 10
        },
        weapon: testWeapon,
        game: testGame,
        combatPhase: 'melee',
        combatRole: 'defender',
        options: {
          modelsFiring: 1,
          withinHalfRange: false,
          blastBonusAttacks: 0,
          unitHasCharged: false,
          unitRemainedStationary: false
        },
        rules: [waaaghInvulnRule],
        armyStates: [] // No Waaagh
      });

      const applied = evaluateRule(waaaghInvulnRule, context);
      expect(applied).toBe(false);

      const invModifiers = context.modifiers.getModifiers('keyword:Invulnerable Save');
      expect(invModifiers.length).toBe(0);
    });
  });

  describe('INV modifier extraction', () => {
    it('should correctly extract INV using apply() method', () => {
      const orkArmyId = 'ork-army-123';
      const waaaghState: ArmyState = {
        id: 'waaagh-state-1',
        state: 'waaagh-active',
        activatedTurn: 2,
        armyId: orkArmyId
      };

      const context = buildCombatContext({
        attacker: {
          id: 'space-marine',
          armyId: 'space-marine-army',
          categories: ['INFANTRY']
        },
        defender: {
          id: 'ork-boy',
          armyId: orkArmyId,
          categories: ['INFANTRY'],
          T: 5,
          SV: 5,
          INV: undefined,
          modelCount: 10
        },
        weapon: testWeapon,
        game: testGame,
        combatPhase: 'melee',
        combatRole: 'defender',
        options: {
          modelsFiring: 1,
          withinHalfRange: false,
          blastBonusAttacks: 0,
          unitHasCharged: false,
          unitRemainedStationary: false
        },
        rules: [waaaghInvulnRule],
        armyStates: [waaaghState]
      });

      evaluateRule(waaaghInvulnRule, context);

      // Extract using the same method as CombatCalculatorPage
      const invulnKeywords = context.modifiers.getModifiers('keyword:Invulnerable Save');
      const invMod = invulnKeywords.length > 0
        ? Math.min(...invulnKeywords.map(m => m.value))
        : undefined;

      expect(invulnKeywords.length).toBeGreaterThan(0);
      expect(invMod).toBe(5);
    });

    it('should handle units that already have an invuln', () => {
      const orkArmyId = 'ork-army-123';
      const waaaghState: ArmyState = {
        id: 'waaagh-state-1',
        state: 'waaagh-active',
        activatedTurn: 2,
        armyId: orkArmyId
      };

      const context = buildCombatContext({
        attacker: {
          id: 'space-marine',
          armyId: 'space-marine-army',
          categories: ['INFANTRY']
        },
        defender: {
          id: 'ork-warboss',
          armyId: orkArmyId,
          categories: ['INFANTRY', 'CHARACTER'],
          T: 6,
          SV: 4,
          INV: 4, // Already has 4+ invuln
          modelCount: 1
        },
        weapon: testWeapon,
        game: testGame,
        combatPhase: 'melee',
        combatRole: 'defender',
        options: {
          modelsFiring: 1,
          withinHalfRange: false,
          blastBonusAttacks: 0,
          unitHasCharged: false,
          unitRemainedStationary: false
        },
        rules: [waaaghInvulnRule],
        armyStates: [waaaghState]
      });

      evaluateRule(waaaghInvulnRule, context);

      // Extract modifier
      const invulnKeywords = context.modifiers.getModifiers('keyword:Invulnerable Save');
      const invMod = invulnKeywords.length > 0
        ? Math.min(...invulnKeywords.map(m => m.value))
        : undefined;

      expect(invulnKeywords.length).toBeGreaterThan(0);
      expect(invMod).toBe(5); // Waaagh sets to 5+

      // In actual combat calculation, we should use the better (lower) of the two
      const baseInv = 4;
      const finalInv = invMod !== undefined ? Math.min(baseInv, invMod) : baseInv;
      expect(finalInv).toBe(4); // Keep the better 4+ invuln
    });
  });
});
