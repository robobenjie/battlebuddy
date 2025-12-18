/**
 * Integration test for invulnerable saves in combat calculator
 * Tests the complete flow: rule evaluation -> modifier extraction -> target stats update
 */

import { describe, it, expect } from 'vitest';
import { evaluateRule } from '../lib/rules-engine/evaluator';
import { buildCombatContext } from '../lib/rules-engine/context';
import { ArmyState } from '../lib/rules-engine/types';
import { WeaponStats, TargetStats } from '../lib/combat-calculator-engine';
import { getTestRule } from '../lib/rules-engine/test-rules';

describe('Combat Calculator - Invulnerable Save Integration', () => {
  const waaaghInvulnRule = getTestRule('waaagh-invuln')!;

  const testWeapon: WeaponStats = {
    name: 'Boltgun',
    range: 24,
    A: '2',
    WS: 3,
    S: 4,
    AP: 0,
    D: '1',
    keywords: []
  };

  const testGame = {
    id: 'test-game',
    currentTurn: 2,
    currentPhase: 'shooting'
  };

  it('should apply invuln save to effectiveTargetStats', () => {
    const orkArmyId = 'ork-army-123';
    const waaaghState: ArmyState = {
      id: 'waaagh-state-1',
      state: 'waaagh-active',
      activatedTurn: 2,
      armyId: orkArmyId
    };

    // Start with target stats that have no invuln
    const effectiveTargetStats: TargetStats = {
      T: 5,
      SV: 5,
      INV: undefined,
      FNP: undefined,
      modelCount: 10,
      categories: ['INFANTRY']
    };

    // Build defender context
    const defenderContext = buildCombatContext({
      attacker: {
        id: 'space-marine',
        armyId: 'space-marine-army',
        categories: ['INFANTRY']
      },
      defender: {
        id: 'ork-boy',
        armyId: orkArmyId,
        categories: ['INFANTRY'],
        T: 5,
        SV: 5,
        INV: undefined,
        modelCount: 10
      },
      weapon: testWeapon,
      game: testGame,
      combatPhase: 'shooting',
      combatRole: 'defender',
      options: {
        modelsFiring: 1,
        withinHalfRange: false,
        blastBonusAttacks: 0,
        unitHasCharged: false,
        unitRemainedStationary: false
      },
      rules: [waaaghInvulnRule],
      armyStates: [waaaghState]
    });

    // Evaluate the rule
    const applied = evaluateRule(waaaghInvulnRule, defenderContext);
    expect(applied).toBe(true);

    // Extract INV modifier (same as CombatCalculatorPage)
    const invModifiers = defenderContext.modifiers.getModifiers('INV');
    const invMod = invModifiers.length > 0
      ? Math.min(...invModifiers.map(m => m.value))
      : undefined;

    // Verify modifier was extracted
    expect(invModifiers.length).toBeGreaterThan(0);
    expect(invMod).toBe(5);

    // Apply to effectiveTargetStats (same as CombatCalculatorPage should do)
    if (invMod !== undefined && invMod !== null) {
      effectiveTargetStats.INV = invMod;
    }

    // Verify effectiveTargetStats was updated
    expect(effectiveTargetStats.INV).toBe(5);
  });

  it('should use better invuln when unit has base invuln and Waaagh invuln', () => {
    const orkArmyId = 'ork-army-123';
    const waaaghState: ArmyState = {
      id: 'waaagh-state-1',
      state: 'waaagh-active',
      activatedTurn: 2,
      armyId: orkArmyId
    };

    // Unit with 4+ base invuln
    const effectiveTargetStats: TargetStats = {
      T: 6,
      SV: 4,
      INV: 4, // Base 4+ invuln
      FNP: undefined,
      modelCount: 1,
      categories: ['INFANTRY', 'CHARACTER']
    };

    const defenderContext = buildCombatContext({
      attacker: {
        id: 'space-marine',
        armyId: 'space-marine-army',
        categories: ['INFANTRY']
      },
      defender: {
        id: 'ork-warboss',
        armyId: orkArmyId,
        categories: ['INFANTRY', 'CHARACTER'],
        T: 6,
        SV: 4,
        INV: 4,
        modelCount: 1
      },
      weapon: testWeapon,
      game: testGame,
      combatPhase: 'shooting',
      combatRole: 'defender',
      options: {
        modelsFiring: 1,
        withinHalfRange: false,
        blastBonusAttacks: 0,
        unitHasCharged: false,
        unitRemainedStationary: false
      },
      rules: [waaaghInvulnRule],
      armyStates: [waaaghState]
    });

    evaluateRule(waaaghInvulnRule, defenderContext);

    // Extract modifier
    const invModifiers = defenderContext.modifiers.getModifiers('INV');
    const invMod = invModifiers.length > 0
      ? Math.min(...invModifiers.map(m => m.value))
      : undefined;

    // Waaagh gives 5+ invuln
    expect(invMod).toBe(5);

    // Should keep the better (lower) invuln
    const baseInv = effectiveTargetStats.INV || 7;
    const finalInv = invMod !== undefined ? Math.min(baseInv, invMod) : baseInv;

    expect(finalInv).toBe(4); // Keep the better 4+ invuln
  });
});
