/**
 * Test that Hyper Adaptations selection persists in combat calculator
 */

import { describe, it, expect } from 'vitest';
import { buildCombatContext } from '../lib/rules-engine/context';
import { getAddedKeywords, evaluateAllRules } from '../lib/rules-engine/evaluator';
import { getTestRule } from '../lib/rules-engine/test-rules';
import { ArmyState } from '../lib/rules-engine/types';

describe('Hyper Adaptations in Combat Calculator', () => {
  it('should remember the selected hyper-adaptation from armyStates', () => {
    // Get the hyper-adaptations rule
    const hyperAdaptationsRule = getTestRule('hyper-adaptations-swarming');

    // Simulate that the player selected "Swarming Instincts" in command phase
    const armyStates: ArmyState[] = [
      {
        id: 'state-1',
        armyId: 'army-1',
        state: 'hyper-adaptations', // This matches rule.choice.id from test-rules.json
        choiceValue: 'swarming-instincts',
        activatedTurn: 1,
      }
    ];

    const weapon = {
      id: 'fleshborer',
      name: 'Fleshborer',
      range: 18,
      A: '1',
      WS: 4,
      S: 5,
      AP: 0,
      D: '1',
      abilities: [],
    };

    // Create a Tyranid unit attacking an Infantry unit
    const attacker = {
      id: 'termagant-1',
      name: 'Termagants',
      categories: ['Infantry', 'Battleline'],
      faction: 'Tyranids',
    };

    const defender = {
      id: 'marine-1',
      name: 'Tactical Marines',
      categories: ['Infantry'],
      T: 4,
      Sv: 3,
      invulnSave: undefined,
      W: 2,
    };

    const game = {
      id: 'game-1',
      currentTurn: 1,
      currentPhase: 'shooting',
    };

    // Build combat context - this is what the combat calculator does
    const context = buildCombatContext({
      attacker,
      defender,
      weapon,
      game,
      combatPhase: 'shooting',
      combatRole: 'attacker',
      options: {
        modelsFiring: 10,
        withinHalfRange: false,
        blastBonusAttacks: 0,
        unitHasCharged: false,
        unitRemainedStationary: false,
      },
      rules: [hyperAdaptationsRule],
      armyStates, // Pass in the army states with the selection
    });

    // Evaluate rules to apply modifiers - this is what the combat calculator does
    evaluateAllRules([hyperAdaptationsRule], context);

    // The selected hyper-adaptation should add SUSTAINED HITS 1 when attacking Infantry
    const keywords = getAddedKeywords(context);

    expect(keywords).toContain('Sustained Hits 1');
  });

  it('should NOT apply Swarming Instincts when targeting non-Infantry', () => {
    const hyperAdaptationsRule = getTestRule('hyper-adaptations-swarming');

    const armyStates: ArmyState[] = [
      {
        id: 'state-1',
        armyId: 'army-1',
        state: 'hyper-adaptations',
        choiceValue: 'swarming-instincts',
        activatedTurn: 1,
      }
    ];

    const weapon = {
      id: 'fleshborer',
      name: 'Fleshborer',
      range: 18,
      A: '1',
      WS: 4,
      S: 5,
      AP: 0,
      D: '1',
      abilities: [],
    };

    const attacker = {
      id: 'termagant-1',
      name: 'Termagants',
      categories: ['Infantry'],
      faction: 'Tyranids',
    };

    const defender = {
      id: 'carnifex-1',
      name: 'Enemy Monster',
      categories: ['Monster'], // NOT Infantry or Swarm
      T: 9,
      Sv: 2,
      invulnSave: undefined,
      W: 10,
    };

    const game = {
      id: 'game-1',
      currentTurn: 1,
      currentPhase: 'shooting',
    };

    const context = buildCombatContext({
      attacker,
      defender,
      weapon,
      game,
      combatPhase: 'shooting',
      combatRole: 'attacker',
      options: {
        modelsFiring: 10,
        withinHalfRange: false,
        blastBonusAttacks: 0,
        unitHasCharged: false,
        unitRemainedStationary: false,
      },
      rules: [hyperAdaptationsRule],
      armyStates,
    });

    // Evaluate rules to apply modifiers
    evaluateAllRules([hyperAdaptationsRule], context);

    // Should NOT add Sustained Hits when targeting non-Infantry
    const keywords = getAddedKeywords(context);

    expect(keywords).not.toContain('Sustained Hits 1');
  });

  it('should NOT show choice selector if already selected in armyStates', () => {
    // This test verifies that we don't ask for user input when the choice
    // has already been made in the command phase

    const hyperAdaptationsRule = getTestRule('hyper-adaptations-swarming');

    const armyStates: ArmyState[] = [
      {
        id: 'state-1',
        armyId: 'army-1',
        state: 'hyper-adaptations', // Matches rule.choice.id
        choiceValue: 'swarming-instincts',
        activatedTurn: 1,
      }
    ];

    const weapon = {
      id: 'fleshborer',
      name: 'Fleshborer',
      range: 18,
      A: '1',
      WS: 4,
      S: 5,
      AP: 0,
      D: '1',
      abilities: [],
    };

    const attacker = {
      id: 'termagant-1',
      name: 'Termagants',
      categories: ['Infantry'],
      faction: 'Tyranids',
    };

    const defender = {
      id: 'marine-1',
      name: 'Tactical Marines',
      categories: ['Infantry'],
      T: 4,
      Sv: 3,
      invulnSave: undefined,
      W: 2,
    };

    const game = {
      id: 'game-1',
      currentTurn: 1,
      currentPhase: 'shooting',
    };

    // Don't expect this to throw or require userInputs
    expect(() => {
      buildCombatContext({
        attacker,
        defender,
        weapon,
        game,
        combatPhase: 'shooting',
        combatRole: 'attacker',
        options: {
          modelsFiring: 10,
          withinHalfRange: false,
          blastBonusAttacks: 0,
          unitHasCharged: false,
          unitRemainedStationary: false,
        },
        rules: [hyperAdaptationsRule],
        armyStates, // Empty - should not need user input
      });
    }).not.toThrow();
  });
});
