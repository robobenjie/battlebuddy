'use client';

import { useState } from 'react';
import { db } from '../../lib/db';
import { id } from '@instantdb/react';
import UnitCard from '../ui/UnitCard';
import { formatUnitForCard, getUnitMovement, getModifiedMovement, sortUnitsByPriority } from '../../lib/unit-utils';
import { getUnitsWithReminders, getUnitReminders } from '../../lib/rules-engine/reminder-utils';
import ReminderBadge from '../ui/ReminderBadge';
import { useRulePopup } from '../ui/RulePopup';
import RulePopup from '../ui/RulePopup';

interface MovementPhaseProps {
  gameId: string;
  army: {
    id: string;
    name: string;
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
}

export default function MovementPhase({ gameId, army, currentPlayer, currentUser, game }: MovementPhaseProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const { isOpen, rule, showRule, hideRule } = useRulePopup();

  // Query units for this army in the game and destroyed units list
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
        statuses: {},
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

  // Query army states to check for conditional modifiers (like WAAAGH!)
  const { data: armyStatesData } = db.useQuery(
    army?.id ? {
      armyStates: {
        $: {
          where: {
            armyId: army.id
          }
        }
      }
    } : {}
  );

  const allUnits = unitsData?.armies[0]?.units || [];
  const destroyedUnitIds = new Set((unitsData?.games?.[0]?.destroyedUnits || []).map((u: any) => u.id));
  const armyStates = armyStatesData?.armyStates || [];

  // Filter out destroyed units and sort
  const units = sortUnitsByPriority(
    allUnits.filter((unit: any) => !destroyedUnitIds.has(unit.id)),
    destroyedUnitIds
  );

  // Check if current user is the active player
  const isActivePlayer = currentUser?.id === currentPlayer.userId;

  // Get all armies in the game for reactive abilities
  const allGameArmies = unitsData?.games?.[0]?.armies || [];

  // Get non-active player armies
  const nonActiveArmies = allGameArmies.filter((a: any) => a.id !== army.id);

  // Get units with reactive movement abilities (opponent turn)
  const reactiveUnits = getUnitsWithReminders(nonActiveArmies, 'movement', 'opponent')
    .filter((unit: any) => !destroyedUnitIds.has(unit.id));

  // Helper function to check if unit has moved this player's turn
  const hasMovedThisTurn = (unitId: string) => {
    const unit = units.find(u => u.id === unitId);
    if (!unit || !unit.statuses) return false;
    const turnPlayerId = `${game.currentTurn}-${currentPlayer.id}`;
    return unit.statuses.some((status: any) =>
      (status.name === 'moved' || status.name === 'advanced') &&
      status.turns && status.turns.includes(turnPlayerId)
    );
  };

  // Helper function to check if unit has advanced this player's turn
  const hasAdvancedThisTurn = (unitId: string) => {
    const unit = units.find(u => u.id === unitId);
    if (!unit || !unit.statuses) return false;
    const turnPlayerId = `${game.currentTurn}-${currentPlayer.id}`;
    return unit.statuses.some((status: any) =>
      status.name === 'advanced' && status.turns && status.turns.includes(turnPlayerId)
    );
  };

  // Helper function to create unit status for current player's turn
  const createUnitStatus = async (unitId: string, statusName: string) => {
    const turnPlayerId = `${game.currentTurn}-${currentPlayer.id}`;
    await db.transact([
      db.tx.unitStatuses[id()].update({
        unitId: unitId,
        name: statusName,
        turns: [turnPlayerId],
        rules: []
      }).link({ unit: unitId })
    ]);
  };

  // Helper function to delete unit statuses for current player's turn
  const deleteUnitStatusesForTurn = async (unitId: string) => {
    const unit = units.find(u => u.id === unitId);
    if (!unit || !unit.statuses) return;

    const turnPlayerId = `${game.currentTurn}-${currentPlayer.id}`;
    const statusesToDelete = unit.statuses.filter((status: any) =>
      status.turns && status.turns.includes(turnPlayerId)
    );

    if (statusesToDelete.length > 0) {
      await db.transact(
        statusesToDelete.map((status: any) =>
          db.tx.unitStatuses[status.id].delete()
        )
      );
    }
  };

  // Handle movement action
  const handleMove = async (unitId: string) => {
    setIsProcessing(true);
    try {
      await createUnitStatus(unitId, 'moved');
    } catch (error) {
      console.error('Error recording move:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle advance action
  const handleAdvance = async (unitId: string) => {
    setIsProcessing(true);
    try {
      // Advance only creates an 'advanced' status (which implies movement)
      await createUnitStatus(unitId, 'advanced');
    } catch (error) {
      console.error('Error recording advance:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle undo last action
  const handleUndo = async (unitId: string) => {
    setIsProcessing(true);
    try {
      // Delete all statuses for the current turn
      await deleteUnitStatusesForTurn(unitId);
    } catch (error) {
      console.error('Error undoing action:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  // Check if unit has any actions this turn/phase
  const hasActionsThisTurn = (unitId: string) => {
    return hasMovedThisTurn(unitId) || hasAdvancedThisTurn(unitId);
  };

  if (units.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-400">No units found for this army.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-gray-800 rounded-lg p-4">
        <h2 className="text-lg font-semibold text-white mb-2">Movement Phase</h2>
        <p className="text-gray-400 text-sm">
          Move your units across the battlefield. Units can either move normally or advance for extra distance.
        </p>
      </div>

      <div className="space-y-4">
        {units.map(unit => {
          const unitData = formatUnitForCard(unit);
          const baseMovement = getUnitMovement(unit);
          const movement = getModifiedMovement(unit, armyStates);
          const hasMoved = hasMovedThisTurn(unit.id);
          const hasAdvanced = hasAdvancedThisTurn(unit.id);
          const hasActions = hasActionsThisTurn(unit.id);

          // Get reminders for this unit
          const unitReminders = getUnitReminders(unit, 'movement', 'own');

          return (
            <div key={unit.id} className={`bg-gray-800 rounded-lg overflow-hidden ${!isActivePlayer ? 'opacity-60' : ''}`}>
              <UnitCard
                unit={unitData.unit}
                expandable={true}
                defaultExpanded={false}
                className="border-0"
              />

              {/* Movement Controls */}
              <div className="border-t border-gray-700 p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {/* Reminders */}
                    {unitReminders.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {unitReminders.map((reminder) => (
                          <ReminderBadge
                            key={reminder.id}
                            rule={reminder}
                            onClick={() => showRule(reminder.name, reminder.description)}
                          />
                        ))}
                      </div>
                    )}

                    {/* Status indicators */}
                    {hasMoved && (
                      <span className={`px-2 py-1 rounded text-xs ${
                        hasAdvanced
                          ? 'bg-orange-600 text-orange-100'  // Match advance button color
                          : 'bg-blue-600 text-blue-100'     // Match move button color
                      }`}>
                        {hasAdvanced ? 'Advanced' : 'Moved'}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center space-x-3">
                    {/* Movement buttons */}
                    <button
                      onClick={() => handleMove(unit.id)}
                      disabled={!isActivePlayer || hasMoved}
                      className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:text-gray-400 text-white font-semibold py-2 px-4 rounded-lg transition-colors text-sm disabled:cursor-not-allowed"
                    >
                      {movement ? `Move ${movement}"` : 'Move'}
                    </button>
                    
                    <button
                      onClick={() => handleAdvance(unit.id)}
                      disabled={!isActivePlayer || hasAdvanced}
                      className="bg-orange-600 hover:bg-orange-700 disabled:bg-gray-600 disabled:text-gray-400 text-white font-semibold py-2 px-4 rounded-lg transition-colors text-sm disabled:cursor-not-allowed"
                    >
                      Advance
                    </button>
                  </div>
                </div>

                {/* Undo link */}
                {hasActions && isActivePlayer && (
                  <div className="mt-2 text-center">
                    <button
                      onClick={() => handleUndo(unit.id)}
                      disabled={isProcessing}
                      className="text-xs text-blue-400 hover:text-blue-300 underline disabled:text-gray-500"
                    >
                      undo
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Reactive Abilities Section */}
      {reactiveUnits.length > 0 && (
        <div className="space-y-4">
          <div className="bg-gray-800 rounded-lg p-4 border-l-4 border-purple-500">
            <h3 className="text-lg font-semibold text-purple-300 mb-1">Reactive Abilities</h3>
            <p className="text-gray-400 text-sm">
              Opponent units with reactive movement abilities this phase
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
                  currentPhase="movement"
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