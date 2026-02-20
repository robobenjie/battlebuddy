'use client';

import { db } from '../../lib/db';
import { id } from '@instantdb/react';
import { useEffect } from 'react';
import UnitCard from '../ui/UnitCard';
import ReminderBadge from '../ui/ReminderBadge';
import { useRulePopup } from '../ui/RulePopup';
import RulePopup from '../ui/RulePopup';
import ReactiveAbilitiesSection from '../ui/ReactiveAbilitiesSection';
import { getUnitReminders, deduplicateRemindersByName, getReactiveUnits } from '../../lib/rules-engine/reminder-utils';
import { formatUnitForCard } from '../../lib/unit-utils';
import ArmyChoiceSelector from '../ui/ArmyChoiceSelector';
import EnemyUnitSelector from '../ui/EnemyUnitSelector';
import { Rule, ChoiceRuleType } from '../../lib/rules-engine/types';
import { getPendingCommandChoiceRules } from '../../lib/command-choice-utils';

interface CommandPhaseProps {
  gameId: string;
  army: {
    id: string;
    name: string;
    faction?: string;
    unitIds?: string[];
  };
  currentUserArmy?: {
    id: string;
    name: string;
    faction?: string;
    unitIds?: string[];
  };
  currentPlayer: {
    id: string;
    userId: string;
    name: string;
  };
  currentUser: any;
  game: {
    currentTurn: number;
    currentPhase: string;
  };
  players: any[];
}

export default function CommandPhase({ gameId, army, currentUserArmy, currentPlayer, currentUser, game, players }: CommandPhaseProps) {
  const { isOpen, rule, showRule, hideRule } = useRulePopup();

  // Query army states/rules for the currently active phase army.
  // Note: Query from armies with states link, not armyStates directly.
  const { data: armyStatesData } = db.useQuery(
    army?.id ? {
      armies: {
        states: {},
        armyRules: {}, // Query army-level rules
        $: {
          where: {
            id: army.id
          }
        }
      }
    } : {}
  );

  // Query for units with command phase abilities
  const { data: unitsData } = db.useQuery({
    armies: {
      units: {
        unitRules: {},
        models: {
          modelRules: {},
          weapons: {
            weaponRules: {}
          }
        },
      },
      $: {
        where: {
          id: army.id
        }
      }
    },
    games: {
      destroyedUnits: {},
      armies: {
        units: {
          unitRules: {},
          models: {
            modelRules: {},
            weapons: {
              weaponRules: {}
            }
          }
        }
      },
      $: {
        where: {
          id: gameId
        }
      }
    }
  });

  const armyWithStates = armyStatesData?.armies?.[0];
  const waaaghState = armyWithStates?.states?.find((s: any) => s.state === 'waaagh-active');
  const hasWaaagh = army?.faction?.toLowerCase() === 'orks';
  const waaaghAlreadyDeclared = !!waaaghState;
  const isCurrentPlayer = currentPlayer?.userId === currentUser?.id;

  // Expire army states at the start of command phase if they should expire
  useEffect(() => {
    if (!armyWithStates?.states || !isCurrentPlayer) return;

    // Check if Waaagh should expire (activated in a previous turn and should expire in command phase)
    const statesToExpire = armyWithStates.states.filter((state: any) => {
      // Skip if no expiration phase set
      if (!state.expiresPhase) return false;

      // Only expire if:
      // 1. We're in the command phase (which we are)
      // 2. It was activated in a previous turn (not this turn)
      // 3. The expiration phase matches current phase
      return state.expiresPhase === 'command' && state.activatedTurn < game.currentTurn;
    });

    if (statesToExpire.length > 0) {
      console.log(`🔄 Expiring ${statesToExpire.length} army states at start of command phase`);
      const transactions = statesToExpire.map((state: any) =>
        db.tx.armyStates[state.id].delete()
      );
      db.transact(transactions);
    }
  }, [game.currentTurn, isCurrentPlayer, armyWithStates?.states]);

  // Get units with command phase abilities
  const allUnits = unitsData?.armies[0]?.units || [];
  const destroyedUnitIds = new Set((unitsData?.games?.[0]?.destroyedUnits || []).map((u: any) => u.id));

  // Filter out destroyed units
  const units = allUnits.filter((unit: any) => !destroyedUnitIds.has(unit.id));

  // Get units with command phase reminders
  const armyStates = armyWithStates?.states || [];
  const unitsWithReminders = units.filter((unit: any) =>
    getUnitReminders(unit, 'command', 'own', armyStates).length > 0
  );

  // Get all armies in the game for reactive abilities
  const allGameArmies = unitsData?.games?.[0]?.armies || [];

  // Get non-active player armies
  const nonActiveArmies = allGameArmies.filter((a: any) => a.id !== army.id);

  // Get units with reactive command abilities (marked with reactive: true)
  const reactiveUnits = getReactiveUnits(nonActiveArmies, 'command')
    .filter((unit: any) => !destroyedUnitIds.has(unit.id));

  const updatePoints = (playerId: string, field: 'victoryPoints' | 'commandPoints', delta: number) => {
    const player = players.find(p => p.id === playerId);
    if (!player) return;

    const currentValue = player[field] || 0;
    const newValue = currentValue + delta;

    // Don't allow going below 0
    if (newValue < 0) return;

    db.transact(
      db.tx.players[playerId].update({
        [field]: newValue
      })
    );
  };

  const declareWaaagh = async () => {
    if (!army?.id) return;

    // Waaagh lasts until the player's next command phase (a full game round)
    await db.transact([
      db.tx.armyStates[id()].update({
        state: 'waaagh-active',
        activatedTurn: game.currentTurn,
        expiresPhase: 'command', // Expires at the start of next command phase
      }).link({ army: army.id })
    ]);
  };

  // Get army-level rules for choices and targeting
  const armyRulesData = armyWithStates?.armyRules || [];

  const parseRuleObject = (ruleObject?: string): Rule[] => {
    if (!ruleObject) return [];
    try {
      const parsed = JSON.parse(ruleObject);
      return Array.isArray(parsed) ? parsed : [parsed];
    } catch (e) {
      console.error('Failed to parse rule object:', e);
      return [];
    }
  };

  const linkedArmyRules: Rule[] = armyRulesData
    .flatMap((ruleData: any) => parseRuleObject(ruleData.ruleObject))
    .filter((r: Rule | null): r is Rule => r !== null);

  // Some imported army-scope rules can be linked to units based on source placement.
  // Pull those in so command-phase army choices (e.g. Death Guard plague) still appear.
  const unitLinkedArmyScopeRules: Rule[] = units
    .flatMap((unit: any) => unit.unitRules || [])
    .flatMap((ruleData: any) => parseRuleObject(ruleData.ruleObject))
    .filter((r: Rule | null): r is Rule => r !== null)
    .filter((rule: Rule) => rule.scope === 'army');

  const armyRulesById = new Map<string, Rule>();
  for (const rule of [...linkedArmyRules, ...unitLinkedArmyScopeRules]) {
    armyRulesById.set(rule.id, rule);
  }
  const armyRules: Rule[] = Array.from(armyRulesById.values())
    .filter((r: Rule | null): r is Rule => r !== null);

  // Filter for command phase choice rules that need action
  const commandChoiceRules: ChoiceRuleType[] = getPendingCommandChoiceRules(
    armyRules,
    armyStates as any,
    game.currentTurn
  );

  // Filter for targeting rules that need action (like Oath of Moment)
  const targetingRules = armyRules.filter(rule => {
    if (rule.kind !== 'passive') return false;
    if (rule.scope !== 'army') return false;
    if (!rule.when || rule.when.t !== 'isTargetedUnit') return false;
    if (!rule.trigger) return false;
    if (rule.trigger.phase !== 'command' && !Array.isArray(rule.trigger.phase)) return false;
    if (Array.isArray(rule.trigger.phase) && !rule.trigger.phase.includes('command')) return false;

    // Check if target already set this turn
    const existingTarget = armyStates.find((s: any) =>
      s.state === rule.id && s.targetUnitId
    );

    // Show if no target set, or if it was set in a previous turn and should be renewed
    return !existingTarget || existingTarget.activatedTurn < game.currentTurn;
  });

  // Handle choice selection
  const handleChoiceSelection = async (ruleId: string, choiceId: string, optionValue: string) => {
    if (!army?.id) return;

    await db.transact([
      db.tx.armyStates[id()].update({
        state: choiceId,
        choiceValue: optionValue,
        activatedTurn: game.currentTurn,
        // Choices with game lifetime don't expire
        // Choices with phase lifetime expire at next command phase
        expiresPhase: undefined, // Will add phase-based expiration in future iteration
      }).link({ army: army.id })
    ]);
  };

  // Handle enemy unit targeting
  const handleTargetSelection = async (ruleId: string, targetUnitId: string) => {
    if (!army?.id) return;

    await db.transact([
      db.tx.armyStates[id()].update({
        state: ruleId,
        targetUnitId: targetUnitId,
        activatedTurn: game.currentTurn,
        expiresPhase: 'command', // Most targeting abilities expire at next command phase
      }).link({ army: army.id })
    ]);
  };

  // Get enemy units for targeting
  const enemyUnits = allGameArmies
    .filter((a: any) => a.id !== army.id)
    .flatMap((a: any) => a.units || [])
    .filter((unit: any) => !destroyedUnitIds.has(unit.id));

  return (
    <div className="space-y-6">
      <div className="bg-gray-800 rounded-lg p-4">
        <h2 className="text-lg font-semibold text-white mb-2">Command Phase</h2>
        <p className="text-gray-400 text-sm">
          Manage Victory Points and Command Points for all players.
        </p>
      </div>

      {/* WAAAGH Button */}
      {hasWaaagh && isCurrentPlayer && !waaaghAlreadyDeclared && (
        <button
          onClick={declareWaaagh}
          className="w-full bg-gradient-to-br from-green-700 via-green-600 to-green-800 hover:from-green-600 hover:via-green-500 hover:to-green-700 text-white font-black py-10 px-8 rounded-2xl transition-all transform hover:scale-105 active:scale-95 shadow-2xl uppercase tracking-wider border-4 border-green-400 font-skranji overflow-hidden"
        >
          <div className="text-2xl mb-1">DECLARE</div>
          <div className="text-[12vw] md:text-[8vw] lg:text-[6vw] whitespace-nowrap" style={{ lineHeight: '1' }}>WAAAGH!!!!</div>
        </button>
      )}

      {/* Show WAAAGH status if already declared (only for current player) */}
      {hasWaaagh && waaaghAlreadyDeclared && isCurrentPlayer && (
        <div className="bg-gradient-to-br from-green-700 via-green-600 to-green-800 rounded-2xl p-8 border-4 border-green-400 shadow-2xl overflow-hidden">
          <div className="text-center">
            <div className="text-white font-black text-[10vw] md:text-[6vw] lg:text-[4vw] mb-2 uppercase tracking-wider font-skranji">
              <div className="whitespace-nowrap">WAAAGH!</div>
              <div className="whitespace-nowrap">ACTIVE</div>
            </div>
            <p className="text-green-100 text-sm font-semibold">
              Declared in turn {waaaghState.activatedTurn}
            </p>
          </div>
        </div>
      )}

      {/* Army-Wide Choice Rules (Hyper Adaptations, etc.) */}
      {isCurrentPlayer && commandChoiceRules.map(rule => {
        const existingState = armyStates.find((s: any) => s.state === rule.choice.id);
        const currentSelection = existingState?.choiceValue;

        return (
          <ArmyChoiceSelector
            key={rule.id}
            rule={rule}
            currentSelection={currentSelection}
            onSelect={(optionValue) => handleChoiceSelection(rule.id, rule.choice.id, optionValue)}
            disabled={!!currentSelection} // Disable once selected (for once-per-battle)
          />
        );
      })}

      {/* Enemy Unit Targeting (Oath of Moment, etc.) */}
      {isCurrentPlayer && targetingRules.map(rule => {
        const existingTarget = armyStates.find((s: any) =>
          s.state === rule.id && s.targetUnitId
        );
        const currentTargetId = existingTarget?.targetUnitId;

        return (
          <EnemyUnitSelector
            key={rule.id}
            ruleId={rule.id}
            ruleName={rule.name}
            ruleDescription={rule.description}
            enemyUnits={enemyUnits}
            currentTargetId={currentTargetId}
            onSelect={(unitId) => handleTargetSelection(rule.id, unitId)}
          />
        );
      })}

      {/* Player Score Tracking */}
      <div className="space-y-4">
        {players.map((player) => (
          <div key={player.id} className="bg-gray-800 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-white mb-4">{player.name}</h3>

            <div className="grid grid-cols-2 gap-6">
              {/* Victory Points */}
              <div>
                <div className="text-sm text-gray-400 mb-2">Victory Points</div>
                <div className="flex items-center space-x-3">
                  <button
                    onClick={() => updatePoints(player.id, 'victoryPoints', -1)}
                    disabled={(player.victoryPoints || 0) === 0}
                    className="bg-red-600 hover:bg-red-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-bold w-10 h-10 rounded-lg transition-colors"
                  >
                    −
                  </button>
                  <div className="text-3xl font-bold text-white min-w-[60px] text-center">
                    {player.victoryPoints || 0}
                  </div>
                  <button
                    onClick={() => updatePoints(player.id, 'victoryPoints', 1)}
                    className="bg-green-600 hover:bg-green-700 text-white font-bold w-10 h-10 rounded-lg transition-colors"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Command Points */}
              <div>
                <div className="text-sm text-gray-400 mb-2">Command Points</div>
                <div className="flex items-center space-x-3">
                  <button
                    onClick={() => updatePoints(player.id, 'commandPoints', -1)}
                    disabled={(player.commandPoints || 0) === 0}
                    className="bg-red-600 hover:bg-red-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-bold w-10 h-10 rounded-lg transition-colors"
                  >
                    −
                  </button>
                  <div className="text-3xl font-bold text-white min-w-[60px] text-center">
                    {player.commandPoints || 0}
                  </div>
                  <button
                    onClick={() => updatePoints(player.id, 'commandPoints', 1)}
                    className="bg-green-600 hover:bg-green-700 text-white font-bold w-10 h-10 rounded-lg transition-colors"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Command Phase Abilities */}
      {unitsWithReminders.length > 0 && (
        <div className="space-y-4">
          <div className="bg-gray-800 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-white mb-1">Command Phase Abilities</h3>
            <p className="text-gray-400 text-sm">
              Units with abilities that activate in the command phase
            </p>
          </div>

          {unitsWithReminders.map(unit => {
            const unitData = formatUnitForCard(unit);
            const rawReminders = getUnitReminders(unit, 'command', 'own', armyStates);
            const unitReminders = deduplicateRemindersByName(rawReminders);

            return (
              <div key={unit.id} className={`bg-gray-800 rounded-lg overflow-hidden ${!isCurrentPlayer ? 'opacity-60' : ''}`}>
                <UnitCard
                  unit={unitData.unit}
                  expandable={true}
                  defaultExpanded={false}
                  className="border-0"
                />

                {/* Reminders */}
                {unitReminders.length > 0 && (
                  <div className="border-t border-gray-700 p-4">
                    <div className="flex items-center gap-3">
                      <div className="flex flex-wrap gap-2">
                        {unitReminders.map((reminder) => (
                          <ReminderBadge
                            key={reminder.id}
                            rule={reminder}
                            onClick={() => showRule(reminder.name, reminder.description)}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Reactive Abilities Section */}
      <ReactiveAbilitiesSection
        reactiveUnits={reactiveUnits}
        currentPhase="command"
        phaseLabel="command"
      />

      {/* Rule Popup */}
      <RulePopup
        isOpen={isOpen}
        onClose={hideRule}
        rule={rule}
      />
    </div>
  );
} 
