/**
 * Unit tests for scope-based rule filtering
 * Tests that scope: "model" rules stay with the model and scope: "unit" rules transfer
 */

import { describe, it, expect } from 'vitest';
import { getAllUnitRules } from '../load-rules';
import { Rule } from '../types';
import { evaluateRule } from '../evaluator';
import { buildCombatContext } from '../context';
import { getTestRule } from '../test-rules';

// Helper to create a ruleObject string from test-rules.json
const getRuleObject = (ruleName: string): string => {
  const rule = getTestRule(ruleName);
  if (!rule) throw new Error(`Rule ${ruleName} not found in test-rules.json`);
  return JSON.stringify(rule);
};
import { EXAMPLE_RULES } from '../test-rules';

describe('Scope-based rule filtering', () => {
  describe('When bodyguard unit (boys) attacks with attached leader (warboss)', () => {
    it('should apply scope: "unit" rules from leader to bodyguard unit', () => {
      // Mock data: Boys unit with attached Warboss leader
      const boysUnit = {
        id: 'boys-1',
        name: 'Ork Boyz',
        isLeader: false,
        unitRules: [],
        models: [
          {
            id: 'boy-model-1',
            modelRules: []
          }
        ],
        leaders: [
          {
            id: 'warboss-1',
            name: 'Warboss',
            isLeader: true,
            unitRules: [
              {
                name: 'Might is Right',
                ruleObject: getRuleObject('might-is-right')
              }
            ],
            models: [
              {
                id: 'warboss-model-1',
                modelRules: [
                  {
                    name: 'Da Biggest and da Best',
                    ruleObject: getRuleObject('da-biggest-and-da-best')
                  }
                ]
              }
            ]
          }
        ]
      };

      const rules = getAllUnitRules(boysUnit);
      const ruleIds = rules.map(r => r.id);

      // Boys should get "Might is Right" (scope: unit) from the Warboss
      expect(ruleIds).toContain('might-is-right-hit');

      // Boys should NOT get "Da Biggest and da Best" (scope: model) from the Warboss
      expect(ruleIds).not.toContain('da-biggest-and-da-best');
    });
  });

  describe('When leader (warboss) attacks alone', () => {
    it('should apply scope: "model" rules to the leader', () => {
      // Mock data: Warboss without attached bodyguards
      const warbossUnit = {
        id: 'warboss-1',
        name: 'Warboss',
        isLeader: true,
        unitRules: [
          {
            name: 'Might is Right',
            ruleObject: getRuleObject('might-is-right')
          }
        ],
        models: [
          {
            id: 'warboss-model-1',
            modelRules: [
              {
                name: 'Da Biggest and da Best',
                ruleObject: getRuleObject('da-biggest-and-da-best')
              }
            ]
          }
        ],
        leaders: [],
        bodyguardUnits: []
      };

      const rules = getAllUnitRules(warbossUnit);
      const ruleIds = rules.map(r => r.id);

      // Warboss should get both rules when attacking alone
      expect(ruleIds).toContain('might-is-right-hit');
      expect(ruleIds).toContain('da-biggest-and-da-best');
    });
  });

  describe('When bodyguard unit (boys) attacks with leader that has scope: "unit" model rule', () => {
    it('should apply scope: "unit" rules from leader model rules to bodyguard unit', () => {
      // Mock data: Boys unit with attached Warboss leader
      // Warboss has a model rule with scope: "unit" (should transfer to Boys)
      const boysUnit = {
        id: 'boys-1',
        name: 'Ork Boyz',
        isLeader: false,
        unitRules: [],
        models: [
          {
            id: 'boy-model-1',
            modelRules: []
          }
        ],
        leaders: [
          {
            id: 'warboss-1',
            name: 'Warboss',
            isLeader: true,
            unitRules: [],
            models: [
              {
                id: 'warboss-model-1',
                modelRules: [
                  {
                    name: 'Inspiring Presence',
                    ruleObject: getRuleObject('inspiring-presence')
                  }
                ]
              }
            ]
          }
        ]
      };

      const rules = getAllUnitRules(boysUnit);
      const ruleIds = rules.map(r => r.id);

      // Boys should get "Inspiring Presence" (scope: unit) from the Warboss model rules
      expect(ruleIds).toContain('inspiring-presence');
    });
  });

  describe('When leader (warboss) attacks while leading bodyguards', () => {
    it('should apply scope: "model" rules from leader and scope: "unit" rules from bodyguards', () => {
      // Mock data: Warboss leading Boys unit
      const warbossUnit = {
        id: 'warboss-1',
        name: 'Warboss',
        isLeader: true,
        unitRules: [
          {
            name: 'Might is Right',
            ruleObject: getRuleObject('might-is-right')
          }
        ],
        models: [
          {
            id: 'warboss-model-1',
            modelRules: [
              {
                name: 'Da Biggest and da Best',
                ruleObject: getRuleObject('da-biggest-and-da-best')
              }
            ]
          }
        ],
        leaders: [],
        bodyguardUnits: [
          {
            id: 'boys-1',
            name: 'Ork Boyz',
            unitRules: [
              {
                name: 'Mob Rule',
                ruleObject: getRuleObject('mob-rule')
              }
            ],
            models: [
              {
                id: 'boy-model-1',
                modelRules: [
                  {
                    name: 'Boy Specific Ability',
                    ruleObject: getRuleObject('boy-specific')
                  }
                ]
              }
            ]
          }
        ]
      };

      const rules = getAllUnitRules(warbossUnit);
      const ruleIds = rules.map(r => r.id);

      // Warboss should get its own unit and model rules
      expect(ruleIds).toContain('might-is-right-hit');
      expect(ruleIds).toContain('da-biggest-and-da-best');

      // Warboss should get scope: "unit" rules from bodyguards
      expect(ruleIds).toContain('mob-rule');

      // Warboss should NOT get scope: "model" rules from bodyguards
      expect(ruleIds).not.toContain('boy-specific');
    });
  });

  describe('When leader (warboss) attacks while leading bodyguards with scope: "unit" model rules', () => {
    it('should apply scope: "unit" rules from bodyguard model rules to leader', () => {
      // Mock data: Warboss leading Boys unit
      // Boys have a model rule with scope: "unit" (should transfer to Warboss)
      const warbossUnit = {
        id: 'warboss-1',
        name: 'Warboss',
        isLeader: true,
        unitRules: [],
        models: [
          {
            id: 'warboss-model-1',
            modelRules: []
          }
        ],
        leaders: [],
        bodyguardUnits: [
          {
            id: 'boys-1',
            name: 'Ork Boyz',
            unitRules: [],
            models: [
              {
                id: 'boy-model-1',
                modelRules: [
                  {
                    name: 'Mob Mentality',
                    ruleObject: getRuleObject('mob-mentality')
                  },
                  {
                    name: 'Boy Model Only',
                    ruleObject: getRuleObject('boy-model-only')
                  }
                ]
              }
            ]
          }
        ]
      };

      const rules = getAllUnitRules(warbossUnit);
      const ruleIds = rules.map(r => r.id);

      // Warboss should get "Mob Mentality" (scope: unit) from Boys model rules
      expect(ruleIds).toContain('mob-mentality');

      // Warboss should NOT get "Boy Model Only" (scope: model) from Boys
      expect(ruleIds).not.toContain('boy-model-only');
    });
  });

  describe('When leader has multiple rules in a single ruleObject array', () => {
    it('should apply all scope: "unit" rules from the array, even if mixed with scope: "model" rules', () => {
      // Mock data: Boys unit with attached Warboss leader
      // Warboss has a modelRule with MULTIPLE rules in an array (mixed scopes)
      const boysUnit = {
        id: 'boys-1',
        name: 'Ork Boyz',
        isLeader: false,
        unitRules: [],
        models: [
          {
            id: 'boy-model-1',
            modelRules: []
          }
        ],
        leaders: [
          {
            id: 'warboss-1',
            name: 'Warboss',
            isLeader: true,
            unitRules: [],
            models: [
              {
                id: 'warboss-model-1',
                modelRules: [
                  {
                    name: 'Mixed Rules Array',
                    ruleObject: JSON.stringify([
                      getTestRule('might-is-right'),
                      getTestRule('da-biggest-and-da-best'),
                      getTestRule('inspiring-aura')
                    ])
                  }
                ]
              }
            ]
          }
        ]
      };

      const rules = getAllUnitRules(boysUnit);
      const ruleIds = rules.map(r => r.id);

      // Boys should get BOTH scope: "unit" rules from the array
      expect(ruleIds).toContain('might-is-right-hit');
      expect(ruleIds).toContain('inspiring-aura');

      // Boys should NOT get the scope: "model" rule
      expect(ruleIds).not.toContain('da-biggest-and-da-best');
    });
  });

  describe('End-to-end: Rule evaluation with scope filtering', () => {
    it('should apply "Might is Right" (+1 to hit) when Boys attack with attached Warboss', () => {
      // Mock data: Boys unit with attached Warboss leader
      const boysUnit = {
        id: 'boys-1',
        name: 'Ork Boyz',
        isLeader: false,
        armyId: 'ork-army-1',
        unitRules: [],
        models: [
          {
            id: 'boy-model-1',
            modelRules: []
          }
        ],
        leaders: [
          {
            id: 'warboss-1',
            name: 'Warboss',
            isLeader: true,
            unitRules: [
              {
                name: 'Might is Right',
                ruleObject: getRuleObject('might-is-right')
              }
            ],
            models: [
              {
                id: 'warboss-model-1',
                modelRules: []
              }
            ]
          }
        ]
      };

      // Get rules for the Boys unit (should include "Might is Right" from Warboss)
      const rules = getAllUnitRules(boysUnit);
      const mightIsRight = rules.find(r => r.id === 'might-is-right-hit');

      // Verify the rule was loaded
      expect(mightIsRight).toBeDefined();
      expect(mightIsRight?.name).toBe('Might is Right');

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

      const defender = {
        id: 'target-1',
        name: 'Target Unit',
        armyId: 'enemy-army-1',
        categories: [],
        models: [
          {
            T: 4,
            SV: 3,
            INV: undefined
          }
        ]
      };

      // Build combat context
      const context = buildCombatContext({
        attacker: boysUnit,
        defender,
        weapon,
        game: {
          id: 'test-game',
          currentTurn: 1,
          currentPhase: 'fight'
        },
        combatPhase: 'melee',
        combatRole: 'attacker',
        options: {
          modelsFiring: 10,
          withinHalfRange: false,
          targetVisible: true,
          userInputs: {}
        },
        rules,
        armyStates: []
      });

      // Evaluate "Might is Right" rule
      const ruleApplied = evaluateRule(mightIsRight!, context);

      // Verify the rule was applied
      expect(ruleApplied).toBe(true);

      // Verify it added +1 to hit modifier
      const hitModifier = context.modifiers.get('hit');
      expect(hitModifier).toBe(1);
    });

    it('should apply "Super Runts" (-1 to wound defensively) when Gretchin with Zogrod leader are attacked', () => {
      // Get the Super Runts rule from example-rules.ts
      const superRuntsRule = EXAMPLE_RULES.find(r => r.id === 'super-runts');
      expect(superRuntsRule).toBeDefined();

      // Mock data: Gretchin unit with attached Zogrod leader
      const gretchinUnit = {
        id: 'gretchin-1',
        name: 'Gretchin',
        isLeader: false,
        armyId: 'ork-army-1',
        categories: ['INFANTRY'],
        unitRules: [],
        models: [
          {
            id: 'gretchin-model-1',
            modelRules: [],
            T: 3,
            SV: 6,
            INV: undefined
          }
        ],
        leaders: [
          {
            id: 'zogrod-1',
            name: 'Zogrod Wortsnagga',
            isLeader: true,
            categories: ['CHARACTER'],
            unitRules: [
              {
                name: 'Super Runts',
                ruleObject: JSON.stringify(superRuntsRule)
              }
            ],
            models: [
              {
                id: 'zogrod-model-1',
                modelRules: []
              }
            ]
          }
        ]
      };

      // Mock attacker (enemy shooting at Gretchin)
      const attacker = {
        id: 'enemy-unit-1',
        name: 'Enemy Unit',
        armyId: 'enemy-army-1',
        categories: ['INFANTRY'],
        models: [
          {
            T: 4,
            SV: 3
          }
        ]
      };

      const weapon = {
        name: 'Bolter',
        range: 24,
        A: '2',
        WS: 3,
        S: 4,
        AP: 0,
        D: '1',
        keywords: [],
        type: 'ranged' as const
      };

      // Get rules for the Gretchin unit (should include "Super Runts" from Zogrod)
      const rules = getAllUnitRules(gretchinUnit);
      const loadedSuperRunts = rules.find(r => r.id === 'super-runts');

      // Verify the rule was loaded
      expect(loadedSuperRunts).toBeDefined();
      expect(loadedSuperRunts?.name).toBe('Super Runts');

      // Build attacker context (attacker's perspective for wound roll)
      const attackerContext = buildCombatContext({
        attacker,
        defender: gretchinUnit,
        weapon,
        game: {
          id: 'test-game',
          currentTurn: 1,
          currentPhase: 'shooting'
        },
        combatPhase: 'shooting',
        combatRole: 'attacker', // Attacker's perspective
        options: {
          modelsFiring: 10,
          withinHalfRange: false,
          targetVisible: true,
          userInputs: {}
        },
        rules: [], // Attacker has no rules in this test
        armyStates: []
      });

      // Build defender context (Gretchin's defensive rules)
      const defenderContext = buildCombatContext({
        attacker,
        defender: gretchinUnit,
        weapon,
        game: {
          id: 'test-game',
          currentTurn: 1,
          currentPhase: 'shooting'
        },
        combatPhase: 'shooting',
        combatRole: 'defender', // Defender's perspective
        options: {
          modelsFiring: 10,
          withinHalfRange: false,
          targetVisible: true,
          userInputs: {}
        },
        rules, // Gretchin's rules including Super Runts from Zogrod
        armyStates: []
      });

      // Evaluate "Super Runts" rule in defender context
      const ruleApplied = evaluateRule(loadedSuperRunts!, defenderContext);

      // Verify the rule was applied
      expect(ruleApplied).toBe(true);

      // The defensive modifier should affect the ATTACKER's wound roll
      // So we need to check that the attacker gets a -1 to wound when attacking
      // In the actual combat calculator, defensive modifiers from defenderContext
      // are applied to the attacker's wound roll

      // For now, verify the modifier exists in defender context
      // TODO: Update combat calculator to merge defensive wound modifiers into attacker rolls
      const defenderWoundModifier = defenderContext.modifiers.get('wound');
      expect(defenderWoundModifier).toBe(-1);

      // The correct end-to-end test would be:
      // After merging contexts, attackerContext should have -1 to wound when attacking Gretchin
      // This will need to be implemented in the combat calculator
    });
  });
});
