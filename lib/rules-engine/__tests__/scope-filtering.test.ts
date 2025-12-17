/**
 * Unit tests for scope-based rule filtering
 * Tests that scope: "model" rules stay with the model and scope: "unit" rules transfer
 */

import { describe, it, expect } from 'vitest';
import { getAllUnitRules } from '../load-rules';
import { Rule } from '../types';

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
                ruleObject: JSON.stringify({
                  id: 'might-is-right',
                  name: 'Might is Right',
                  scope: 'unit',
                  conditions: [],
                  effects: [
                    {
                      type: 'modify-hit',
                      params: { modifier: 1 }
                    }
                  ]
                })
              }
            ],
            models: [
              {
                id: 'warboss-model-1',
                modelRules: [
                  {
                    name: 'Da Biggest and da Best',
                    ruleObject: JSON.stringify({
                      id: 'da-biggest-and-da-best',
                      name: 'Da Biggest and da Best',
                      scope: 'model',
                      conditions: [],
                      effects: [
                        {
                          type: 'modify-characteristic',
                          params: { stat: 'A', modifier: 4 }
                        }
                      ]
                    })
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
      expect(ruleIds).toContain('might-is-right');

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
            ruleObject: JSON.stringify({
              id: 'might-is-right',
              name: 'Might is Right',
              scope: 'unit',
              conditions: [],
              effects: [
                {
                  type: 'modify-hit',
                  params: { modifier: 1 }
                }
              ]
            })
          }
        ],
        models: [
          {
            id: 'warboss-model-1',
            modelRules: [
              {
                name: 'Da Biggest and da Best',
                ruleObject: JSON.stringify({
                  id: 'da-biggest-and-da-best',
                  name: 'Da Biggest and da Best',
                  scope: 'model',
                  conditions: [],
                  effects: [
                    {
                      type: 'modify-characteristic',
                      params: { stat: 'A', modifier: 4 }
                    }
                  ]
                })
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
      expect(ruleIds).toContain('might-is-right');
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
                    ruleObject: JSON.stringify({
                      id: 'inspiring-presence',
                      name: 'Inspiring Presence',
                      scope: 'unit', // Unit-level rule attached to model
                      conditions: [],
                      effects: [
                        {
                          type: 'modify-wound',
                          params: { modifier: 1 }
                        }
                      ]
                    })
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
            ruleObject: JSON.stringify({
              id: 'might-is-right',
              name: 'Might is Right',
              scope: 'unit',
              conditions: [],
              effects: [
                {
                  type: 'modify-hit',
                  params: { modifier: 1 }
                }
              ]
            })
          }
        ],
        models: [
          {
            id: 'warboss-model-1',
            modelRules: [
              {
                name: 'Da Biggest and da Best',
                ruleObject: JSON.stringify({
                  id: 'da-biggest-and-da-best',
                  name: 'Da Biggest and da Best',
                  scope: 'model',
                  conditions: [],
                  effects: [
                    {
                      type: 'modify-characteristic',
                      params: { stat: 'A', modifier: 4 }
                    }
                  ]
                })
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
                ruleObject: JSON.stringify({
                  id: 'mob-rule',
                  name: 'Mob Rule',
                  scope: 'unit',
                  conditions: [],
                  effects: [
                    {
                      type: 'modify-wound',
                      params: { modifier: 1 }
                    }
                  ]
                })
              }
            ],
            models: [
              {
                id: 'boy-model-1',
                modelRules: [
                  {
                    name: 'Boy Specific Ability',
                    ruleObject: JSON.stringify({
                      id: 'boy-specific',
                      name: 'Boy Specific Ability',
                      scope: 'model',
                      conditions: [],
                      effects: []
                    })
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
      expect(ruleIds).toContain('might-is-right');
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
                    ruleObject: JSON.stringify({
                      id: 'mob-mentality',
                      name: 'Mob Mentality',
                      scope: 'unit', // Unit-level rule attached to boy model
                      conditions: [],
                      effects: [
                        {
                          type: 'modify-hit',
                          params: { modifier: 1 }
                        }
                      ]
                    })
                  },
                  {
                    name: 'Boy Model Only',
                    ruleObject: JSON.stringify({
                      id: 'boy-model-only',
                      name: 'Boy Model Only',
                      scope: 'model', // Model-level rule
                      conditions: [],
                      effects: []
                    })
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
                      {
                        id: 'might-is-right',
                        name: 'Might is Right',
                        scope: 'unit',
                        conditions: [],
                        effects: [
                          {
                            type: 'modify-hit',
                            params: { modifier: 1 }
                          }
                        ]
                      },
                      {
                        id: 'da-biggest-and-da-best',
                        name: 'Da Biggest and da Best',
                        scope: 'model',
                        conditions: [],
                        effects: [
                          {
                            type: 'modify-characteristic',
                            params: { stat: 'A', modifier: 4 }
                          }
                        ]
                      },
                      {
                        id: 'inspiring-aura',
                        name: 'Inspiring Aura',
                        scope: 'unit',
                        conditions: [],
                        effects: [
                          {
                            type: 'modify-wound',
                            params: { modifier: 1 }
                          }
                        ]
                      }
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
      expect(ruleIds).toContain('might-is-right');
      expect(ruleIds).toContain('inspiring-aura');

      // Boys should NOT get the scope: "model" rule
      expect(ruleIds).not.toContain('da-biggest-and-da-best');
    });
  });
});
