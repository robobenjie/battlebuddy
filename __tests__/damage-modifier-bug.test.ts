/**
 * Test to catch the damage modifier application bug
 * weapon.D is a string, so we need to parse it before adding modifiers
 */

import { describe, it, expect } from 'vitest';
import { executeCombatSequence, executeSavePhase, WeaponStats, TargetStats, CombatOptions } from '../lib/combat-calculator-engine';
import { getTestRule } from '../lib/rules-engine/test-rules';

describe('Damage Modifier Application Bug', () => {
  const testWeapon: WeaponStats = {
    name: "'Eadbanger",
    range: 0,
    A: '6',
    WS: 2,
    S: 10,
    AP: -2,
    D: '3', // String, not number!
    keywords: []
  };

  const testTarget: TargetStats = {
    T: 8,
    SV: 2,
    INV: 4,
    modelCount: 10,
    categories: ['VEHICLE']
  };

  const testGame = {
    id: 'test-game',
    currentTurn: 1,
    currentPhase: 'fight'
  };

  // Rule that adds +2 damage
  const damageBoostRule = getTestRule('damage-boost-leader')!;

  it('should correctly add numeric damage modifier to string damage value', () => {
    // Execute combat with damage modifier
    const options: CombatOptions = {
      modelsFiring: 1,
      withinHalfRange: false,
      blastBonusAttacks: 0,
      unitHasCharged: false,
      unitRemainedStationary: false
    };

    const result = executeCombatSequence(
      testWeapon,
      testTarget,
      options,
      {
        attacker: {
          id: 'warboss',
          armyId: 'ork-army',
          categories: ['CHARACTER', 'INFANTRY'],
          isLeader: true
        },
        game: testGame,
        combatPhase: 'melee',
        rules: [damageBoostRule],
        armyStates: []
      }
    );

    // The weapon damage should be modified from "3" to "5" (3 + 2)
    // NOT "32" (string concatenation bug)

    // We can't directly check the weapon object, but we can infer from the save phase
    // Execute save phase to get damage rolls
    const resultWithSaves = executeSavePhase(result, testWeapon, testTarget);

    // If damage modifier is applied correctly, each wound should deal 5 damage
    // If bug exists, it would be trying to use "32" as damage (which would fail or be weird)

    // Check that damage was calculated (should have some failed saves and damage)
    expect(resultWithSaves.savePhase).toBeDefined();

    // The damage should be reasonable (5 per failed save)
    // NOT some weird value like 32 from string concatenation
    if (resultWithSaves.summary.failedSaves > 0) {
      const avgDamagePerFailedSave = resultWithSaves.summary.totalDamage / resultWithSaves.summary.failedSaves;

      // With D=5, average should be 5
      expect(avgDamagePerFailedSave).toBe(5);

      // Should NOT be 32 (string concatenation) or 3 (modifier not applied)
      expect(avgDamagePerFailedSave).not.toBe(32);
      expect(avgDamagePerFailedSave).not.toBe(3);
    }
  });

  it('should handle variable damage (d3, d6) with modifiers', () => {
    const variableDamageWeapon: WeaponStats = {
      ...testWeapon,
      D: 'd6' // Variable damage
    };

    const options: CombatOptions = {
      modelsFiring: 1,
      withinHalfRange: false,
      blastBonusAttacks: 0,
      unitHasCharged: false,
      unitRemainedStationary: false
    };

    // This should work - d6+2 damage
    const result = executeCombatSequence(
      variableDamageWeapon,
      testTarget,
      options,
      {
        attacker: {
          id: 'warboss',
          armyId: 'ork-army',
          categories: ['CHARACTER', 'INFANTRY'],
          isLeader: true
        },
        game: testGame,
        combatPhase: 'melee',
        rules: [damageBoostRule],
        armyStates: []
      }
    );

    const resultWithSaves = executeSavePhase(result, variableDamageWeapon, testTarget);

    expect(resultWithSaves.savePhase).toBeDefined();

    // With d6+2, damage should be between 3 and 8 per failed save
    if (resultWithSaves.summary.failedSaves > 0) {
      const avgDamagePerFailedSave = resultWithSaves.summary.totalDamage / resultWithSaves.summary.failedSaves;

      // Should be in reasonable range for d6+2 (3-8)
      expect(avgDamagePerFailedSave).toBeGreaterThanOrEqual(3);
      expect(avgDamagePerFailedSave).toBeLessThanOrEqual(8);
    }
  });
});
