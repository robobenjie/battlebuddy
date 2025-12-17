/**
 * Test for invulnerable saves in combat sequence execution
 * Verifies that executeCombatSequence properly uses invuln saves
 */

import { describe, it, expect } from 'vitest';
import { executeCombatSequence, executeSavePhase, WeaponStats, TargetStats } from '../lib/combat-calculator-engine';
import { calculateSaveThreshold } from '../lib/dice-utils';

describe('Combat Sequence - Invulnerable Save', () => {
  const testWeapon: WeaponStats = {
    name: 'Boltgun',
    range: 24,
    A: '10',  // More attacks to ensure we get wounds
    WS: 2,    // 2+ to hit (very reliable)
    S: 10,    // S10 vs T5 = 2+ to wound (very reliable)
    AP: -1,
    D: '1',
    keywords: []
  };

  it('should use invuln save when it is better than armor save', () => {
    const targetWithInvuln: TargetStats = {
      T: 5,
      SV: 6,      // 6+ armor save (worse)
      INV: 5,     // 5+ invuln save (better)
      FNP: undefined,
      modelCount: 10,
      categories: ['INFANTRY']
    };

    // Execute combat sequence (attacks and wounds)
    const combatResult = executeCombatSequence(testWeapon, targetWithInvuln, {
      modelsFiring: 1,
      withinHalfRange: false,
      blastBonusAttacks: 0,
      unitHasCharged: false,
      unitRemainedStationary: false
    });

    // Execute save phase
    const result = executeSavePhase(combatResult, testWeapon, targetWithInvuln);

    // Should have save rolls
    expect(result.savePhase).toBeDefined();
    expect(result.savePhase!.saveRolls.length).toBeGreaterThan(0);

    // Check that save threshold used is 5+ (invuln), not 6+ (armor)
    const saveCalc = calculateSaveThreshold(targetWithInvuln.SV, testWeapon.AP, targetWithInvuln.INV);
    expect(saveCalc.threshold).toBe(5);
    expect(saveCalc.usingInvulnerable).toBe(true);
  });

  it('should use armor save when it is better than invuln save', () => {
    const targetWithBetterArmor: TargetStats = {
      T: 5,
      SV: 3,      // 3+ armor save (better)
      INV: 5,     // 5+ invuln save (worse)
      FNP: undefined,
      modelCount: 10,
      categories: ['INFANTRY']
    };

    // Execute combat sequence (attacks and wounds)
    const combatResult = executeCombatSequence(testWeapon, targetWithBetterArmor, {
      modelsFiring: 1,
      withinHalfRange: false,
      blastBonusAttacks: 0,
      unitHasCharged: false,
      unitRemainedStationary: false
    });

    // Execute save phase
    const result = executeSavePhase(combatResult, testWeapon, targetWithBetterArmor);

    // Should have save rolls
    expect(result.savePhase).toBeDefined();
    expect(result.savePhase!.saveRolls.length).toBeGreaterThan(0);

    // Modified armor save: 3 + AP(-1) = 4+
    // Invuln: 5+
    // Should use armor (4+) because it's better
    const saveCalc = calculateSaveThreshold(targetWithBetterArmor.SV, testWeapon.AP, targetWithBetterArmor.INV);
    expect(saveCalc.threshold).toBe(4);
    expect(saveCalc.usingInvulnerable).toBe(false);
  });

  it('should use invuln save when AP makes armor save worse', () => {
    const weaponWithHighAP: WeaponStats = {
      name: 'Plasma Gun',
      range: 24,
      A: '10',    // More attacks to ensure we get wounds
      WS: 2,      // 2+ to hit
      S: 10,      // S10 vs T5 = 2+ to wound
      AP: -3,     // High AP
      D: '2',
      keywords: []
    };

    const targetWithInvuln: TargetStats = {
      T: 5,
      SV: 3,      // 3+ armor save
      INV: 5,     // 5+ invuln save
      FNP: undefined,
      modelCount: 10,
      categories: ['INFANTRY']
    };

    // Execute combat sequence (attacks and wounds)
    const combatResult = executeCombatSequence(weaponWithHighAP, targetWithInvuln, {
      modelsFiring: 1,
      withinHalfRange: false,
      blastBonusAttacks: 0,
      unitHasCharged: false,
      unitRemainedStationary: false
    });

    // Execute save phase
    const result = executeSavePhase(combatResult, weaponWithHighAP, targetWithInvuln);

    // Modified armor save: 3 + AP(-3) = 6+
    // Invuln: 5+
    // Should use invuln (5+) because it's better
    expect(result.savePhase).toBeDefined();
    expect(result.savePhase!.saveRolls.length).toBeGreaterThan(0);

    const saveCalc = calculateSaveThreshold(targetWithInvuln.SV, weaponWithHighAP.AP, targetWithInvuln.INV);
    expect(saveCalc.threshold).toBe(5);
    expect(saveCalc.usingInvulnerable).toBe(true);
  });

  it('should not have save rolls when both saves are impossible (7+)', () => {
    const weaponWithHighAP: WeaponStats = {
      name: 'Lascannon',
      range: 48,
      A: '10',   // More attacks to ensure we get wounds
      WS: 2,     // 2+ to hit
      S: 10,     // S10 vs T5 = 2+ to wound
      AP: -4,
      D: 'd6',
      keywords: []
    };

    const targetWithBadSaves: TargetStats = {
      T: 5,
      SV: 6,      // 6+ armor save
      INV: undefined,  // No invuln
      FNP: undefined,
      modelCount: 10,
      categories: ['INFANTRY']
    };

    // Execute combat sequence (attacks and wounds)
    const combatResult = executeCombatSequence(weaponWithHighAP, targetWithBadSaves, {
      modelsFiring: 1,
      withinHalfRange: false,
      blastBonusAttacks: 0,
      unitHasCharged: false,
      unitRemainedStationary: false
    });

    // Execute save phase
    const result = executeSavePhase(combatResult, weaponWithHighAP, targetWithBadSaves);

    // Modified armor save: 6 + AP(-4) = 10+ (impossible)
    // No invuln
    // When saves are impossible, saveRolls array should be empty (threshold is 7)
    expect(result.savePhase).toBeDefined();
    expect(result.savePhase!.saveRolls).toBeDefined();
    expect(result.savePhase!.saveRolls.length).toBe(0);

    // Verify threshold calculation
    const saveCalc = calculateSaveThreshold(targetWithBadSaves.SV, weaponWithHighAP.AP, targetWithBadSaves.INV);
    expect(saveCalc.threshold).toBe(7); // Impossible
  });
});
