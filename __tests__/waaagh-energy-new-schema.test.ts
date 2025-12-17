/**
 * Integration test for Waaagh! Energy rule with IMPROVED schema
 * Effects are embedded directly in userInput options
 */

import { describe, it, expect } from 'vitest';
import { evaluateRule } from '../lib/rules-engine/evaluator';
import { buildCombatContext } from '../lib/rules-engine/context';
import { Rule } from '../lib/rules-engine/types';
import { WeaponStats, TargetStats } from '../lib/combat-calculator-engine';

// Waaagh! Energy rule with NEW IMPROVED structure
const waaaghEnergyRule: Rule = {
  "id": "waaagh-energy",
  "name": "Waaagh! Energy",
  "description": "While this model is leading a unit, add 1 to the Strength and Damage characteristics of this model's 'Eadbanger weapon for every 5 models in that unit (rounding down), but while that unit contains 10 or more models, that weapon has the [HAZARDOUS] ability.",
  "faction": "Orks",
  "scope": "model",
  "conditions": [
    {
      "type": "is-leading",
      "params": {}
    }
  ],
  "effects": [], // Effects are now in userInput options
  "userInput": {
    "type": "radio",
    "id": "unit-size",
    "label": "Unit size (models in led unit)",
    "defaultValue": "0-4",
    "options": [
      {
        "value": "0-4",
        "label": "0-4 models (+0)",
        "effects": []
      },
      {
        "value": "5-9",
        "label": "5-9 models (+1 S/D)",
        "effects": [
          {
            "type": "modify-characteristic",
            "target": "weapon",
            "params": { "stat": "S", "modifier": 1 }
          },
          {
            "type": "modify-characteristic",
            "target": "weapon",
            "params": { "stat": "D", "modifier": 1 }
          }
        ]
      },
      {
        "value": "10-14",
        "label": "10-14 models (+2 S/D, HAZARDOUS)",
        "effects": [
          {
            "type": "modify-characteristic",
            "target": "weapon",
            "params": { "stat": "S", "modifier": 2 }
          },
          {
            "type": "modify-characteristic",
            "target": "weapon",
            "params": { "stat": "D", "modifier": 2 },
          },
          {
            "type": "add-keyword",
            "target": "weapon",
            "params": { "keyword": "Hazardous" },
          }
        ]
      },
      {
        "value": "15-19",
        "label": "15-19 models (+3 S/D, HAZARDOUS)",
        "effects": [
          {
            "type": "modify-characteristic",
            "target": "weapon",
            "params": { "stat": "S", "modifier": 3 },
          },
          {
            "type": "modify-characteristic",
            "target": "weapon",
            "params": { "stat": "D", "modifier": 3 },
          },
          {
            "type": "add-keyword",
            "target": "weapon",
            "params": { "keyword": "Hazardous" },
          }
        ]
      },
      {
        "value": "20+",
        "label": "20+ models (+4 S/D, HAZARDOUS)",
        "effects": [
          {
            "type": "modify-characteristic",
            "target": "weapon",
            "params": { "stat": "S", "modifier": 4 },
          },
          {
            "type": "modify-characteristic",
            "target": "weapon",
            "params": { "stat": "D", "modifier": 4 },
          },
          {
            "type": "add-keyword",
            "target": "weapon",
            "params": { "keyword": "Hazardous" },
          }
        ]
      }
    ]
  },
  "duration": {
    "type": "permanent"
  },
  "activation": {
    "phase": "any",
    "trigger": "automatic"
  }
};

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
    it('should have userInput with options containing effects', () => {
      expect(waaaghEnergyRule.userInput).toBeDefined();
      expect(waaaghEnergyRule.userInput?.options).toBeDefined();

      // Check that options have effects arrays
      const option5_9 = waaaghEnergyRule.userInput?.options?.find(o => o.value === '5-9');
      expect(option5_9?.effects).toBeDefined();
      expect(option5_9?.effects).toHaveLength(2); // +1 S and +1 D
    });

    it('should have empty main effects array', () => {
      // Effects are now in userInput options, not at the top level
      expect(waaaghEnergyRule.effects).toEqual([]);
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

      // Check for HAZARDOUS keyword
      const keywordMod = context.modifiers.getModifiers('keyword:Hazardous');
      expect(keywordMod.length).toBeGreaterThan(0);
    });

    it('should apply +4 S/D and HAZARDOUS when 20+ models selected', () => {
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
          userInputs: { 'unit-size': '20+' }
        },
        rules: [waaaghEnergyRule],
        armyStates: []
      });

      const applied = evaluateRule(waaaghEnergyRule, context);
      expect(applied).toBe(true);

      const sMod = context.modifiers.get('S');
      const dMod = context.modifiers.get('D');
      expect(sMod).toBe(4);
      expect(dMod).toBe(4);

      // Check for HAZARDOUS keyword
      const keywordMod = context.modifiers.getModifiers('keyword:Hazardous');
      expect(keywordMod.length).toBeGreaterThan(0);
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
