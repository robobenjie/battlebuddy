'use client';

import { db } from '../../lib/db';
import { id } from '@instantdb/react';
import UnitCard from '../ui/UnitCard';
import ReminderBadge from '../ui/ReminderBadge';
import { useRulePopup } from '../ui/RulePopup';
import RulePopup from '../ui/RulePopup';
import { getUnitsWithReminders, getUnitReminders } from '../../lib/rules-engine/reminder-utils';
import { formatUnitForCard } from '../../lib/unit-utils';

interface CommandPhaseProps {
  gameId: string;
  army: {
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

export default function CommandPhase({ gameId, army, currentPlayer, currentUser, game, players }: CommandPhaseProps) {
  const { isOpen, rule, showRule, hideRule } = useRulePopup();

  // Query for army states to check if WAAAGH has been declared
  const { data: armyStatesData } = db.useQuery(
    army?.id ? {
      armyStates: {
        $: {
          where: {
            armyId: army.id,
            state: 'waaagh-active'
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

  const waaaghState = armyStatesData?.armyStates?.[0];
  const hasWaaagh = army?.faction?.toLowerCase() === 'orks';
  const waaaghAlreadyDeclared = !!waaaghState;
  const isCurrentPlayer = currentPlayer?.userId === currentUser?.id;

  // Get units with command phase abilities
  const allUnits = unitsData?.armies[0]?.units || [];
  const destroyedUnitIds = new Set((unitsData?.games?.[0]?.destroyedUnits || []).map((u: any) => u.id));

  // Filter out destroyed units
  const units = allUnits.filter((unit: any) => !destroyedUnitIds.has(unit.id));

  // Get units with command phase reminders
  const unitsWithReminders = units.filter((unit: any) =>
    getUnitReminders(unit, 'command', 'own').length > 0
  );

  // Get all armies in the game for reactive abilities
  const allGameArmies = unitsData?.games?.[0]?.armies || [];

  // Get non-active player armies
  const nonActiveArmies = allGameArmies.filter((a: any) => a.id !== army.id);

  // Get units with reactive command abilities (opponent turn)
  const reactiveUnits = getUnitsWithReminders(nonActiveArmies, 'command', 'opponent')
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

    await db.transact([
      db.tx.armyStates[id()].update({
        armyId: army.id,
        state: 'waaagh-active',
        activatedTurn: game.currentTurn,
      })
    ]);
  };

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

      {/* Show WAAAGH status if already declared */}
      {hasWaaagh && waaaghAlreadyDeclared && (
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
            const unitReminders = getUnitReminders(unit, 'command', 'own');

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
      {reactiveUnits.length > 0 && (
        <div className="space-y-4">
          <div className="bg-gray-800 rounded-lg p-4 border-l-4 border-purple-500">
            <h3 className="text-lg font-semibold text-purple-300 mb-1">Reactive Abilities</h3>
            <p className="text-gray-400 text-sm">
              Opponent units with reactive command abilities this phase
            </p>
          </div>

          {reactiveUnits.map(unit => {
            const unitData = formatUnitForCard(unit);
            return (
              <div key={unit.id} className="bg-gray-800/50 rounded-lg overflow-hidden border border-purple-500/30">
                <UnitCard
                  unit={unitData.unit}
                  expandable={true}
                  defaultExpanded={false}
                  className="border-0"
                  currentPhase="command"
                  currentTurn="opponent"
                />
                <div className="border-t border-gray-700/50 p-3 bg-gray-900/30">
                  <p className="text-xs text-gray-400 italic">
                    {unit.armyName ? `${unit.armyName} - ` : ''}No action buttons for opponent units
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Rule Popup */}
      <RulePopup
        isOpen={isOpen}
        onClose={hideRule}
        rule={rule}
      />
    </div>
  );
} 