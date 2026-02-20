import { describe, it, expect, vi, afterEach } from 'vitest';
import { buildCombatState, executeCombatSequence, CombatOptions, WeaponStats, TargetStats } from '../lib/combat-calculator-engine';
import { getTestRule } from '../lib/rules-engine/test-rules';
import type { Rule } from '../lib/rules-engine/types';

describe('Critical Hit Threshold', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  const criticalHitOnFiveRule = getTestRule('critical-hit-on-five') as Rule;

  const weapon: WeaponStats = {
    name: 'Test Weapon',
    range: 24,
    A: '1',
    WS: 4,
    S: 4,
    AP: 0,
    D: '1',
    keywords: []
  };

  const target: TargetStats = {
    T: 4,
    SV: 3,
    modelCount: 1,
    categories: ['INFANTRY']
  };

  const attacker = {
    id: 'attacker-1',
    armyId: 'attacker-army',
    name: 'Attacker Unit',
    categories: ['INFANTRY']
  };

  const defender = {
    id: 'defender-1',
    armyId: 'defender-army',
    name: 'Defender Unit',
    categories: ['INFANTRY'],
    models: [{ T: 4, SV: 3 }]
  };

  const options: CombatOptions = {
    modelsFiring: 1,
    withinHalfRange: false,
    blastBonusAttacks: 0,
    unitHasCharged: false,
    unitRemainedStationary: false
  };

  it('should mark a 5 as a critical hit when setCriticalHit is active', () => {
    const randomSpy = vi.spyOn(Math, 'random');
    randomSpy.mockImplementation(() => 0.8); // d6 -> 5

    const state = buildCombatState({
      attacker,
      defender,
      weapon,
      game: { id: 'game-1', currentTurn: 1, currentPhase: 'shooting' },
      combatPhase: 'shooting',
      options,
      attackerRules: [criticalHitOnFiveRule],
      defenderRules: [],
      attackerArmyStates: [],
      defenderArmyStates: [],
      target
    });

    expect(state.modifiers.criticalHitThreshold).toBe(5);

    const result = executeCombatSequence(state.effectiveWeapon, state.effectiveTarget, options, {
      preCalculatedModifiers: {
        hitModifier: state.modifiers.hitModifier,
        woundModifier: state.modifiers.woundModifier,
        criticalHitThreshold: state.modifiers.criticalHitThreshold,
        weaponModifiers: state.modifiers.weaponModifiers,
        addedKeywords: state.modifiers.addedKeywords,
        appliedRules: state.modifiers.appliedRules,
        rerollHitKind: state.modifiers.rerollHitKind,
        rerollWoundKind: state.modifiers.rerollWoundKind
      }
    });

    expect(result.attackPhase.hits.length).toBe(1);
    expect(result.attackPhase.criticalHits.length).toBe(1);
  });

  it('should not mark a 5 as a critical hit by default', () => {
    const randomSpy = vi.spyOn(Math, 'random');
    randomSpy.mockImplementation(() => 0.8); // d6 -> 5

    const state = buildCombatState({
      attacker,
      defender,
      weapon,
      game: { id: 'game-1', currentTurn: 1, currentPhase: 'shooting' },
      combatPhase: 'shooting',
      options,
      attackerRules: [],
      defenderRules: [],
      attackerArmyStates: [],
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

    expect(result.attackPhase.hits.length).toBe(1);
    expect(result.attackPhase.criticalHits.length).toBe(0);
  });
});
