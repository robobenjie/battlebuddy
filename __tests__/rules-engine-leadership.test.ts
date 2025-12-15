/**
 * Tests for leadership conditions (is-leading, being-led)
 */

import { describe, it, expect } from 'vitest';
import { checkCondition } from '../lib/rules-engine/evaluator';
import { CombatContext } from '../lib/rules-engine/context';
import { RuleCondition } from '../lib/rules-engine/types';
import { ModifierStack } from '../lib/rules-engine/modifier-stack';

// Helper to create a minimal combat context for testing
function createTestContext(overrides: Partial<CombatContext> = {}): CombatContext {
  return {
    attacker: {
      unitId: 'test-unit',
      armyId: 'test-army',
      categories: [],
      isLeader: false,
      leaderId: undefined,
    },
    defender: {
      unitId: 'target-unit',
      armyId: 'enemy-army',
      categories: [],
      modelCount: 10,
      T: 4,
      SV: 3,
      INV: undefined,
    },
    weapon: {
      name: 'Test Weapon',
      range: 24,
      A: '2',
      WS: 3,
      S: 4,
      AP: 0,
      D: '1',
      keywords: []
    },
    game: {
      id: 'test-game',
      currentTurn: 1,
      currentPhase: 'shooting'
    },
    combatPhase: 'shooting',
    combatRole: 'attacker',
    activeRules: [],
    armyStates: [],
    userInputs: {},
    modifiers: new ModifierStack(),
    modelsFiring: 1,
    withinHalfRange: false,
    blastBonusAttacks: 0,
    unitHasCharged: false,
    unitRemainedStationary: false,
    ...overrides
  };
}

describe('Leadership Conditions', () => {
  describe('is-leading condition', () => {
    it('should return true when attacker is a leader (CHARACTER)', () => {
      const condition: RuleCondition = {
        type: 'is-leading',
        params: {}
      };

      const context = createTestContext({
        attacker: {
          unitId: 'leader-unit',
          armyId: 'test-army',
          categories: ['CHARACTER', 'INFANTRY'],
          isLeader: true, // This unit IS a leader
          leaderId: undefined
        }
      });

      const result = checkCondition(condition, context);
      expect(result).toBe(true);
    });

    it('should return false when attacker is not a leader', () => {
      const condition: RuleCondition = {
        type: 'is-leading',
        params: {}
      };

      const context = createTestContext({
        attacker: {
          unitId: 'regular-unit',
          armyId: 'test-army',
          categories: ['INFANTRY'],
          isLeader: false, // This unit is NOT a leader
          leaderId: undefined
        }
      });

      const result = checkCondition(condition, context);
      expect(result).toBe(false);
    });

    it('should return false when attacker is being led (has leaderId)', () => {
      const condition: RuleCondition = {
        type: 'is-leading',
        params: {}
      };

      const context = createTestContext({
        attacker: {
          unitId: 'bodyguard-unit',
          armyId: 'test-army',
          categories: ['INFANTRY'],
          isLeader: false, // This unit is not a leader
          leaderId: 'some-leader-id' // But it HAS a leader
        }
      });

      const result = checkCondition(condition, context);
      expect(result).toBe(false);
    });
  });

  describe('being-led condition', () => {
    it('should return true when attacker has a leader', () => {
      const condition: RuleCondition = {
        type: 'being-led',
        params: {}
      };

      const context = createTestContext({
        attacker: {
          unitId: 'bodyguard-unit',
          armyId: 'test-army',
          categories: ['INFANTRY'],
          isLeader: false,
          leaderId: 'some-leader-id' // This unit HAS a leader
        }
      });

      const result = checkCondition(condition, context);
      expect(result).toBe(true);
    });

    it('should return false when attacker has no leader', () => {
      const condition: RuleCondition = {
        type: 'being-led',
        params: {}
      };

      const context = createTestContext({
        attacker: {
          unitId: 'regular-unit',
          armyId: 'test-army',
          categories: ['INFANTRY'],
          isLeader: false,
          leaderId: undefined // No leader
        }
      });

      const result = checkCondition(condition, context);
      expect(result).toBe(false);
    });

    it('should return false when attacker is a leader themselves', () => {
      const condition: RuleCondition = {
        type: 'being-led',
        params: {}
      };

      const context = createTestContext({
        attacker: {
          unitId: 'leader-unit',
          armyId: 'test-army',
          categories: ['CHARACTER'],
          isLeader: true, // This is a leader
          leaderId: undefined // Leaders don't have leaders
        }
      });

      const result = checkCondition(condition, context);
      expect(result).toBe(false);
    });
  });

  describe('Leader ability application (Waaagh! Energy scenario)', () => {
    it('should allow leader-only effects to apply when is-leading is true', () => {
      // Simulate a CHARACTER model with Waaagh! Energy ability
      const isLeadingCondition: RuleCondition = {
        type: 'is-leading',
        params: {}
      };

      const context = createTestContext({
        attacker: {
          unitId: 'warboss',
          armyId: 'ork-army',
          categories: ['CHARACTER', 'INFANTRY', 'GRENADES'],
          isLeader: true,
          leaderId: undefined
        }
      });

      // The is-leading condition should pass
      const canApplyAbility = checkCondition(isLeadingCondition, context);
      expect(canApplyAbility).toBe(true);
    });

    it('should prevent leader-only effects when is-leading is false', () => {
      // Simulate a regular model trying to use Waaagh! Energy
      const isLeadingCondition: RuleCondition = {
        type: 'is-leading',
        params: {}
      };

      const context = createTestContext({
        attacker: {
          unitId: 'boyz',
          armyId: 'ork-army',
          categories: ['INFANTRY', 'GRENADES'],
          isLeader: false, // Not a CHARACTER
          leaderId: 'warboss-id' // Being led by a warboss
        }
      });

      // The is-leading condition should fail
      const canApplyAbility = checkCondition(isLeadingCondition, context);
      expect(canApplyAbility).toBe(false);
    });
  });
});
