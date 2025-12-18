/**
 * Test for is-leading condition bug
 *
 * Bug: When a leader CHARACTER unit (like Warboss) attacks while leading a bodyguard unit,
 * the is-leading condition should evaluate to true, but it's currently evaluating to false.
 *
 * This causes rules like "Might is Right" to not apply when the leader attacks.
 */

import { describe, it, expect } from 'vitest';
import { buildCombatContext } from '../lib/rules-engine/context';
import { evaluateAllRules, evaluateWhen } from '../lib/rules-engine/evaluator';
import type { Rule } from '../lib/rules-engine/types';
import { getTestRule } from '../lib/rules-engine/test-rules';
import type { WeaponStats } from '../lib/combat-calculator-engine';

describe('is-leading condition bug', () => {
  // The "Might is Right" rule from test-rules.json
  const mightIsRightRule: Rule = getTestRule('might-is-right')!;

  it('should evaluate is-leading condition as TRUE when unit has isLeader: true', () => {
    const weapon: WeaponStats = {
      name: 'Big Choppa',
      range: 0,
      A: '4',
      WS: 2,
      S: 10,
      AP: -2,
      D: '3',
      keywords: []
    };

    const defender = {
      id: 'target-1',
      armyId: 'enemy-army-1',
      categories: ['INFANTRY'],
      models: [{ T: 4, SV: 3, INV: 6, W: 2 }]
    };

    const game = {
      id: 'game-1',
      currentTurn: 1,
      currentPhase: 'fight'
    };

    // Build combat context with a leader unit
    const context = buildCombatContext({
      attacker: {
        id: 'warboss-1',
        armyId: 'ork-army-1',
        categories: ['CHARACTER', 'INFANTRY'],
        isLeader: true // This unit IS a leader
      },
      defender: defender,
      weapon: weapon,
      game: game,
      combatPhase: 'melee',
      combatRole: 'attacker',
      options: {
        modelsFiring: 1,
        withinHalfRange: false,
        unitRemainedStationary: false,
        unitHasCharged: false,
        blastBonusAttacks: 0
      },
      rules: [mightIsRightRule],
      armyStates: []
    });

    // Test 1: The isLeading condition should evaluate to true
    const isLeadingCondition = { t: 'isLeading' as const };
    const isLeadingResult = evaluateWhen(isLeadingCondition, context);
    expect(isLeadingResult).toBe(true);

    // Test 2: The rule should be applied
    const appliedRules = evaluateAllRules([mightIsRightRule], context);
    expect(appliedRules).toHaveLength(1);
    expect(appliedRules[0].id).toBe('might-is-right-hit');
  });

  it('should evaluate is-leading condition as FALSE when unit has isLeader: false', () => {
    const weapon: WeaponStats = {
      name: 'Big Choppa',
      range: 0,
      A: '4',
      WS: 2,
      S: 10,
      AP: -2,
      D: '3',
      keywords: []
    };

    const defender = {
      id: 'target-1',
      armyId: 'enemy-army-1',
      categories: ['INFANTRY'],
      models: [{ T: 4, SV: 3, INV: 6, W: 2 }]
    };

    const game = {
      id: 'game-1',
      currentTurn: 1,
      currentPhase: 'fight'
    };

    const context = buildCombatContext({
      attacker: {
        id: 'warboss-1',
        armyId: 'ork-army-1',
        categories: ['CHARACTER', 'INFANTRY'],
        isLeader: false // NOT a leader
      },
      defender: defender,
      weapon: weapon,
      game: game,
      combatPhase: 'melee',
      combatRole: 'attacker',
      options: {
        modelsFiring: 1,
        withinHalfRange: false,
        unitRemainedStationary: false,
        unitHasCharged: false,
        blastBonusAttacks: 0
      },
      rules: [mightIsRightRule],
      armyStates: []
    });

    // Test 1: The isLeading condition should evaluate to false
    const isLeadingCondition = { t: 'isLeading' as const };
    const isLeadingResult = evaluateWhen(isLeadingCondition, context);
    expect(isLeadingResult).toBe(false);

    // Test 2: The rule should NOT be applied
    const appliedRules = evaluateAllRules([mightIsRightRule], context);
    expect(appliedRules).toHaveLength(0);
  });

  it('should apply Might is Right when leader attacks', () => {
    const weapon: WeaponStats = {
      name: 'Big Choppa',
      range: 0,
      A: '4',
      WS: 2,
      S: 10,
      AP: -2,
      D: '3',
      keywords: []
    };

    const defender = {
      id: 'gorkanaut-1',
      armyId: 'enemy-army-1',
      categories: ['VEHICLE'],
      models: [{ T: 12, SV: 3, INV: 6, W: 24 }]
    };

    const game = {
      id: 'game-1',
      currentTurn: 1,
      currentPhase: 'fight'
    };

    const context = buildCombatContext({
      attacker: {
        id: 'warboss-1',
        armyId: 'ork-army-1',
        categories: ['CHARACTER', 'INFANTRY'],
        isLeader: true
      },
      defender: defender,
      weapon: weapon,
      game: game,
      combatPhase: 'melee',
      combatRole: 'attacker',
      options: {
        modelsFiring: 1,
        withinHalfRange: false,
        unitRemainedStationary: false,
        unitHasCharged: false,
        blastBonusAttacks: 0
      },
      rules: [mightIsRightRule],
      armyStates: []
    });

    // The rule should be applied
    const appliedRules = evaluateAllRules([mightIsRightRule], context);
    expect(appliedRules).toHaveLength(1);
    expect(appliedRules[0].id).toBe('might-is-right-hit');
  });
});
