/**
 * Test for is-leading condition bug
 *
 * Bug: When a leader CHARACTER unit (like Warboss) attacks while leading a bodyguard unit,
 * the is-leading condition should evaluate to true, but it's currently evaluating to false.
 *
 * This causes rules like "Might is Right" to not apply when the leader attacks.
 */

import { describe, it, expect } from 'vitest';
import { buildCombatContext, evaluateAllRules, checkCondition } from '../lib/rules-engine';
import type { Rule, CombatContext } from '../lib/rules-engine/types';
import { getTestRule } from '../lib/rules-engine/test-rules';

describe('is-leading condition bug', () => {
  // The "Might is Right" rule from test-rules.json
  const mightIsRightRule: Rule = getTestRule('might-is-right')!;

  it('should evaluate is-leading condition as TRUE when unit has bodyguard units', () => {
    // Warboss unit with bodyguard units (is leading)
    const warbossUnit = {
      id: 'warboss-1',
      name: 'Warboss',
      armyId: 'ork-army-1',
      bodyguardUnits: [
        { id: 'boys-1', name: 'Ork Boyz' }
      ],
      // This is what we're setting in CombatCalculatorPage.tsx
      isLeader: true
    };

    const weapon = {
      name: 'Big Choppa',
      range: 0,
      type: 'melee' as const,
      A: '4',
      WS: 2,
      S: 10,
      AP: -2,
      D: '3',
      keywords: []
    };

    const defender = {
      id: 'target-1',
      name: 'Target',
      armyId: 'enemy-army-1',
      models: [{ T: 4, SV: 3, W: 2 }]
    };

    const game = {
      id: 'game-1',
      currentTurn: 1,
      currentPhase: 'fight'
    };

    // Build combat context
    const context = buildCombatContext({
      attacker: warbossUnit,
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

    // Test 1: The is-leading condition should evaluate to true
    const isLeadingCondition = {
      type: 'is-leading' as const,
      params: {}
    };
    const isLeadingResult = checkCondition(isLeadingCondition, context);
    expect(isLeadingResult).toBe(true);

    // Test 2: The rule should be applied
    const appliedRules = evaluateAllRules([mightIsRightRule], context);
    expect(appliedRules).toHaveLength(1);
    expect(appliedRules[0].id).toBe('might-is-right-hit');
  });

  it('should evaluate is-leading condition as FALSE when unit has no bodyguard units', () => {
    // Warboss unit without bodyguard units (not leading)
    const warbossUnit = {
      id: 'warboss-1',
      name: 'Warboss',
      armyId: 'ork-army-1',
      bodyguardUnits: [],
      isLeader: false
    };

    const weapon = {
      name: 'Big Choppa',
      range: 0,
      type: 'melee' as const,
      A: '4',
      WS: 2,
      S: 10,
      AP: -2,
      D: '3',
      keywords: []
    };

    const defender = {
      id: 'target-1',
      name: 'Target',
      armyId: 'enemy-army-1',
      models: [{ T: 4, SV: 3, W: 2 }]
    };

    const game = {
      id: 'game-1',
      currentTurn: 1,
      currentPhase: 'fight'
    };

    const context = buildCombatContext({
      attacker: warbossUnit,
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

    // Test 1: The is-leading condition should evaluate to false
    const isLeadingCondition = {
      type: 'is-leading' as const,
      params: {}
    };
    const isLeadingResult = checkCondition(isLeadingCondition, context);
    expect(isLeadingResult).toBe(false);

    // Test 2: The rule should NOT be applied
    const appliedRules = evaluateAllRules([mightIsRightRule], context);
    expect(appliedRules).toHaveLength(0);
  });

  it('should apply Might is Right when Warboss (with isLeader=true) attacks', () => {
    // This simulates exactly what happens in CombatCalculatorPage.tsx
    const warbossUnit = {
      id: 'warboss-1',
      name: 'Warboss',
      armyId: 'ork-army-1',
      bodyguardUnits: [
        { id: 'boys-1', name: 'Ork Boyz' }
      ],
      // THIS is what we set in CombatCalculatorPage.tsx line 546
      isLeader: !!(true && 1 > 0) // simulates: !!(unit?.bodyguardUnits && unit.bodyguardUnits.length > 0)
    };

    const weapon = {
      name: 'Big Choppa',
      range: 0,
      type: 'melee' as const,
      A: '4',
      WS: 2,
      S: 10,
      AP: -2,
      D: '3',
      keywords: []
    };

    const defender = {
      id: 'gorkanaut-1',
      name: 'Gorkanaut',
      armyId: 'enemy-army-1',
      models: [{ T: 12, SV: 3, W: 24 }]
    };

    const game = {
      id: 'game-1',
      currentTurn: 1,
      currentPhase: 'fight'
    };

    const context = buildCombatContext({
      attacker: warbossUnit,
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

    console.log('🔍 Test Debug:');
    console.log('  warbossUnit.isLeader:', warbossUnit.isLeader);
    console.log('  warbossUnit.bodyguardUnits.length:', warbossUnit.bodyguardUnits.length);
    console.log('  context.attacker.isLeader:', (context.attacker as any).isLeader);

    // The rule should be applied
    const appliedRules = evaluateAllRules([mightIsRightRule], context);

    console.log('  Applied rules:', appliedRules.length);
    console.log('  Applied rule IDs:', appliedRules.map(r => r.id));

    expect(appliedRules).toHaveLength(1);
    expect(appliedRules[0].id).toBe('might-is-right-hit');
  });
});
