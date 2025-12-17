/**
 * Integration test for Waaagh! Energy rule
 * Tests the complete flow from rule definition to combat calculation
 */

import { describe, it, expect } from 'vitest';
import { evaluateRule, checkCondition } from '../lib/rules-engine/evaluator';
import { buildCombatContext } from '../lib/rules-engine/context';
import { Rule } from '../lib/rules-engine/types';
import { WeaponStats, TargetStats, CombatOptions } from '../lib/combat-calculator-engine';

// Waaagh! Energy rule with current structure
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
  "effects": [
    // 5-9 models: +1 S
    {
      "type": "modify-characteristic",
      "target": "weapon",
      "params": {
        "stat": "S",
        "modifier": 1
      },
      "conditions": [
        {
          "type": "user-input",
          "params": {
            "inputId": "unit-size",
            "inputValue": "5-9"
          }
        }
      ]
    },
    // 5-9 models: +1 D
    {
      "type": "modify-characteristic",
      "target": "weapon",
      "params": {
        "stat": "D",
        "modifier": 1
      },
      "conditions": [
        {
          "type": "user-input",
          "params": {
            "inputId": "unit-size",
            "inputValue": "5-9"
          }
        }
      ]
    },
    // 10-14 models: +2 S
    {
      "type": "modify-characteristic",
      "target": "weapon",
      "params": {
        "stat": "S",
        "modifier": 2
      },
      "conditions": [
        {
          "type": "user-input",
          "params": {
            "inputId": "unit-size",
            "inputValue": "10-14"
          }
        }
      ]
    },
    // 10-14 models: +2 D
    {
      "type": "modify-characteristic",
      "target": "weapon",
      "params": {
        "stat": "D",
        "modifier": 2
      },
      "conditions": [
        {
          "type": "user-input",
          "params": {
            "inputId": "unit-size",
            "inputValue": "10-14"
          }
        }
      ]
    },
    // 10-14 models: HAZARDOUS
    {
      "type": "add-keyword",
      "target": "weapon",
      "params": {
        "keyword": "Hazardous"
      },
      "conditions": [
        {
          "type": "user-input",
          "params": {
            "inputId": "unit-size",
            "inputValue": "10-14"
          }
        }
      ]
    },
    // 20+ models: +4 S
    {
      "type": "modify-characteristic",
      "target": "weapon",
      "params": {
        "stat": "S",
        "modifier": 4
      },
      "conditions": [
        {
          "type": "user-input",
          "params": {
            "inputId": "unit-size",
            "inputValue": "20+"
          }
        }
      ]
    },
    // 20+ models: +4 D
    {
      "type": "modify-characteristic",
      "target": "weapon",
      "params": {
        "stat": "D",
        "modifier": 4
      },
      "conditions": [
        {
          "type": "user-input",
          "params": {
            "inputId": "unit-size",
            "inputValue": "20+"
          }
        }
      ]
    },
    // 20+ models: HAZARDOUS
    {
      "type": "add-keyword",
      "target": "weapon",
      "params": {
        "keyword": "Hazardous"
      },
      "conditions": [
        {
          "type": "user-input",
          "params": {
            "inputId": "unit-size",
            "inputValue": "20+"
          }
        }
      ]
    }
  ],
  "duration": {
    "type": "permanent"
  },
  "activation": {
    "phase": "any",
    "trigger": "automatic"
  },
  "userInput": {
    "type": "radio",
    "id": "unit-size",
    "label": "Unit size (models in led unit)",
    "defaultValue": "0-4",
    "options": [
      { "value": "0-4", "label": "0-4 models (+0)" },
      { "value": "5-9", "label": "5-9 models (+1 S/D)" },
      { "value": "10-14", "label": "10-14 models (+2 S/D, HAZARDOUS)" },
      { "value": "15-19", "label": "15-19 models (+3 S/D, HAZARDOUS)" },
      { "value": "20+", "label": "20+ models (+4 S/D, HAZARDOUS)" }
    ]
  }
};

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

  describe('Rule structure and userInput', () => {
    it('should have userInput field with radio type', () => {
      expect(waaaghEnergyRule.userInput).toBeDefined();
      expect(waaaghEnergyRule.userInput?.type).toBe('radio');
      expect(waaaghEnergyRule.userInput?.id).toBe('unit-size');
    });

    it('should have 5 options in userInput', () => {
      expect(waaaghEnergyRule.userInput?.options).toHaveLength(5);
      expect(waaaghEnergyRule.userInput?.options?.[0].value).toBe('0-4');
      expect(waaaghEnergyRule.userInput?.options?.[4].value).toBe('20+');
    });

    it('should have is-leading condition', () => {
      const hasIsLeading = waaaghEnergyRule.conditions.some(c => c.type === 'is-leading');
      expect(hasIsLeading).toBe(true);
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
