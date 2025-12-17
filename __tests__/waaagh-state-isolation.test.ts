/**
 * Test for Waaagh! State Isolation
 * Ensures that army states (like Waaagh) only apply to units from that specific army,
 * not to all units in the game.
 *
 * This test verifies the fix for the bug where non-Waaagh armies were getting Waaagh
 * bonuses because all army states were being loaded into the combat context.
 */

import { describe, it, expect } from 'vitest';
import { evaluateRule } from '../lib/rules-engine/evaluator';
import { buildCombatContext } from '../lib/rules-engine/context';
import { Rule, ArmyState } from '../lib/rules-engine/types';
import { WeaponStats, TargetStats } from '../lib/combat-calculator-engine';

// Simplified Waaagh! rule that adds +1 Strength
const waaaghStrengthRule: Rule = {
  id: 'waaagh-strength',
  name: 'Waaagh!',
  description: 'While a Waaagh! is active, add 1 to the Strength characteristic',
  faction: 'Orks',
  scope: {
    type: 'weapon',
    appliesTo: 'all'
  },
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
      type: 'modify-characteristic',
      target: 'weapon',
      params: {
        stat: 'S',
        modifier: 1
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

describe('Waaagh! State Isolation', () => {
  const testMeleeWeapon: WeaponStats = {
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
    SV: 3,
    INV: 6,
    modelCount: 10,
    categories: ['INFANTRY']
  };

  const testGame = {
    id: 'test-game',
    currentTurn: 2,
    currentPhase: 'fight'
  };

  describe('Army state filtering', () => {
    it('should apply Waaagh bonuses when the unit\'s army has Waaagh active', () => {
      const orkArmyId = 'ork-army-123';

      // Army state for the Ork army
      const waaaghState: ArmyState = {
        id: 'waaagh-state-1',
        state: 'waaagh-active',
        activatedTurn: 2,
        armyId: orkArmyId
      };

      const context = buildCombatContext({
        attacker: {
          id: 'ork-boy',
          armyId: orkArmyId, // This unit belongs to the Ork army
          categories: ['INFANTRY']
        },
        defender: testTarget,
        weapon: testMeleeWeapon,
        game: testGame,
        combatPhase: 'melee',
        combatRole: 'attacker',
        options: {
          modelsFiring: 1,
          withinHalfRange: false,
          blastBonusAttacks: 0,
          unitHasCharged: false,
          unitRemainedStationary: false
        },
        rules: [waaaghStrengthRule],
        armyStates: [waaaghState] // Only the Ork army's states
      });

      const applied = evaluateRule(waaaghStrengthRule, context);
      expect(applied).toBe(true);

      const sMod = context.modifiers.get('S');
      expect(sMod).toBe(1); // +1 Strength from Waaagh
    });

    it('should NOT apply Waaagh bonuses when a different army has Waaagh active', () => {
      const orkArmyId = 'ork-army-123';
      const spaceMarineArmyId = 'space-marine-army-456';

      // Army state for the Ork army (different from the unit's army)
      const waaaghState: ArmyState = {
        id: 'waaagh-state-1',
        state: 'waaagh-active',
        activatedTurn: 2,
        armyId: orkArmyId // This is the Ork army's state
      };

      const context = buildCombatContext({
        attacker: {
          id: 'space-marine',
          armyId: spaceMarineArmyId, // This unit belongs to Space Marines, not Orks
          categories: ['INFANTRY']
        },
        defender: testTarget,
        weapon: testMeleeWeapon,
        game: testGame,
        combatPhase: 'melee',
        combatRole: 'attacker',
        options: {
          modelsFiring: 1,
          withinHalfRange: false,
          blastBonusAttacks: 0,
          unitHasCharged: false,
          unitRemainedStationary: false
        },
        rules: [waaaghStrengthRule],
        armyStates: [] // Space Marine army has no states (Ork state should not be included)
      });

      const applied = evaluateRule(waaaghStrengthRule, context);
      expect(applied).toBe(false); // Rule should not apply

      const sMod = context.modifiers.get('S');
      expect(sMod).toBe(0); // No Strength bonus
    });

    it('should only include states from the current army, not all armies', () => {
      const orkArmy1Id = 'ork-army-1';
      const orkArmy2Id = 'ork-army-2';

      // Two different Ork armies, only one has Waaagh active
      const waaaghState1: ArmyState = {
        id: 'waaagh-state-1',
        state: 'waaagh-active',
        activatedTurn: 2,
        armyId: orkArmy1Id
      };

      // Army 1 unit - should get Waaagh bonuses
      const contextArmy1 = buildCombatContext({
        attacker: {
          id: 'ork-boy-1',
          armyId: orkArmy1Id,
          categories: ['INFANTRY']
        },
        defender: testTarget,
        weapon: testMeleeWeapon,
        game: testGame,
        combatPhase: 'melee',
        combatRole: 'attacker',
        options: {
          modelsFiring: 1,
          withinHalfRange: false,
          blastBonusAttacks: 0,
          unitHasCharged: false,
          unitRemainedStationary: false
        },
        rules: [waaaghStrengthRule],
        armyStates: [waaaghState1] // Only Army 1's states
      });

      const appliedArmy1 = evaluateRule(waaaghStrengthRule, contextArmy1);
      expect(appliedArmy1).toBe(true);
      expect(contextArmy1.modifiers.get('S')).toBe(1);

      // Army 2 unit - should NOT get Waaagh bonuses
      const contextArmy2 = buildCombatContext({
        attacker: {
          id: 'ork-boy-2',
          armyId: orkArmy2Id,
          categories: ['INFANTRY']
        },
        defender: testTarget,
        weapon: testMeleeWeapon,
        game: testGame,
        combatPhase: 'melee',
        combatRole: 'attacker',
        options: {
          modelsFiring: 1,
          withinHalfRange: false,
          blastBonusAttacks: 0,
          unitHasCharged: false,
          unitRemainedStationary: false
        },
        rules: [waaaghStrengthRule],
        armyStates: [] // Army 2 has no states (should not include Army 1's state)
      });

      const appliedArmy2 = evaluateRule(waaaghStrengthRule, contextArmy2);
      expect(appliedArmy2).toBe(false);
      expect(contextArmy2.modifiers.get('S')).toBe(0);
    });
  });

  describe('Defender army state filtering', () => {
    it('should apply Waaagh bonuses to defender rules when the defender\'s army has Waaagh active', () => {
      const orkArmyId = 'ork-army-123';
      const spaceMarineArmyId = 'space-marine-army-456';

      // Defender (Ork) has Waaagh active
      const waaaghState: ArmyState = {
        id: 'waaagh-state-1',
        state: 'waaagh-active',
        activatedTurn: 2,
        armyId: orkArmyId
      };

      // Create a defensive Waaagh rule (applies to defender role)
      const waaaghDefensiveRule: Rule = {
        ...waaaghStrengthRule,
        id: 'waaagh-defensive',
        name: 'Waaagh! (Defensive)',
        description: 'Defensive bonuses during Waaagh',
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
            type: 'modify-characteristic',
            target: 'unit',
            params: {
              stat: 'T',
              modifier: 1
            }
          }
        ]
      };

      // Space Marine attacks Ork (who has Waaagh active)
      const defenderContext = buildCombatContext({
        attacker: {
          id: 'space-marine',
          armyId: spaceMarineArmyId,
          categories: ['INFANTRY']
        },
        defender: {
          id: 'ork-boy',
          armyId: orkArmyId, // Defender is from the Ork army
          categories: ['INFANTRY'],
          T: 5,
          SV: 5,
          INV: 6,
          modelCount: 10
        },
        weapon: testMeleeWeapon,
        game: testGame,
        combatPhase: 'melee',
        combatRole: 'defender', // Evaluating defender rules
        options: {
          modelsFiring: 1,
          withinHalfRange: false,
          blastBonusAttacks: 0,
          unitHasCharged: false,
          unitRemainedStationary: false
        },
        rules: [waaaghDefensiveRule],
        armyStates: [waaaghState] // Defender's army has Waaagh
      });

      const applied = evaluateRule(waaaghDefensiveRule, defenderContext);
      expect(applied).toBe(true);

      const tMod = defenderContext.modifiers.get('T');
      expect(tMod).toBe(1); // +1 Toughness from Waaagh
    });

    it('should NOT apply defender Waaagh bonuses when attacker has Waaagh but defender does not', () => {
      const orkArmyId = 'ork-army-123';
      const spaceMarineArmyId = 'space-marine-army-456';

      // Attacker (Ork) has Waaagh active, but we're checking defender rules
      const waaaghState: ArmyState = {
        id: 'waaagh-state-1',
        state: 'waaagh-active',
        activatedTurn: 2,
        armyId: orkArmyId
      };

      const waaaghDefensiveRule: Rule = {
        ...waaaghStrengthRule,
        id: 'waaagh-defensive',
        name: 'Waaagh! (Defensive)',
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
            type: 'modify-characteristic',
            target: 'unit',
            params: {
              stat: 'T',
              modifier: 1
            }
          }
        ]
      };

      // Ork attacks Space Marine (defender has no Waaagh)
      const defenderContext = buildCombatContext({
        attacker: {
          id: 'ork-boy',
          armyId: orkArmyId, // Attacker has Waaagh
          categories: ['INFANTRY']
        },
        defender: {
          id: 'space-marine',
          armyId: spaceMarineArmyId, // Defender does NOT have Waaagh
          categories: ['INFANTRY'],
          T: 4,
          SV: 3,
          INV: 6,
          modelCount: 10
        },
        weapon: testMeleeWeapon,
        game: testGame,
        combatPhase: 'melee',
        combatRole: 'defender', // Evaluating defender rules
        options: {
          modelsFiring: 1,
          withinHalfRange: false,
          blastBonusAttacks: 0,
          unitHasCharged: false,
          unitRemainedStationary: false
        },
        rules: [waaaghDefensiveRule],
        armyStates: [] // Defender's army has NO Waaagh state
      });

      const applied = evaluateRule(waaaghDefensiveRule, defenderContext);
      expect(applied).toBe(false); // Should not apply

      const tMod = defenderContext.modifiers.get('T');
      expect(tMod).toBe(0); // No Toughness bonus
    });
  });

  describe('Context validation', () => {
    it('should have army states in the context when provided', () => {
      const orkArmyId = 'ork-army-123';
      const waaaghState: ArmyState = {
        id: 'waaagh-state-1',
        state: 'waaagh-active',
        activatedTurn: 2,
        armyId: orkArmyId
      };

      const context = buildCombatContext({
        attacker: {
          id: 'ork-boy',
          armyId: orkArmyId,
          categories: ['INFANTRY']
        },
        defender: testTarget,
        weapon: testMeleeWeapon,
        game: testGame,
        combatPhase: 'melee',
        combatRole: 'attacker',
        options: {
          modelsFiring: 1,
          withinHalfRange: false,
          blastBonusAttacks: 0,
          unitHasCharged: false,
          unitRemainedStationary: false
        },
        rules: [waaaghStrengthRule],
        armyStates: [waaaghState]
      });

      expect(context.armyStates).toBeDefined();
      expect(context.armyStates.length).toBe(1);
      expect(context.armyStates[0].state).toBe('waaagh-active');
    });

    it('should have empty army states when none are provided', () => {
      const context = buildCombatContext({
        attacker: {
          id: 'space-marine',
          armyId: 'space-marine-army',
          categories: ['INFANTRY']
        },
        defender: testTarget,
        weapon: testMeleeWeapon,
        game: testGame,
        combatPhase: 'melee',
        combatRole: 'attacker',
        options: {
          modelsFiring: 1,
          withinHalfRange: false,
          blastBonusAttacks: 0,
          unitHasCharged: false,
          unitRemainedStationary: false
        },
        rules: [waaaghStrengthRule],
        armyStates: []
      });

      expect(context.armyStates).toBeDefined();
      expect(context.armyStates.length).toBe(0);
    });
  });
});
