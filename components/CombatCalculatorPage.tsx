'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { db } from '../lib/db';
import UnitCard from './ui/UnitCard';
import WeaponProfileDisplay from './ui/WeaponProfileDisplay';
import { formatUnitForCard } from '../lib/unit-utils';

interface CombatCalculatorPageProps {
  gameId?: string;
  unitId?: string;
  unit?: any;
  currentArmyId?: string;
  weaponType?: string;
  preSelectedWeaponName?: string;
  onClose?: () => void;
}

export default function CombatCalculatorPage({
  gameId: propGameId,
  unitId: propUnitId,
  unit: propUnit,
  currentArmyId: propCurrentArmyId,
  weaponType,
  preSelectedWeaponName,
  onClose
}: CombatCalculatorPageProps = {}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const gameId = propGameId || searchParams.get('gameId') || '';
  const unitId = propUnitId || searchParams.get('unitId') || '';

  // If unit is passed as prop, use it directly (no query needed)
  // Otherwise, query it (for standalone usage via URL)
  const { data: unitData } = db.useQuery(
    propUnit ? {} : {
      units: {
        models: {
          weapons: {}
        },
        army: {},
        statuses: {},
        $: {
          where: {
            id: unitId
          }
        }
      }
    }
  );

  const unit = propUnit || unitData?.units?.[0];

  
  // Now try the full query
  const { data: enemyUnitData, isLoading, error } = db.useQuery({
    games: {
      armies: {
        units: {
          models: {
            weapons: {}
          },
          statuses: {}
        }
      },
      $: {
        where: {
          id: gameId
        }
      }
    }
  });
  
  
  const game = enemyUnitData?.games?.[0];
  // Filter out the current unit's army - use prop if available, fallback to unit.armyId
  const currentArmyId = propCurrentArmyId || unit?.armyId;

  const enemyArmies = game?.armies?.filter((army: any) => army.id !== currentArmyId) || [];
  const enemyUnits = (enemyArmies?.flatMap((army: any) => army.units) || [])
    .sort((a: any, b: any) => a.name.localeCompare(b.name)); // Sort alphabetically

  // State for selected target and weapon
  const [selectedTargetId, setSelectedTargetId] = useState<string>('');
  const [selectedWeaponId, setSelectedWeaponId] = useState<string>('');
  const selectedTarget = enemyUnits.find((enemyUnit: any) => enemyUnit.id === selectedTargetId);

  // Ref for target select to auto-focus
  const targetSelectRef = useRef<HTMLSelectElement>(null);

  // Auto-focus the target dropdown when component mounts
  useEffect(() => {
    if (targetSelectRef.current) {
      targetSelectRef.current.focus();
    }
  }, []);

  // Query the unit's weapons dynamically so they update when fired
  const { data: weaponsData } = db.useQuery(
    unit?.id ? {
      units: {
        models: {
          weapons: {}
        },
        $: {
          where: {
            id: unit.id
          }
        }
      }
    } : {}
  );

  // Get all weapons from the queried unit (this will update when weapons are fired)
  const queriedUnit = weaponsData?.units?.[0];
  const allWeapons = queriedUnit?.models?.flatMap((model: any) =>
    model.weapons?.filter((weapon: any) => weapon.range > 0) || []
  ) || [];

  // Group weapons by name
  const weaponGroups: Record<string, any> = allWeapons.reduce((groups: Record<string, any>, weapon: any) => {
    const key = weapon.name;
    if (!groups[key]) {
      groups[key] = weapon;
    }
    return groups;
  }, {});

  const availableWeapons: any[] = Object.values(weaponGroups);
  const selectedWeapon = availableWeapons.find((w: any) => w.id === selectedWeaponId);

  // Check if a weapon group has been fired this turn
  // A weapon group is considered "fired" if ALL weapons with that name are fired
  const isWeaponFired = (weapon: any) => {
    if (!game?.currentTurn) return false;

    // Get all weapons with this name
    const weaponsWithSameName = allWeapons.filter((w: any) => w.name === weapon.name);

    // Check if ALL of them have been fired this turn
    return weaponsWithSameName.every((w: any) =>
      w.turnsFired && w.turnsFired.includes(game.currentTurn)
    );
  };

  // Count unfired weapons
  const unfiredWeapons = availableWeapons.filter((w: any) => !isWeaponFired(w));
  const firedWeapons = availableWeapons.filter((w: any) => isWeaponFired(w));

  console.log('Available weapon types:', availableWeapons.map((w: any) => w.name));
  console.log('Unfired weapon types:', unfiredWeapons.map((w: any) => w.name));
  console.log('Fired weapon types:', firedWeapons.map((w: any) => w.name));

  // Auto-close modal when all weapons are fired
  useEffect(() => {
    if (availableWeapons.length > 0 && unfiredWeapons.length === 0) {
      console.log('All weapons fired (detected via useEffect), closing modal');
      handleBack();
    }
  }, [unfiredWeapons.length, availableWeapons.length]);

  // Auto-select next unfired weapon when current selection is cleared or becomes fired
  useEffect(() => {
    const firstUnfired = unfiredWeapons[0] as any;
    const firstUnfiredId = firstUnfired?.id;
    const unfiredIds = unfiredWeapons.map((w: any) => w.id).join(',');

    console.log('Auto-select effect running:', {
      selectedWeaponId,
      unfiredWeaponsLength: unfiredWeapons.length,
      firstUnfired: firstUnfired?.name,
      firstUnfiredId,
      selectedIsFired: selectedWeaponId && !unfiredWeapons.find((w: any) => w.id === selectedWeaponId)
    });

    // If no weapon is selected and there are unfired weapons, select the first one
    // OR if the currently selected weapon has been fired, select the next unfired one
    if (unfiredWeapons.length > 0 && (!selectedWeaponId || (selectedWeaponId && !unfiredWeapons.find((w: any) => w.id === selectedWeaponId)))) {
      console.log('Auto-selecting next unfired weapon:', firstUnfired?.name, firstUnfiredId);
      setSelectedWeaponId(firstUnfiredId);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedWeaponId, unfiredWeapons.length]);

  // Auto-select weapon if preSelectedWeaponName is provided
  useEffect(() => {
    if (preSelectedWeaponName && availableWeapons.length > 0 && !selectedWeaponId) {
      const weapon = availableWeapons.find((w: any) => w.name === preSelectedWeaponName) as any;
      if (weapon) {
        setSelectedWeaponId(weapon.id);
      }
    }
  }, [preSelectedWeaponName, availableWeapons, selectedWeaponId]);

  // Get target's defensive stats and model count
  const targetStats = selectedTarget?.models?.[0] ? {
    T: selectedTarget.models[0].T,
    SV: selectedTarget.models[0].SV,
    INV: selectedTarget.models[0].INV,
    modelCount: selectedTarget.models?.length || 0
  } : undefined;

  const handleBack = () => {
    if (onClose) {
      onClose();
    } else {
      router.back();
    }
  };

  const handleShoot = async () => {
    if (!selectedWeapon || !game?.currentTurn) {
      return;
    }

    try {
      // Get all weapons with the same NAME in this unit (not just the same ID)
      const weaponsToUpdate = allWeapons.filter((w: any) => w.name === (selectedWeapon as any).name);

      console.log(`🎯 Firing all ${weaponsToUpdate.length}x ${(selectedWeapon as any).name}`);

      // Batch all weapon updates into a single transaction for performance
      const updates = weaponsToUpdate
        .filter((weapon: any) => {
          const currentTurnsFired = weapon.turnsFired || [];
          return !currentTurnsFired.includes(game.currentTurn);
        })
        .map((weapon: any) => {
          const currentTurnsFired = weapon.turnsFired || [];
          return db.tx.weapons[weapon.id].update({
            turnsFired: [...currentTurnsFired, game.currentTurn]
          });
        });

      if (updates.length > 0) {
        const tBefore = performance.now();
        await db.transact(updates);
        const tAfter = performance.now();
        console.log(`⏱️  Fired ${updates.length} weapons in ${(tAfter - tBefore).toFixed(2)}ms`);
      }

      // Clear selected weapon - let useEffect handle closing modal if all weapons fired
      setSelectedWeaponId('');
    } catch (error) {
      console.error('Failed to mark weapon as fired:', error);
    }
  };

  if (!unit) {
    return (
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-4">Combat Calculator</h1>
        <p className="text-gray-400 mb-6">Unit not found</p>
        <button
          onClick={handleBack}
          className="bg-gray-600 hover:bg-gray-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
        >
          Back
        </button>
      </div>
    );
  }

  // Add safety check for unit data
  if (!unit.id || !unit.name) {
    return (
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-4">Combat Calculator</h1>
        <p className="text-gray-400 mb-6">Invalid unit data</p>
        <button
          onClick={handleBack}
          className="bg-gray-600 hover:bg-gray-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
        >
          Back
        </button>
      </div>
    );
  }

  const unitDataForCard = formatUnitForCard(unit);

  return (
    <div className="text-white">
      <div className="max-w-2xl mx-auto">
        {/* Main Card */}
        <div className="bg-gray-800 rounded-lg p-6">
          {/* Weapon Selection - only show if more than one weapon */}
          {availableWeapons.length > 1 && (
            <>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white">Select Weapon</h3>
                <div className="text-sm text-gray-400">
                  {unfiredWeapons.length} / {availableWeapons.length} remaining
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 mb-6">
                {availableWeapons.map((weapon: any) => {
                  const isFired = isWeaponFired(weapon);
                  return (
                    <button
                      key={weapon.id}
                      onClick={() => !isFired && setSelectedWeaponId(weapon.id)}
                      disabled={isFired}
                      className={`p-3 rounded-lg border-2 transition-all ${
                        isFired
                          ? 'border-gray-700 bg-gray-900 opacity-50 cursor-not-allowed'
                          : selectedWeaponId === weapon.id
                          ? 'border-red-500 bg-red-500/10'
                          : 'border-gray-600 hover:border-gray-500 bg-gray-700'
                      }`}
                    >
                      <div className="text-left">
                        <div className={`font-medium ${isFired ? 'text-gray-500 line-through' : 'text-white'}`}>
                          {weapon.name}
                          {isFired && <span className="ml-2 text-xs">(Fired)</span>}
                        </div>
                        <div className={`text-xs mt-1 ${isFired ? 'text-gray-600' : 'text-gray-400'}`}>
                          Range {weapon.range}" • {weapon.A} attacks
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </>
          )}

          {/* Target Selection */}
          <div className="mb-6">
            <label htmlFor="target-select" className="block text-sm font-medium text-gray-300 mb-2">
              Select Target Unit
            </label>
            <select
              id="target-select"
              ref={targetSelectRef}
              value={selectedTargetId}
              onChange={(e) => setSelectedTargetId(e.target.value)}
              className="w-full bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
            >
              <option value="">Choose a target...</option>
              {enemyUnits.map((enemyUnit: any) => (
                <option key={enemyUnit.id} value={enemyUnit.id}>
                  {enemyUnit.name}
                </option>
              ))}
            </select>
          </div>

          {/* Weapon Profile Display / Results Table */}
          {selectedWeapon && (
            <div className="mb-6">
              <WeaponProfileDisplay
                weapon={selectedWeapon as any}
                target={targetStats}
                unitName={unit?.name}
              />
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-between pt-4 border-t border-gray-700">
            <button
              onClick={handleBack}
              className="bg-gray-600 hover:bg-gray-700 text-white font-semibold py-2 px-6 rounded-lg transition-colors"
            >
              Back
            </button>
            {selectedWeapon && (
              <button
                onClick={handleShoot}
                className="bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-6 rounded-lg transition-colors"
              >
                Fire
              </button>
            )}
          </div>
        </div>

        {/* Collapsed Unit Card at bottom */}
        <div className="mt-6">
          <UnitCard
            unit={unitDataForCard.unit}
            expandable={true}
            defaultExpanded={false}
            className="border-0"
          />
        </div>
      </div>
    </div>
  );
} 