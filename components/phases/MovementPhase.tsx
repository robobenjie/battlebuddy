'use client';

import { useState } from 'react';
import { db } from '../../lib/db';
import UnitCard from '../ui/UnitCard';
import { getModelsForUnit, getWeaponsForUnit, formatUnitForCard, getUnitMovement } from '../../lib/unit-utils';

interface MovementPhaseProps {
  gameId: string;
  army: {
    id: string;
    name: string;
    unitIds: string[];
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

  // Query units for this army in the game
  const { data: unitsData } = db.useQuery({
    units: {
      $: {
        where: {
          armyId: army.id,
          gameId: gameId,
        }
      }
    }
  });

  // Query models for these units
  const { data: modelsData } = db.useQuery({
    models: {
      $: {
        where: {
          gameId: gameId,
        }
      }
    }
  });

  // Query weapons for these models
  const { data: weaponsData } = db.useQuery({
    weapons: {
      $: {
        where: {
          gameId: gameId,
        }
      }
    }
  });

  const units = unitsData?.units || [];
  const models = modelsData?.models || [];
  const weapons = weaponsData?.weapons || [];

  // Check if current user is the active player
  const isActivePlayer = currentUser?.id === currentPlayer.userId;

  // Helper function to record an action in turn history
  const recordAction = async (unitId: string, action: string) => {
    const unit = units.find(u => u.id === unitId);
    if (!unit) return;

    const actionRecord = {
      turn: game.currentTurn,
      phase: game.currentPhase,
      action: action,
      timestamp: Date.now()
    };

    const updatedHistory = [...(unit.turnHistory || []), actionRecord];

    await db.transact([
      db.tx.units[unitId].update({
        turnHistory: updatedHistory,
        lastActionTurn: game.currentTurn
      })
    ]);
  };

  // Handle movement action
  const handleMove = async (unitId: string) => {
    setIsProcessing(true);
    try {
      await db.transact([
        db.tx.units[unitId].update({
          hasMoved: true
        })
      ]);
      
      await recordAction(unitId, 'moved');
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
      await db.transact([
        db.tx.units[unitId].update({
          hasMoved: true,
          hasAdvanced: true
        })
      ]);
      
      await recordAction(unitId, 'advanced');
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
      const unit = units.find(u => u.id === unitId);
      if (!unit || !unit.turnHistory) return;

      // Find the last action for this turn
      const currentTurnActions = unit.turnHistory.filter(
        (action: any) => action.turn === game.currentTurn && action.phase === game.currentPhase
      );

      if (currentTurnActions.length === 0) return;

      // Remove the last action
      const updatedHistory = unit.turnHistory.filter(
        (action: any) => !(action.turn === game.currentTurn && 
                          action.phase === game.currentPhase && 
                          action.timestamp === currentTurnActions[currentTurnActions.length - 1].timestamp)
      );

      // Reset movement flags based on remaining actions
      const remainingActions = updatedHistory.filter(
        (action: any) => action.turn === game.currentTurn && action.phase === game.currentPhase
      );

      const hasMoved = remainingActions.some((action: any) => action.action === 'moved' || action.action === 'advanced');
      const hasAdvanced = remainingActions.some((action: any) => action.action === 'advanced');

      await db.transact([
        db.tx.units[unitId].update({
          hasMoved: hasMoved,
          hasAdvanced: hasAdvanced,
          turnHistory: updatedHistory,
          lastActionTurn: remainingActions.length > 0 ? game.currentTurn : null
        })
      ]);
    } catch (error) {
      console.error('Error undoing action:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  // Check if unit has any actions this turn/phase
  const hasActionsThisTurn = (unit: any) => {
    if (!unit.turnHistory) return false;
    return unit.turnHistory.some(
      (action: any) => action.turn === game.currentTurn && action.phase === game.currentPhase
    );
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
          const unitData = formatUnitForCard(unit, models, weapons);
          const movement = getUnitMovement(models, unit.id);
          const hasActions = hasActionsThisTurn(unit);
          
          return (
            <div key={unit.id} className={`bg-gray-800 rounded-lg overflow-hidden ${!isActivePlayer ? 'opacity-60' : ''}`}>
              <UnitCard
                unit={unitData.unit}
                models={unitData.models}
                weapons={unitData.weapons}
                expandable={true}
                defaultExpanded={false}
                className="border-0"
              />
              
              {/* Movement Controls */}
              <div className="border-t border-gray-700 p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    {/* Status indicators */}
                    <div className="flex items-center space-x-2 text-sm">
                      {unit.hasMoved && (
                        <span className={`px-2 py-1 rounded text-xs ${
                          unit.hasAdvanced 
                            ? 'bg-orange-600 text-orange-100'  // Match advance button color
                            : 'bg-blue-600 text-blue-100'     // Match move button color
                        }`}>
                          {unit.hasAdvanced ? 'Advanced' : 'Moved'}
                        </span>
                      )}
                      {unit.isDestroyed && (
                        <span className="bg-red-600 text-red-100 px-2 py-1 rounded text-xs">
                          Destroyed
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center space-x-3">
                    {/* Movement buttons */}
                    {!unit.isDestroyed && (
                      <>
                        <button
                          onClick={() => handleMove(unit.id)}
                          disabled={!isActivePlayer || isProcessing || unit.hasMoved}
                          className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:text-gray-400 text-white font-semibold py-2 px-4 rounded-lg transition-colors text-sm disabled:cursor-not-allowed"
                        >
                          {movement ? `Move ${movement}"` : 'Move'}
                        </button>
                        
                        <button
                          onClick={() => handleAdvance(unit.id)}
                          disabled={!isActivePlayer || isProcessing || unit.hasMoved}
                          className="bg-orange-600 hover:bg-orange-700 disabled:bg-gray-600 disabled:text-gray-400 text-white font-semibold py-2 px-4 rounded-lg transition-colors text-sm disabled:cursor-not-allowed"
                        >
                          Advance
                        </button>
                      </>
                    )}
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
    </div>
  );
} 