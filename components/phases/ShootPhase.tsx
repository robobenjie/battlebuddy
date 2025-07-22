'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { db } from '../../lib/db';
import UnitCard from '../ui/UnitCard';
import { getModelsForUnit, getWeaponsForUnit, formatUnitForCard, hasUnfiredWeapons, getUnitWeapons, getUnitFiringStatus } from '../../lib/unit-utils';

interface ShootPhaseProps {
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

export default function ShootPhase({ gameId, army, currentPlayer, currentUser, game }: ShootPhaseProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const router = useRouter();

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



  // Helper function to record a shooting action for weapons
  const recordWeaponShooting = async (unitId: string) => {
    const unitWeapons = getUnitWeapons(weapons, models, unitId);
    const unfiredWeapons = unitWeapons.filter(w => !w.hasShot);
    
    if (unfiredWeapons.length === 0) return;

    const actionRecord = {
      turn: game.currentTurn,
      phase: game.currentPhase,
      action: 'shot',
      timestamp: Date.now()
    };

    // Update all unfired weapons in this unit
    // Note: Each weapon row represents a weapon type, not individual weapons
    const updates = unfiredWeapons.map(weapon => ({
      id: weapon.id,
      hasShot: true,
      lastShotTurn: game.currentTurn,
      shotHistory: [...(weapon.shotHistory || []), actionRecord]
    }));

    await db.transact(updates.map(update => 
      db.tx.weapons[update.id].update({
        hasShot: update.hasShot,
        lastShotTurn: update.lastShotTurn,
        shotHistory: update.shotHistory
      })
    ));
  };

  // Handle shoot action for a unit
  const handleShoot = async (unitId: string) => {
    setIsProcessing(true);
    try {
      await recordWeaponShooting(unitId);
    } catch (error) {
      console.error('Error recording shot:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle undo last action for a unit
  const handleUndo = async (unitId: string) => {
    setIsProcessing(true);
    try {
      const unitWeapons = getUnitWeapons(weapons, models, unitId);
      
      // Find weapons that shot this turn/phase
      const weaponsThatShot = unitWeapons.filter(weapon => {
        if (!weapon.shotHistory) return false;
        return weapon.shotHistory.some(
          (action: any) => action.turn === game.currentTurn && action.phase === game.currentPhase
        );
      });

      if (weaponsThatShot.length === 0) return;

      // Remove the last action from each weapon that shot
      const updates = weaponsThatShot.map(weapon => {
        const currentTurnActions = weapon.shotHistory.filter(
          (action: any) => action.turn === game.currentTurn && action.phase === game.currentPhase
        );

        const updatedHistory = weapon.shotHistory.filter(
          (action: any) => !(action.turn === game.currentTurn && 
                            action.phase === game.currentPhase && 
                            action.timestamp === currentTurnActions[currentTurnActions.length - 1].timestamp)
        );

        const remainingActions = updatedHistory.filter(
          (action: any) => action.turn === game.currentTurn && action.phase === game.currentPhase
        );

        const hasShot = remainingActions.length > 0;
        const lastShotTurn = remainingActions.length > 0 ? game.currentTurn : null;

        return {
          id: weapon.id,
          hasShot: hasShot,
          lastShotTurn: lastShotTurn,
          shotHistory: updatedHistory
        };
      });

      await db.transact(updates.map(update => 
        db.tx.weapons[update.id].update({
          hasShot: update.hasShot,
          lastShotTurn: update.lastShotTurn,
          shotHistory: update.shotHistory
        })
      ));
    } catch (error) {
      console.error('Error undoing action:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  // Navigate to combat calculator
  const navigateToCombatCalculator = (unitId: string) => {
    router.push(`/game/${gameId}/combat-calculator?gameId=${gameId}&unitId=${unitId}`);
  };

  // Check if unit has any shooting actions this turn/phase
  const hasShootingActionsThisTurn = (unitId: string) => {
    const unitWeapons = getUnitWeapons(weapons, models, unitId);
    return unitWeapons.some(weapon => {
      if (!weapon.shotHistory) return false;
      return weapon.shotHistory.some(
        (action: any) => action.turn === game.currentTurn && action.phase === game.currentPhase
      );
    });
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
        <h2 className="text-lg font-semibold text-white mb-2">Shooting Phase</h2>
        <p className="text-gray-400 text-sm">
          Your units fire their ranged weapons at enemy targets. Use the combat calculator for detailed shooting mechanics.
        </p>
      </div>

      <div className="space-y-4">
        {units.map(unit => {
          const unitData = formatUnitForCard(unit, models, weapons);
          const hasUnfired = hasUnfiredWeapons(weapons, models, unit.id);
          const hasActions = hasShootingActionsThisTurn(unit.id);
          const unitWeapons = getUnitWeapons(weapons, models, unit.id);
          const firedWeapons = unitWeapons.filter(w => w.hasShot);
          
          // Calculate total weapon count (each weapon row represents one weapon type)
          const totalWeaponCount = unitWeapons.length;
          const firedWeaponCount = firedWeapons.length;
          
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
              
              {/* Shooting Controls */}
              <div className="border-t border-gray-700 p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    {/* Status indicators */}
                    <div className="flex items-center space-x-2 text-sm">
                      {firedWeaponCount > 0 && (
                        <span className="bg-green-600 text-green-100 px-2 py-1 rounded text-xs">
                          {firedWeaponCount === totalWeaponCount ? 'All Weapons Fired' : `${firedWeaponCount}/${totalWeaponCount} Weapons Fired`}
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
                    {/* Shooting buttons */}
                    {!unit.isDestroyed && hasUnfired && (
                      <>
                        <button
                          onClick={() => handleShoot(unit.id)}
                          disabled={!isActivePlayer || isProcessing}
                          className="bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:text-gray-400 text-white font-semibold py-2 px-4 rounded-lg transition-colors text-sm disabled:cursor-not-allowed"
                        >
                          Shoot
                        </button>
                        
                        <button
                          onClick={() => navigateToCombatCalculator(unit.id)}
                          disabled={!isActivePlayer || isProcessing}
                          className="bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 disabled:text-gray-400 text-white font-semibold py-2 px-4 rounded-lg transition-colors text-sm disabled:cursor-not-allowed"
                        >
                          Combat Calculator
                        </button>
                      </>
                    )}

                    {/* Undo button */}
                    {hasActions && !unit.isDestroyed && (
                      <button
                        onClick={() => handleUndo(unit.id)}
                        disabled={!isActivePlayer || isProcessing}
                        className="bg-gray-600 hover:bg-gray-700 disabled:bg-gray-500 disabled:text-gray-400 text-white font-semibold py-2 px-4 rounded-lg transition-colors text-sm disabled:cursor-not-allowed"
                      >
                        Undo
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
} 