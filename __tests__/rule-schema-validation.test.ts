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

// Collection of validated, working rule implementations
export const EXAMPLE_RULES: Rule[] = [
  // Example 1: Simple conditional damage boost with toggle
  {
    id: 'waaagh-energy',
    name: "Waaagh! Energy",
    description: "While this model is leading a unit, add 1 to the Strength and Damage characteristics of this model's 'Eadbanger weapon for every 5 models in that unit (rounding down), but while that unit contains 10 or more models, that weapon has the [HAZARDOUS] ability.",
    faction: 'Orks',
    scope: 'model',
    conditions: [
      {
        type: 'is-leading',
        params: {}
      }
    ],
    effects: [], // All effects are in userInput options
    userInput: {
      type: 'radio',
      id: 'unit-size',
      label: 'Unit size (models in led unit)',
      defaultValue: '0-4',
      options: [
        {
          value: '0-4',
          label: '0-4 models (+0)',
          effects: []
        },
        {
          value: '5-9',
          label: '5-9 models (+1 S/D)',
          effects: [
            {
              type: 'modify-characteristic',
              target: 'weapon',
              params: { stat: 'S', modifier: 1 },
              appliesTo: 'leader'
            },
            {
              type: 'modify-characteristic',
              target: 'weapon',
              params: { stat: 'D', modifier: 1 },
              appliesTo: 'leader'
            }
          ]
        },
        {
          value: '10-14',
          label: '10-14 models (+2 S/D, HAZARDOUS)',
          effects: [
            {
              type: 'modify-characteristic',
              target: 'weapon',
              params: { stat: 'S', modifier: 2 },
              appliesTo: 'leader'
            },
            {
              type: 'modify-characteristic',
              target: 'weapon',
              params: { stat: 'D', modifier: 2 },
              appliesTo: 'leader'
            },
            {
              type: 'add-keyword',
              target: 'weapon',
              params: { keyword: 'Hazardous' },
              appliesTo: 'leader'
            }
          ]
        },
        {
          value: '15-19',
          label: '15-19 models (+3 S/D, HAZARDOUS)',
          effects: [
            {
              type: 'modify-characteristic',
              target: 'weapon',
              params: { stat: 'S', modifier: 3 },
              appliesTo: 'leader'
            },
            {
              type: 'modify-characteristic',
              target: 'weapon',
              params: { stat: 'D', modifier: 3 },
              appliesTo: 'leader'
            },
            {
              type: 'add-keyword',
              target: 'weapon',
              params: { keyword: 'Hazardous' },
              appliesTo: 'leader'
            }
          ]
        },
        {
          value: '20+',
          label: '20+ models (+4 S/D, HAZARDOUS)',
          effects: [
            {
              type: 'modify-characteristic',
              target: 'weapon',
              params: { stat: 'S', modifier: 4 },
              appliesTo: 'leader'
            },
            {
              type: 'modify-characteristic',
              target: 'weapon',
              params: { stat: 'D', modifier: 4 },
              appliesTo: 'leader'
            },
            {
              type: 'add-keyword',
              target: 'weapon',
              params: { keyword: 'Hazardous' },
              appliesTo: 'leader'
            }
          ]
        }
      ]
    },
    duration: 'permanent',
    activation: {
      type: 'automatic',
      phase: 'any'
    }
  },

  // Example 2: Simple toggle-based ability
  {
    id: 'drive-by-dakka',
    name: 'Drive-by Dakka',
    description: 'Each time this model makes a ranged attack, if it Advanced this turn, improve the Armour Penetration characteristic of that attack by 1.',
    faction: 'Orks',
    scope: 'model',
    conditions: [
      {
        type: 'weapon-type',
        params: { weaponTypes: ['ranged'] }
      }
    ],
    effects: [],
    userInput: {
      type: 'toggle',
      id: 'advanced-this-turn',
      label: 'Advanced this turn?',
      defaultValue: false,
      options: [
        {
          value: false,
          label: 'No',
          effects: []
        },
        {
          value: true,
          label: 'Yes',
          effects: [
            {
              type: 'modify-characteristic',
              target: 'weapon',
              params: { stat: 'AP', modifier: -1 }
            }
          ]
        }
      ]
    },
    duration: 'turn',
    activation: {
      type: 'automatic',
      phase: 'any'
    }
  },

  // Example 3: Conditional hit modifier
  {
    id: 'dakka-dakka-dakka',
    name: 'Dakka Dakka Dakka',
    description: 'Each time a model in this unit makes a ranged attack, an unmodified hit roll of 6 automatically wounds the target.',
    faction: 'Orks',
    scope: 'unit',
    conditions: [
      {
        type: 'weapon-type',
        params: { weaponTypes: ['ranged'] }
      }
    ],
    effects: [
      {
        type: 'add-keyword',
        target: 'weapon',
        params: { keyword: 'Lethal Hits' }
      }
    ],
    duration: 'permanent',
    activation: {
      type: 'automatic',
      phase: 'shooting'
    }
  },

  // Example 4: Target-category dependent ability
  {
    id: 'tank-hunter',
    name: 'Tank Hunter',
    description: 'Each time this model makes a ranged attack that targets a VEHICLE unit, re-roll a Wound roll of 1.',
    faction: 'Space Marines',
    scope: 'model',
    conditions: [
      {
        type: 'weapon-type',
        params: { weaponTypes: ['ranged'] }
      },
      {
        type: 'target-category',
        params: { categories: ['VEHICLE'] }
      }
    ],
    effects: [
      {
        type: 'reroll',
        target: 'weapon',
        params: {
          rerollPhase: 'wound',
          rerollType: 'ones'
        }
      }
    ],
    duration: 'permanent',
    activation: {
      type: 'automatic',
      phase: 'shooting'
    }
  },

  // Example 5: Simple stat modifier without user input
  {
    id: 'furious-charge',
    name: 'Furious Charge',
    description: 'Each time this unit makes a Charge move, until the end of the turn, add 1 to the Strength characteristic of melee weapons equipped by models in this unit.',
    faction: 'Orks',
    scope: 'unit',
    conditions: [
      {
        type: 'weapon-type',
        params: { weaponTypes: ['melee'] }
      },
      {
        type: 'unit-status',
        params: { statuses: ['charged'] }
      }
    ],
    effects: [
      {
        type: 'modify-characteristic',
        target: 'weapon',
        params: { stat: 'S', modifier: 1 }
      }
    ],
    duration: 'turn',
    activation: {
      type: 'automatic',
      phase: 'charge'
    }
  },

  // Example 6: Multiple effects with effect-level conditions and appliesTo
  {
    id: 'super-runts',
    name: 'Super Runts',
    description: "While this model is leading a unit: Models in that unit have the Scouts 9\" ability. Each time a model in that unit makes an attack, add 1 to the Hit roll and add 1 to the Wound roll. Each time an attack targets that unit, subtract 1 from the Wound roll.",
    faction: 'Orks',
    scope: 'unit',
    conditions: [
      {
        type: 'is-leading',
        params: {}
      }
    ],
    effects: [
      {
        type: 'add-keyword',
        target: 'unit',
        params: {
          keyword: 'Scouts',
          keywordValue: 9
        },
        appliesTo: 'bodyguard'
      },
      {
        type: 'modify-hit',
        target: 'self',
        params: {
          modifier: 1
        },
        appliesTo: 'bodyguard',
        conditions: [
          {
            type: 'combat-role',
            params: {
              role: 'attacker'
            }
          }
        ]
      },
      {
        type: 'modify-wound',
        target: 'self',
        params: {
          modifier: 1
        },
        appliesTo: 'bodyguard',
        conditions: [
          {
            type: 'combat-role',
            params: {
              role: 'attacker'
            }
          }
        ]
      },
      {
        type: 'modify-wound',
        target: 'self',
        params: {
          modifier: -1
        },
        appliesTo: 'bodyguard',
        conditions: [
          {
            type: 'combat-role',
            params: {
              role: 'defender'
            }
          }
        ]
      }
    ],
    duration: 'permanent',
    activation: {
      type: 'automatic',
      phase: 'any'
    }
  },

  // Example 7: Reminder-only rule with no effects (just tracking)
  {
    id: 'bomb-squigs',
    name: 'Bomb Squigs',
    description: "Once per battle, for each bomb squig this unit has, after this unit ends a Normal move, you can use one Bomb Squig. If you do, select one enemy unit within 12\" and visible to this unit and roll one D6: on a 3+, that enemy unit suffers D3 mortal wounds. **Designer's Note:** Place two Bomb Squig tokens next to the unit, removing one each time this unit uses this ability.",
    faction: 'Orks',
    scope: 'unit',
    conditions: [],
    effects: [],
    duration: 'permanent',
    activation: {
      type: 'manual',
      phase: 'movement',
      turn: 'own',
      limit: 'once-per-battle'
    }
  },

  // Example 8: Multi-outcome radio with different stat modifications
  {
    id: 'shooty-power-trip',
    name: 'Shooty Power Trip',
    description: 'Each time this unit is selected to shoot, you can roll one D6: On a 1-2, this unit suffers D3 mortal wounds. On a 3-4, until the end of the phase, add 1 to the Strength characteristic of ranged weapons equipped by models in this unit. On a 5-6, until the end of the phase, add 1 to the Attacks characteristic of ranged weapons equipped by models in this unit.',
    faction: 'Orks',
    scope: 'unit',
    conditions: [
      {
        type: 'weapon-type',
        params: { weaponTypes: ['ranged'] }
      }
    ],
    effects: [],
    userInput: {
      type: 'radio',
      id: 'power-trip-roll',
      label: 'D6 Roll Result',
      defaultValue: 'no-roll',
      options: [
        {
          value: 'no-roll',
          label: 'Not activated',
          effects: []
        },
        {
          value: '1-2',
          label: '1-2 (D3 mortal wounds)',
          effects: []  // Mortal wounds not implemented in combat calculator
        },
        {
          value: '3-4',
          label: '3-4 (+1 Strength)',
          effects: [
            {
              type: 'modify-characteristic',
              target: 'weapon',
              params: { stat: 'S', modifier: 1 }
            }
          ]
        },
        {
          value: '5-6',
          label: '5-6 (+1 Attacks)',
          effects: [
            {
              type: 'modify-characteristic',
              target: 'weapon',
              params: { stat: 'A', modifier: 1 }
            }
          ]
        }
      ]
    },
    duration: 'phase',
    activation: {
      type: 'manual',
      phase: 'shooting',
      turn: 'own'
    }
  }
];

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

  describe('AppliesTo Field', () => {
    it('effects with appliesTo should have valid values', () => {
      EXAMPLE_RULES.forEach(rule => {
        const allEffects = [
          ...rule.effects,
          ...(rule.userInput?.options?.flatMap(opt => opt.effects || []) || [])
        ];

        allEffects.forEach(effect => {
          if (effect.appliesTo) {
            expect(['all', 'leader', 'bodyguard']).toContain(effect.appliesTo);
          }
        });
      });
    });

    it('should have examples with bodyguard-only effects', () => {
      const hasBodyguardEffects = EXAMPLE_RULES.some(rule => {
        const allEffects = [
          ...rule.effects,
          ...(rule.userInput?.options?.flatMap(opt => opt.effects || []) || [])
        ];
        return allEffects.some(effect => effect.appliesTo === 'bodyguard');
      });
      expect(hasBodyguardEffects).toBe(true);
    });

    it('should have examples with leader-only effects', () => {
      const hasLeaderEffects = EXAMPLE_RULES.some(rule => {
        const allEffects = [
          ...rule.effects,
          ...(rule.userInput?.options?.flatMap(opt => opt.effects || []) || [])
        ];
        return allEffects.some(effect => effect.appliesTo === 'leader');
      });
      expect(hasLeaderEffects).toBe(true);
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
});
