import { describe, expect, it } from 'vitest';
import { buildCombatActiveRules } from '../lib/combat-active-rules';
import { getTestRule } from '../lib/rules-engine/test-rules';
import { buildCombatContext } from '../lib/rules-engine/context';

describe('buildCombatActiveRules', () => {
  const attackerContext = buildCombatContext({
    attacker: { id: 'a1', name: 'Attacker', armyId: 'army-a', categories: ['Infantry'] },
    defender: { id: 'd1', name: 'Defender', armyId: 'army-d', categories: ['Infantry'] },
    weapon: { id: 'w1', name: 'Shoota', range: 18, A: '2', WS: 4, S: 4, AP: 0, D: '1', keywords: [] },
    game: { currentTurn: 1, currentPhase: 'shooting' },
    combatPhase: 'shooting',
    combatRole: 'attacker',
    options: {
      modelsFiring: 1,
      withinHalfRange: false,
      unitRemainedStationary: true,
      unitHasCharged: false,
      blastBonusAttacks: 0
    },
    rules: [],
    armyStates: []
  });

  const defenderContext = buildCombatContext({
    attacker: { id: 'a1', name: 'Attacker', armyId: 'army-a', categories: ['Infantry'] },
    defender: { id: 'd1', name: 'Defender', armyId: 'army-d', categories: ['Infantry'] },
    weapon: { id: 'w1', name: 'Shoota', range: 18, A: '2', WS: 4, S: 4, AP: 0, D: '1', keywords: [] },
    game: { currentTurn: 1, currentPhase: 'shooting' },
    combatPhase: 'shooting',
    combatRole: 'defender',
    options: {
      modelsFiring: 1,
      withinHalfRange: false,
      unitRemainedStationary: true,
      unitHasCharged: false,
      blastBonusAttacks: 0
    },
    rules: [],
    armyStates: []
  });

  const defenderContextWithPlague = buildCombatContext({
    attacker: { id: 'a1', name: 'Attacker', armyId: 'army-a', categories: ['Infantry'] },
    defender: { id: 'd1', name: 'Defender', armyId: 'army-d', categories: ['Infantry'] },
    weapon: { id: 'w1', name: 'Shoota', range: 18, A: '2', WS: 4, S: 4, AP: 0, D: '1', keywords: [] },
    game: { currentTurn: 1, currentPhase: 'shooting' },
    combatPhase: 'shooting',
    combatRole: 'defender',
    options: {
      modelsFiring: 1,
      withinHalfRange: false,
      unitRemainedStationary: true,
      unitHasCharged: false,
      blastBonusAttacks: 0
    },
    rules: [],
    armyStates: [
      {
        id: 'state-1',
        armyId: 'army-d',
        state: 'death-guard-plague',
        choiceValue: 'skullsquirm-blight',
        activatedTurn: 1
      }
    ]
  });

  it('does not show non-reactive defender choice rules in active rules', () => {
    const driveByDakka = getTestRule('drive-by-dakka');

    const display = buildCombatActiveRules({
      attackerRules: [],
      defenderRules: [driveByDakka],
      appliedAttackerRules: [],
      appliedDefenderRules: [],
      attackerContext,
      defenderContext: defenderContextWithPlague
    });

    expect(display.some((r) => r.id === driveByDakka.id)).toBe(false);
  });

  it('shows reactive defender choice rules when unresolved and conditions match', () => {
    const reactiveRule = getTestRule('death-guard-afflicted-skullsquirm-defense')!;

    const display = buildCombatActiveRules({
      attackerRules: [],
      defenderRules: [reactiveRule],
      appliedAttackerRules: [],
      appliedDefenderRules: [],
      attackerContext,
      defenderContext: defenderContextWithPlague
    });

    expect(display.some((r) => r.id === reactiveRule.id)).toBe(true);
  });
});
