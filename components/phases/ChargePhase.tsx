'use client';

import { useState } from 'react';
import { db } from '../../lib/db';
import { id } from '@instantdb/react';
import UnitCard from '../ui/UnitCard';
import { formatUnitForCard } from '../../lib/unit-utils';

interface ChargePhaseProps {
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

export default function ChargePhase({ gameId, army, currentPlayer, currentUser, game }: ChargePhaseProps) {
  const [isProcessing, setIsProcessing] = useState(false);

  // Query units for this army in the game and destroyed units list
  const { data: unitsData } = db.useQuery({
    armies: {
      units: {
        models: {
          weapons: {}
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
      $: {
        where: {
          id: gameId
        }
      }
    }
  });

  const allUnits = unitsData?.armies[0]?.units || [];
  const destroyedUnitIds = new Set((unitsData?.games?.[0]?.destroyedUnits || []).map((u: any) => u.id));

  // Filter out destroyed units
  const units = allUnits.filter((unit: any) => !destroyedUnitIds.has(unit.id));

  // Check if current user is the active player
  const isActivePlayer = currentUser?.id === currentPlayer.userId;

  // Helper function to check if unit has charged this turn
  const hasChargedThisTurn = (unitId: string) => {
    const unit = units.find(u => u.id === unitId);
    if (!unit || !unit.statuses) return false;
    return unit.statuses.some((status: any) =>
      status.name === 'charged' &&
      status.turns && status.turns.includes(game.currentTurn)
    );
  };

  // Helper function to check if unit has advanced this turn
  const hasAdvancedThisTurn = (unitId: string) => {
    const unit = units.find(u => u.id === unitId);
    if (!unit || !unit.statuses) return false;
    return unit.statuses.some((status: any) =>
      status.name === 'advanced' &&
      status.turns && status.turns.includes(game.currentTurn)
    );
  };

  // Helper function to create unit status for current turn
  const createUnitStatus = async (unitId: string, statusName: string) => {
    await db.transact([
      db.tx.unitStatuses[id()].update({
        unitId: unitId,
        name: statusName,
        turns: [game.currentTurn],
        rules: []
      }).link({ unit: unitId })
    ]);
  };

  // Helper function to delete unit statuses for current turn
  const deleteUnitStatusesForTurn = async (unitId: string) => {
    const unit = units.find(u => u.id === unitId);
    if (!unit || !unit.statuses) return;

    const statusesToDelete = unit.statuses.filter((status: any) =>
      status.name === 'charged' &&
      status.turns && status.turns.includes(game.currentTurn)
    );

    if (statusesToDelete.length > 0) {
      await db.transact(
        statusesToDelete.map((status: any) =>
          db.tx.unitStatuses[status.id].delete()
        )
      );
    }
  };

  // Handle charge action
  const handleCharge = async (unitId: string) => {
    setIsProcessing(true);
    try {
      await createUnitStatus(unitId, 'charged');
    } catch (error) {
      console.error('Error recording charge:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle undo action
  const handleUndo = async (unitId: string) => {
    setIsProcessing(true);
    try {
      await deleteUnitStatusesForTurn(unitId);
    } catch (error) {
      console.error('Error undoing charge:', error);
    } finally {
      setIsProcessing(false);
    }
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
        <h2 className="text-lg font-semibold text-white mb-2">Charge Phase</h2>
        <p className="text-gray-400 text-sm">
          Declare charges with your units. Charged units will fight first in the Fight Phase.
        </p>
      </div>

      <div className="space-y-4">
        {units.map(unit => {
          const unitData = formatUnitForCard(unit);
          const hasCharged = hasChargedThisTurn(unit.id);
          const hasAdvanced = hasAdvancedThisTurn(unit.id);

          return (
            <div key={unit.id} className={`bg-gray-800 rounded-lg overflow-hidden ${!isActivePlayer ? 'opacity-60' : ''}`}>
              <UnitCard
                unit={unitData.unit}
                expandable={true}
                defaultExpanded={false}
                className="border-0"
              />

              {/* Charge Controls */}
              <div className="border-t border-gray-700 p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    {/* Status indicators */}
                    <div className="flex items-center space-x-2 text-sm">
                      {hasCharged && (
                        <span className="px-2 py-1 rounded text-xs bg-green-600 text-green-100">
                          Charged
                        </span>
                      )}
                      {hasAdvanced && (
                        <span className="px-2 py-1 rounded text-xs bg-orange-600 text-orange-100">
                          Advanced
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center space-x-3">
                    {/* Charge button */}
                    <button
                      onClick={() => handleCharge(unit.id)}
                      disabled={!isActivePlayer || hasCharged}
                      className="bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:text-gray-400 text-white font-semibold py-2 px-4 rounded-lg transition-colors text-sm disabled:cursor-not-allowed"
                    >
                      Charge
                    </button>
                  </div>
                </div>

                {/* Undo link */}
                {hasCharged && isActivePlayer && (
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
    </div>
  );
}
