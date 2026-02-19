import { describe, it, expect } from 'vitest';
import { calculateCombatModifiers, WeaponStats } from '../lib/combat-calculator-engine';
import { ArmyState } from '../lib/rules-engine/types';
import { getTestRule } from '../lib/rules-engine/test-rules';

const weapon: WeaponStats = {
  name: 'Plague Bolter',
  range: 24,
  A: '2',
  WS: 3,
  S: 4,
  AP: 0,
  D: '1',
  keywords: []
};

const baseParams = {
  attacker: {
    id: 'attacker-1',
    armyId: 'death-guard-army',
    name: 'Plague Marines',
    categories: ['Infantry']
  },
  defender: {
    id: 'defender-1',
    armyId: 'enemy-army',
    name: 'Enemy Unit',
    categories: ['Infantry'],
    models: [{ T: 5, SV: 3 }]
  },
  game: {
    id: 'game-1',
    currentTurn: 2,
    currentPhase: 'shooting'
  },
  combatPhase: 'shooting' as const,
  options: {
    modelsFiring: 1,
    withinHalfRange: false,
    blastBonusAttacks: 0,
    unitHasCharged: false,
    unitRemainedStationary: false
  },
  attackerRules: [] as any[],
  defenderRules: [] as any[],
  attackerArmyStates: [] as ArmyState[],
  defenderArmyStates: [] as ArmyState[]
};

describe('Death Guard Afflicted', () => {
  it('applies Rattlejoint effects when target is afflicted', () => {
    const plagueChoiceRule = getTestRule('death-guard-plague-choice');
    const rattlejointRule = getTestRule('death-guard-afflicted-rattlejoint');

    if (!plagueChoiceRule || !rattlejointRule) {
      throw new Error('Death Guard rules not found in test-rules.json');
    }

    const attackerStates: ArmyState[] = [
      {
        id: 'state-1',
        armyId: 'death-guard-army',
        state: 'death-guard-plague',
        choiceValue: 'rattlejoint-ague',
        activatedTurn: 1
      }
    ];

    const result = calculateCombatModifiers({
      ...baseParams,
      weapon,
      options: {
        ...baseParams.options,
        userInputs: {
          'target-afflicted': 'yes'
        }
      },
      attackerRules: [plagueChoiceRule, rattlejointRule],
      attackerArmyStates: attackerStates
    });

    expect(result.targetModifiers.T).toBe(-1);
    expect(result.targetModifiers.SV).toBe(1);
  });

  it('does not apply Rattlejoint effects when target is not afflicted', () => {
    const plagueChoiceRule = getTestRule('death-guard-plague-choice');
    const rattlejointRule = getTestRule('death-guard-afflicted-rattlejoint');

    if (!plagueChoiceRule || !rattlejointRule) {
      throw new Error('Death Guard rules not found in test-rules.json');
    }

    const attackerStates: ArmyState[] = [
      {
        id: 'state-1',
        armyId: 'death-guard-army',
        state: 'death-guard-plague',
        choiceValue: 'rattlejoint-ague',
        activatedTurn: 1
      }
    ];

    const result = calculateCombatModifiers({
      ...baseParams,
      weapon,
      options: {
        ...baseParams.options,
        userInputs: {
          'target-afflicted': 'no'
        }
      },
      attackerRules: [plagueChoiceRule, rattlejointRule],
      attackerArmyStates: attackerStates
    });

    expect(result.targetModifiers.T).toBe(0);
    expect(result.targetModifiers.SV).toBe(0);
  });

  it('applies Skullsquirm hit penalty when afflicted unit attacks Death Guard', () => {
    const plagueChoiceRule = getTestRule('death-guard-plague-choice');
    const skullDefenseRule = getTestRule('death-guard-afflicted-skullsquirm-defense');

    if (!plagueChoiceRule || !skullDefenseRule) {
      throw new Error('Death Guard rules not found in test-rules.json');
    }

    const defenderStates: ArmyState[] = [
      {
        id: 'state-1',
        armyId: 'death-guard-army',
        state: 'death-guard-plague',
        choiceValue: 'skullsquirm-blight',
        activatedTurn: 1
      }
    ];

    const result = calculateCombatModifiers({
      ...baseParams,
      weapon,
      attacker: {
        ...baseParams.attacker,
        armyId: 'enemy-army'
      },
      defender: {
        ...baseParams.defender,
        armyId: 'death-guard-army'
      },
      options: {
        ...baseParams.options,
        userInputs: {
          'attacker-afflicted': 'yes'
        }
      },
      defenderRules: [plagueChoiceRule, skullDefenseRule],
      defenderArmyStates: defenderStates
    });

    expect(result.hitModifier).toBe(-1);
  });
});
