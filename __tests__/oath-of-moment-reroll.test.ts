/**
 * Oath of Moment reroll integration tests
 */

import { describe, it, expect, vi, afterEach } from 'vitest';
import { buildCombatState, executeCombatSequence, CombatOptions, WeaponStats, TargetStats } from '../lib/combat-calculator-engine';
import { getTestRule } from '../lib/rules-engine/test-rules';
import type { ArmyState, Rule } from '../lib/rules-engine/types';

describe('Oath of Moment rerolls', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  const oathRule = getTestRule('oath-of-moment') as Rule;

  const weapon: WeaponStats = {
    name: 'Bolt Rifle',
    range: 24,
    A: '1',
    WS: 3,
    S: 4,
    AP: 0,
    D: '1',
    keywords: []
  };

  const target: TargetStats = {
    T: 4,
    SV: 3,
    modelCount: 1,
    categories: []
  };

  const options: CombatOptions = {
    modelsFiring: 1,
    withinHalfRange: false,
    blastBonusAttacks: 0,
    unitHasCharged: false,
    unitRemainedStationary: true
  };

  const attacker = {
    id: 'attacker-unit',
    armyId: 'attacker-army',
    name: 'Intercessors',
    categories: ['Infantry']
  };

  const defender = {
    id: 'defender-unit',
    armyId: 'defender-army',
    name: 'Boyz',
    categories: ['Infantry'],
    models: [{ T: 4, SV: 3 }]
  };

  const oathState: ArmyState = {
    id: 'oath-state-1',
    armyId: 'attacker-army',
    state: 'oath-of-moment',
    activatedTurn: 1,
    targetUnitId: 'defender-unit'
  };

  it('should set reroll hits when target is the oath target', () => {
    const state = buildCombatState({
      attacker,
      defender,
      weapon,
      game: { id: 'game-1', currentTurn: 1, currentPhase: 'shooting' },
      combatPhase: 'shooting',
      options,
      attackerRules: [oathRule],
      defenderRules: [],
      attackerArmyStates: [oathState],
      defenderArmyStates: [],
      target
    });

    expect(state.modifiers.rerollHitKind).toBe('failed');
  });

  it('should reroll failed hits in the dice engine when oath is active', () => {
    const randomSpy = vi.spyOn(Math, 'random');
    randomSpy
      .mockImplementationOnce(() => 0) // initial hit roll -> 1
      .mockImplementationOnce(() => 0.8) // reroll -> 5
      .mockImplementation(() => 0); // subsequent rolls -> 1

    const state = buildCombatState({
      attacker,
      defender,
      weapon,
      game: { id: 'game-1', currentTurn: 1, currentPhase: 'shooting' },
      combatPhase: 'shooting',
      options,
      attackerRules: [oathRule],
      defenderRules: [],
      attackerArmyStates: [oathState],
      defenderArmyStates: [],
      target
    });

    const result = executeCombatSequence(state.effectiveWeapon, state.effectiveTarget, options, {
      preCalculatedModifiers: {
        hitModifier: state.modifiers.hitModifier,
        woundModifier: state.modifiers.woundModifier,
        weaponModifiers: state.modifiers.weaponModifiers,
        addedKeywords: state.modifiers.addedKeywords,
        appliedRules: state.modifiers.appliedRules,
        rerollHitKind: state.modifiers.rerollHitKind,
        rerollWoundKind: state.modifiers.rerollWoundKind
      }
    });

    expect(result.attackPhase.attackRolls[0].isReroll).toBe(true);
    expect(result.attackPhase.attackRolls[0].originalValue).toBe(1);
    expect(result.attackPhase.hits.length).toBe(1);
  });
});
