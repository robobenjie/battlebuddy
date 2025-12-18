/**
 * Tests for leadership conditions (isLeading)
 */

import { describe, it, expect } from 'vitest';
import { evaluateWhen } from '../lib/rules-engine/evaluator';
import { buildCombatContext } from '../lib/rules-engine/context';
import { WeaponStats, TargetStats } from '../lib/combat-calculator-engine';

const testWeapon: WeaponStats = {
  name: 'Test Weapon',
  range: 24,
  A: '2',
  WS: 3,
  S: 4,
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
  currentTurn: 1,
  currentPhase: 'shooting'
};

describe('Leadership Conditions', () => {
  describe('isLeading condition', () => {
    it('should return true when attacker is a leader (isLeader: true)', () => {
      const when = { t: 'isLeading' as const };

      const context = buildCombatContext({
        attacker: {
          id: 'leader-unit',
          armyId: 'test-army',
          categories: ['CHARACTER', 'INFANTRY'],
          isLeader: true // This unit IS a leader
        },
        defender: testTarget,
        weapon: testWeapon,
        game: testGame,
        combatPhase: 'shooting',
        combatRole: 'attacker',
        options: {
          modelsFiring: 1,
          withinHalfRange: false,
          blastBonusAttacks: 0,
          unitHasCharged: false,
          unitRemainedStationary: false
        },
        rules: [],
        armyStates: []
      });

      const result = evaluateWhen(when, context);
      expect(result).toBe(true);
    });

    it('should return false when attacker is not a leader', () => {
      const when = { t: 'isLeading' as const };

      const context = buildCombatContext({
        attacker: {
          id: 'regular-unit',
          armyId: 'test-army',
          categories: ['INFANTRY'],
          isLeader: false // This unit is NOT a leader
        },
        defender: testTarget,
        weapon: testWeapon,
        game: testGame,
        combatPhase: 'shooting',
        combatRole: 'attacker',
        options: {
          modelsFiring: 1,
          withinHalfRange: false,
          blastBonusAttacks: 0,
          unitHasCharged: false,
          unitRemainedStationary: false
        },
        rules: [],
        armyStates: []
      });

      const result = evaluateWhen(when, context);
      expect(result).toBe(false);
    });

    it('should check defender when combatRole is defender', () => {
      const when = { t: 'isLeading' as const };

      const context = buildCombatContext({
        attacker: {
          id: 'enemy-unit',
          armyId: 'enemy-army',
          categories: ['INFANTRY']
        },
        defender: {
          id: 'defending-leader',
          armyId: 'test-army',
          categories: ['CHARACTER', 'INFANTRY'],
          isLeader: true, // Defender IS a leader
          T: 4,
          SV: 3,
          INV: 6,
          modelCount: 1
        },
        weapon: testWeapon,
        game: testGame,
        combatPhase: 'melee',
        combatRole: 'defender', // Checking defender's leadership
        options: {
          modelsFiring: 1,
          withinHalfRange: false,
          blastBonusAttacks: 0,
          unitHasCharged: false,
          unitRemainedStationary: false
        },
        rules: [],
        armyStates: []
      });

      const result = evaluateWhen(when, context);
      expect(result).toBe(true);
    });
  });

  describe('Leader ability application (integration test)', () => {
    it('should allow leader-only effects to apply when isLeading is true', () => {
      // This simulates a rule like "While this model is leading a unit, add 1 to hit"
      const leaderCondition = { t: 'isLeading' as const };

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
        combatPhase: 'shooting',
        combatRole: 'attacker',
        options: {
          modelsFiring: 1,
          withinHalfRange: false,
          blastBonusAttacks: 0,
          unitHasCharged: false,
          unitRemainedStationary: false
        },
        rules: [],
        armyStates: []
      });

      const shouldApply = evaluateWhen(leaderCondition, context);
      expect(shouldApply).toBe(true);
    });

    it('should prevent leader-only effects when isLeading is false', () => {
      const leaderCondition = { t: 'isLeading' as const };

      const context = buildCombatContext({
        attacker: {
          id: 'ork-boy',
          armyId: 'ork-army',
          categories: ['INFANTRY'],
          isLeader: false // Regular unit, not a leader
        },
        defender: testTarget,
        weapon: testWeapon,
        game: testGame,
        combatPhase: 'shooting',
        combatRole: 'attacker',
        options: {
          modelsFiring: 1,
          withinHalfRange: false,
          blastBonusAttacks: 0,
          unitHasCharged: false,
          unitRemainedStationary: false
        },
        rules: [],
        armyStates: []
      });

      const shouldApply = evaluateWhen(leaderCondition, context);
      expect(shouldApply).toBe(false);
    });
  });
});
