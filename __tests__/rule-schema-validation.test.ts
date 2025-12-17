/**
 * Rule Schema Validation Tests
 *
 * This test file serves as:
 * 1. A collection of working rule examples
 * 2. Schema validation for all rules
 * 3. Documentation for rule structure
 * 4. Reference for AI-powered rule implementation
 *
 * All examples use the NEW schema with effects embedded in userInput options.
 */

import { describe, it, expect } from 'vitest';
import { Rule, RuleEffect, RuleCondition } from '../lib/rules-engine/types';
import { RuleSchema, validateRule, parseRule } from '../lib/rules-engine/rule-schema';
import { EXAMPLE_RULES } from '../lib/rules-engine/example-rules';

describe('Rule Schema Validation', () => {
  describe('Required Fields', () => {
    EXAMPLE_RULES.forEach(rule => {
      describe(`Rule: ${rule.name}`, () => {
        it('should have all required top-level fields', () => {
          expect(rule).toHaveProperty('id');
          expect(rule).toHaveProperty('name');
          expect(rule).toHaveProperty('description');
          expect(rule).toHaveProperty('scope');
          expect(rule).toHaveProperty('conditions');
          expect(rule).toHaveProperty('effects');
          expect(rule).toHaveProperty('duration');

          expect(typeof rule.id).toBe('string');
          expect(typeof rule.name).toBe('string');
          expect(typeof rule.description).toBe('string');
          expect(typeof rule.scope).toBe('string');
          expect(Array.isArray(rule.conditions)).toBe(true);
          expect(Array.isArray(rule.effects)).toBe(true);
          expect(typeof rule.duration).toBe('string');
        });

        it('should have valid scope', () => {
          const validScopes = ['weapon', 'unit', 'model', 'detachment', 'army'];
          expect(validScopes).toContain(rule.scope);
        });

        it('should have valid duration', () => {
          const validDurations = ['permanent', 'turn', 'phase', 'until-deactivated'];
          expect(validDurations).toContain(rule.duration);
        });

        if (rule.activation) {
          it('should have valid activation type', () => {
            expect(rule.activation.type).toBeDefined();
            expect(['manual', 'automatic']).toContain(rule.activation.type);
          });
        }
      });
    });
  });

  describe('Conditions Structure', () => {
    EXAMPLE_RULES.forEach(rule => {
      if (rule.conditions.length > 0) {
        describe(`Rule: ${rule.name}`, () => {
          rule.conditions.forEach((condition, index) => {
            it(`condition ${index} should have valid type`, () => {
              const validTypes = [
                'target-category',
                'weapon-type',
                'range',
                'unit-status',
                'army-state',
                'is-leading',
                'being-led',
                'combat-phase',
                'combat-role',
                'user-input'
              ];
              expect(validTypes).toContain(condition.type);
            });

            it(`condition ${index} should have params object`, () => {
              expect(condition.params).toBeDefined();
              expect(typeof condition.params).toBe('object');
            });
          });
        });
      }
    });
  });

  describe('Effects Structure', () => {
    EXAMPLE_RULES.forEach(rule => {
      // Skip rules with no effects to test (neither main effects nor userInput)
      if (rule.effects.length > 0 || rule.userInput) {
        describe(`Rule: ${rule.name}`, () => {
          // Check main effects array
          rule.effects.forEach((effect, index) => {
          it(`main effect ${index} should have valid type`, () => {
            const validTypes = [
              'modify-hit',
              'modify-wound',
              'modify-characteristic',
              'add-keyword',
              'grant-ability',
              'modify-save',
              'reroll',
              'auto-success'
            ];
            expect(validTypes).toContain(effect.type);
          });

          it(`main effect ${index} should have valid target`, () => {
            expect(['self', 'weapon', 'unit', 'enemy']).toContain(effect.target);
          });

          it(`main effect ${index} should have params object`, () => {
            expect(effect.params).toBeDefined();
            expect(typeof effect.params).toBe('object');
          });
        });

        // Check userInput effects (NEW SCHEMA)
        if (rule.userInput) {
          it('userInput should have valid structure', () => {
            expect(rule.userInput.type).toBeDefined();
            expect(['toggle', 'radio', 'select']).toContain(rule.userInput.type);
            expect(rule.userInput.id).toBeDefined();
            expect(typeof rule.userInput.id).toBe('string');
            expect(rule.userInput.label).toBeDefined();
            expect(typeof rule.userInput.label).toBe('string');
          });

          it('userInput options should contain effects', () => {
            expect(rule.userInput.options).toBeDefined();
            expect(Array.isArray(rule.userInput.options)).toBe(true);
            expect(rule.userInput.options!.length).toBeGreaterThanOrEqual(2);

            rule.userInput.options!.forEach((option, optIndex) => {
              expect(option.value).toBeDefined();
              expect(option.label).toBeDefined();
              expect(typeof option.label).toBe('string');
              expect(option.effects).toBeDefined();
              expect(Array.isArray(option.effects)).toBe(true);

              // Validate effects within options
              option.effects!.forEach((effect, effIndex) => {
                const validTypes = [
                  'modify-hit',
                  'modify-wound',
                  'modify-characteristic',
                  'add-keyword',
                  'grant-ability',
                  'modify-save',
                  'reroll',
                  'auto-success'
                ];
                expect(validTypes).toContain(effect.type);
                expect(['self', 'weapon', 'unit', 'enemy']).toContain(effect.target);
                expect(effect.params).toBeDefined();
              });
            });
          });
        }
      });
      }
    });
  });

  describe('NEW Schema Compliance', () => {
    it('all rules with userInput should use NEW schema (effects in options)', () => {
      const rulesWithUserInput = EXAMPLE_RULES.filter(r => r.userInput);

      rulesWithUserInput.forEach(rule => {
        // NEW schema: effects should be in userInput.options[].effects
        expect(rule.userInput!.options).toBeDefined();
        const hasEffectsInOptions = rule.userInput!.options!.some(opt =>
          opt.effects && opt.effects.length > 0
        );

        // At least one option should have effects (or explicitly have empty effects)
        expect(rule.userInput!.options!.every(opt => opt.effects !== undefined)).toBe(true);
      });
    });

    it('should not use OLD schema (user-input conditions in effects)', () => {
      EXAMPLE_RULES.forEach(rule => {
        // Collect all effects (main and userInput options)
        const allEffects = [
          ...rule.effects,
          ...(rule.userInput?.options?.flatMap(opt => opt.effects || []) || [])
        ];

        // NEW schema: Effects can have conditions, but NOT user-input type conditions
        // Effect-level conditions (like combat-role) are valid
        allEffects.forEach(effect => {
          if (effect.conditions) {
            const hasUserInputCondition = effect.conditions.some(
              (cond: RuleCondition) => cond.type === 'user-input'
            );
            expect(hasUserInputCondition).toBe(false);
          }
        });
      });
    });
  });

  describe('Semantic Validation', () => {
    EXAMPLE_RULES.forEach(rule => {
      describe(`Rule: ${rule.name}`, () => {
        it('modify-characteristic effects should have valid stat', () => {
          const allEffects = [
            ...rule.effects,
            ...(rule.userInput?.options?.flatMap(opt => opt.effects || []) || [])
          ];

          allEffects
            .filter(e => e.type === 'modify-characteristic')
            .forEach(effect => {
              const validStats = ['WS', 'S', 'A', 'AP', 'D', 'T', 'SV', 'INV'];
              expect(effect.params.stat).toBeDefined();
              expect(validStats).toContain(effect.params.stat);
              expect(typeof effect.params.modifier).toBe('number');
            });
        });

        it('add-keyword effects should have keyword param', () => {
          const allEffects = [
            ...rule.effects,
            ...(rule.userInput?.options?.flatMap(opt => opt.effects || []) || [])
          ];

          allEffects
            .filter(e => e.type === 'add-keyword')
            .forEach(effect => {
              expect(effect.params.keyword).toBeDefined();
              expect(typeof effect.params.keyword).toBe('string');
            });
        });

        it('reroll effects should have valid reroll params', () => {
          const allEffects = [
            ...rule.effects,
            ...(rule.userInput?.options?.flatMap(opt => opt.effects || []) || [])
          ];

          allEffects
            .filter(e => e.type === 'reroll')
            .forEach(effect => {
              expect(['all', 'failed', 'ones']).toContain(effect.params.rerollType);
              expect(['hit', 'wound', 'damage']).toContain(effect.params.rerollPhase);
            });
        });
      });
    });
  });

  describe('Effect-Level Conditions', () => {
    it('effects with conditions should have valid condition structure', () => {
      EXAMPLE_RULES.forEach(rule => {
        const allEffects = [
          ...rule.effects,
          ...(rule.userInput?.options?.flatMap(opt => opt.effects || []) || [])
        ];

        allEffects.forEach(effect => {
          if (effect.conditions) {
            expect(Array.isArray(effect.conditions)).toBe(true);
            effect.conditions.forEach((condition: RuleCondition) => {
              expect(condition.type).toBeDefined();
              expect(condition.params).toBeDefined();
            });
          }
        });
      });
    });

    it('should have example with effect-level combat-role condition', () => {
      const hasEffectLevelCombatRole = EXAMPLE_RULES.some(rule => {
        const allEffects = [
          ...rule.effects,
          ...(rule.userInput?.options?.flatMap(opt => opt.effects || []) || [])
        ];
        return allEffects.some(effect =>
          effect.conditions?.some((c: RuleCondition) => c.type === 'combat-role')
        );
      });
      expect(hasEffectLevelCombatRole).toBe(true);
    });
  });

  describe('Activation Limits', () => {
    it('activation limits should be valid', () => {
      EXAMPLE_RULES.forEach(rule => {
        if (rule.activation?.limit) {
          expect(['once-per-battle', 'once-per-turn', 'unlimited']).toContain(
            rule.activation.limit
          );
        }
      });
    });

    it('should have example with once-per-battle limit', () => {
      const hasOnceBattle = EXAMPLE_RULES.some(
        r => r.activation?.limit === 'once-per-battle'
      );
      expect(hasOnceBattle).toBe(true);
    });

    it('activation turn should be valid', () => {
      EXAMPLE_RULES.forEach(rule => {
        if (rule.activation?.turn) {
          expect(['own', 'opponent', 'both']).toContain(rule.activation.turn);
        }
      });
    });
  });

  describe('Reminder Rules', () => {
    it('should allow rules with empty effects (reminder-only)', () => {
      const reminderRules = EXAMPLE_RULES.filter(
        r => r.effects.length === 0 && (!r.userInput || r.userInput.options?.every(opt => opt.effects?.length === 0))
      );
      expect(reminderRules.length).toBeGreaterThan(0);
    });

    it('reminder rules should still have valid structure', () => {
      const reminderRules = EXAMPLE_RULES.filter(r => r.effects.length === 0);
      reminderRules.forEach(rule => {
        expect(rule.id).toBeDefined();
        expect(rule.name).toBeDefined();
        expect(rule.description).toBeDefined();
        expect(rule.scope).toBeDefined();
        expect(Array.isArray(rule.effects)).toBe(true);
      });
    });
  });

  describe('Example Coverage', () => {
    it('should have examples of all major condition types', () => {
      const allConditions = EXAMPLE_RULES.flatMap(r => r.conditions);
      const conditionTypes = new Set(allConditions.map(c => c.type));

      // Core condition types that should have examples
      expect(conditionTypes).toContain('weapon-type');
      expect(conditionTypes).toContain('is-leading');
      expect(conditionTypes).toContain('target-category');
      expect(conditionTypes).toContain('unit-status');
    });

    it('should have examples of all major effect types', () => {
      const allEffects = EXAMPLE_RULES.flatMap(rule => [
        ...rule.effects,
        ...(rule.userInput?.options?.flatMap(opt => opt.effects || []) || [])
      ]);
      const effectTypes = new Set(allEffects.map(e => e.type));

      // Core effect types that should have examples
      expect(effectTypes).toContain('modify-characteristic');
      expect(effectTypes).toContain('add-keyword');
      expect(effectTypes).toContain('reroll');
      expect(effectTypes).toContain('modify-hit');
      expect(effectTypes).toContain('modify-wound');
    });

    it('should have examples with and without userInput', () => {
      const withUserInput = EXAMPLE_RULES.filter(r => r.userInput);
      const withoutUserInput = EXAMPLE_RULES.filter(r => !r.userInput);

      expect(withUserInput.length).toBeGreaterThan(0);
      expect(withoutUserInput.length).toBeGreaterThan(0);
    });

    it('should have examples of toggle and radio userInput types', () => {
      const inputTypes = new Set(
        EXAMPLE_RULES
          .filter(r => r.userInput)
          .map(r => r.userInput!.type)
      );

      expect(inputTypes).toContain('toggle');
      expect(inputTypes).toContain('radio');
    });

    it('should have examples with multiple effects in one rule', () => {
      const multiEffectRules = EXAMPLE_RULES.filter(r => r.effects.length > 1);
      expect(multiEffectRules.length).toBeGreaterThan(0);
    });

    it('should have examples with empty effects (reminder rules)', () => {
      const emptyEffectsRules = EXAMPLE_RULES.filter(r => r.effects.length === 0);
      expect(emptyEffectsRules.length).toBeGreaterThan(0);
    });
  });

  describe('Zod Schema Validation', () => {
    describe('Individual Rule Validation', () => {
      EXAMPLE_RULES.forEach(rule => {
        it(`should validate ${rule.name} against Zod schema`, () => {
          const result = validateRule(rule);

          // If validation failed, log the error for debugging
          if (!result.success) {
            console.error(`Validation failed for ${rule.name}:`, result.error?.format());
          }

          expect(result.success).toBe(true);
          expect(result.data).toBeDefined();
        });
      });
    });

    it('should validate all example rules without throwing', () => {
      // Test that parseRule doesn't throw for any example
      expect(() => {
        EXAMPLE_RULES.forEach(rule => parseRule(rule));
      }).not.toThrow();
    });

    it('should reject invalid rules', () => {
      const invalidRule = {
        id: 'test',
        name: 'Test Rule',
        description: 'Test',
        scope: 'invalid-scope', // Invalid scope
        conditions: [],
        effects: [],
        duration: 'permanent'
      };

      const result = validateRule(invalidRule);
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should reject rules with invalid effect types', () => {
      const invalidRule = {
        id: 'test',
        name: 'Test Rule',
        description: 'Test',
        scope: 'unit',
        conditions: [],
        effects: [
          {
            type: 'invalid-type', // Invalid effect type
            target: 'weapon',
            params: {}
          }
        ],
        duration: 'permanent'
      };

      const result = validateRule(invalidRule);
      expect(result.success).toBe(false);
    });

    it('should reject rules with invalid condition types', () => {
      const invalidRule = {
        id: 'test',
        name: 'Test Rule',
        description: 'Test',
        scope: 'unit',
        conditions: [
          {
            type: 'invalid-condition', // Invalid condition type
            params: {}
          }
        ],
        effects: [],
        duration: 'permanent'
      };

      const result = validateRule(invalidRule);
      expect(result.success).toBe(false);
    });

    it('should validate rules with nested userInput effects', () => {
      const ruleWithUserInput = EXAMPLE_RULES.find(r => r.userInput);
      expect(ruleWithUserInput).toBeDefined();

      const result = validateRule(ruleWithUserInput!);
      expect(result.success).toBe(true);
    });

    it('should validate rules with effect-level conditions', () => {
      const ruleWithEffectConditions = EXAMPLE_RULES.find(r =>
        r.effects.some(e => e.conditions && e.conditions.length > 0)
      );
      expect(ruleWithEffectConditions).toBeDefined();

      const result = validateRule(ruleWithEffectConditions!);
      expect(result.success).toBe(true);
    });

    it('Zod schema should be compatible with TypeScript Rule type', () => {
      // This test ensures that Zod schema and TypeScript types are aligned
      // If this test passes, it means the schema is compatible
      EXAMPLE_RULES.forEach(rule => {
        const parsed = parseRule(rule);

        // Check that parsed data has the same structure
        expect(parsed.id).toBe(rule.id);
        expect(parsed.name).toBe(rule.name);
        expect(parsed.scope).toBe(rule.scope);
        expect(parsed.duration).toBe(rule.duration);
      });
    });
  });
});
