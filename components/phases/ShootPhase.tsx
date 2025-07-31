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

export default function ShootPhase({ gameId, army, currentPlayer, currentUser, game }: ShootPhaseProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const router = useRouter();

  // Query units for this army in the game
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
  });

  const units = unitsData?.armies[0].units  || [];
  const models = unitsData?.armies[0].units.flatMap(u => u.models) || [];
  const weapons = unitsData?.armies[0].units.flatMap(u => u.models.flatMap(m => m.weapons)) || [];

  // Check if current user is the active player
  const isActivePlayer = currentUser?.id === currentPlayer.userId;

  // Helper function to record a shooting action for weapons
  const recordWeaponShooting = async (unitId: string) => {
    const unitWeapons = weapons.filter(w => {
      const model = models.find(m => m.id === w.modelId);
      return model && model.unitId === unitId;
    });
    
    const unfiredWeapons = unitWeapons.filter(w => !w.turnsFired.includes(game.currentTurn));
    
    if (unfiredWeapons.length === 0) return;

    // Update all unfired weapons in this unit
    // Note: Each weapon row represents a weapon type, not individual weapons
    const updates = unfiredWeapons.map(weapon => ({
      id: weapon.id,
      turnsFired: [...(weapon.turnsFired || []), game.currentTurn]
    }));

    await db.transact(updates.map(update => 
      db.tx.weapons[update.id].update({
        turnsFired: update.turnsFired
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
      const unitWeapons = weapons.filter(w => {
        const model = models.find(m => m.id === w.modelId);
        return model && model.unitId === unitId;
      });
      
      // Find weapons that shot this turn
      const weaponsThatShot = unitWeapons.filter(weapon => 
        weapon.turnsFired && weapon.turnsFired.includes(game.currentTurn)
      );

      if (weaponsThatShot.length === 0) return;

      // Remove the current turn from each weapon that shot
      const updates = weaponsThatShot.map(weapon => ({
        id: weapon.id,
        turnsFired: weapon.turnsFired.filter((turn: number) => turn !== game.currentTurn)
      }));

      await db.transact(updates.map(update => 
        db.tx.weapons[update.id].update({
          turnsFired: update.turnsFired
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

  // Check if unit has any shooting actions this turn
  const hasShootingActionsThisTurn = (unitId: string) => {
    const unitWeapons = weapons.filter(w => {
      const model = models.find(m => m.id === w.modelId);
      return model && model.unitId === unitId;
    });
    
    return unitWeapons.some(weapon => 
      weapon.turnsFired && weapon.turnsFired.includes(game.currentTurn)
    );
  };

  // Helper function to get weapons for a specific unit
  const getUnitWeaponsForUnit = (unitId: string) => {
    return weapons.filter(w => {
      const model = models.find(m => m.id === w.modelId);
      return model && model.unitId === unitId;
    });
  };

  // Helper function to check if unit has unfired weapons
  const hasUnfiredWeaponsForUnit = (unitId: string) => {
    const unitWeapons = getUnitWeaponsForUnit(unitId);
    return unitWeapons.some(w => !w.turnsFired.includes(game.currentTurn));
  };

  // Helper function to get firing status for a unit
  const getUnitFiringStatusForUnit = (unitId: string) => {
    const unitWeapons = getUnitWeaponsForUnit(unitId);
    const firedWeapons = unitWeapons.filter(w => w.turnsFired && w.turnsFired.includes(game.currentTurn));
    
    return {
      totalWeapons: unitWeapons.length,
      firedWeapons: firedWeapons.length,
      unfiredWeapons: unitWeapons.length - firedWeapons.length,
      hasUnfired: firedWeapons.length < unitWeapons.length,
      allFired: firedWeapons.length === unitWeapons.length
    };
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
          const unitData = formatUnitForCard(unit);
          const hasUnfired = hasUnfiredWeaponsForUnit(unit.id);
          const hasActions = hasShootingActionsThisTurn(unit.id);
          const unitWeapons = getUnitWeaponsForUnit(unit.id);
          const firedWeapons = unitWeapons.filter(w => w.turnsFired && w.turnsFired.includes(game.currentTurn));
          
          // Calculate total weapon count (each weapon row represents one weapon type)
          const totalWeaponCount = unitWeapons.length;
          const firedWeaponCount = firedWeapons.length;
          
          return (
            <div key={unit.id} className={`bg-gray-800 rounded-lg overflow-hidden ${!isActivePlayer ? 'opacity-60' : ''}`}>
              <UnitCard
                unit={unitData.unit}
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
                    </div>
                  </div>

                  <div className="flex items-center space-x-3">
                    {/* Shooting buttons */}
                    {hasUnfired && (
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
                    {hasActions && (
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