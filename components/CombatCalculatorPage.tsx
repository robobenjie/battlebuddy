'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { db } from '../lib/db';
import UnitCard from './ui/UnitCard';
import WeaponProfileDisplay from './ui/WeaponProfileDisplay';
import { formatUnitForCard } from '../lib/unit-utils';

interface CombatCalculatorPageProps {
  gameId?: string;
  unitId?: string;
  weaponType?: string;
  onClose?: () => void;
}

export default function CombatCalculatorPage({ 
  gameId: propGameId, 
  unitId: propUnitId, 
  weaponType,
  onClose 
}: CombatCalculatorPageProps = {}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const gameId = propGameId || searchParams.get('gameId') || '';
  const unitId = propUnitId || searchParams.get('unitId') || '';
  // Query the unit data
  const { data: unitData } = db.useQuery({
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
  });

  const unit = unitData?.units?.[0];

  
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
  
  
  const enemyArmies = enemyUnitData?.games?.[0]?.armies?.filter((army: any) => army.id !== unit?.army?.id) || [];
  const enemyUnits = enemyArmies?.flatMap((army: any) => army.units) || [];
  
  // State for selected target and weapon
  const [selectedTargetId, setSelectedTargetId] = useState<string>('');
  const [selectedWeaponId, setSelectedWeaponId] = useState<string>('');
  const selectedTarget = enemyUnits.find((enemyUnit: any) => enemyUnit.id === selectedTargetId);

  // Get all weapons from the unit
  const allWeapons = unit?.models?.flatMap((model: any) =>
    model.weapons?.filter((weapon: any) => weapon.range > 0) || []
  ) || [];

  // Group weapons by name
  const weaponGroups = allWeapons.reduce((groups: any, weapon: any) => {
    const key = weapon.name;
    if (!groups[key]) {
      groups[key] = weapon;
    }
    return groups;
  }, {});

  const availableWeapons = Object.values(weaponGroups);
  const selectedWeapon = availableWeapons.find((w: any) => w.id === selectedWeaponId);

  // Get target's defensive stats and model count
  const targetStats = selectedTarget?.models?.[0] ? {
    T: selectedTarget.models[0].T,
    SV: selectedTarget.models[0].SV,
    modelCount: selectedTarget.models?.length || 0
  } : undefined;

  const handleBack = () => {
    if (onClose) {
      onClose();
    } else {
      router.back();
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
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Combat Calculator</h1>
        <button
          onClick={handleBack}
          className="bg-gray-600 hover:bg-gray-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
        >
          Back
        </button>
      </div>

      {/* Unit Card */}
      <div className="max-w-2xl mx-auto">
        <UnitCard
          unit={unitDataForCard.unit}
          expandable={true}
          defaultExpanded={false}
          className="border-0"
        />
      </div>

      {/* Weapon Selection */}
      <div className="mt-8 max-w-2xl mx-auto">
        <div className="bg-gray-800 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Select Weapon</h3>
          <div className="grid grid-cols-2 gap-3">
            {availableWeapons.map((weapon: any) => (
              <button
                key={weapon.id}
                onClick={() => setSelectedWeaponId(weapon.id)}
                className={`p-3 rounded-lg border-2 transition-all ${
                  selectedWeaponId === weapon.id
                    ? 'border-red-500 bg-red-500/10'
                    : 'border-gray-600 hover:border-gray-500 bg-gray-700'
                }`}
              >
                <div className="text-left">
                  <div className="font-medium text-white">{weapon.name}</div>
                  <div className="text-xs text-gray-400 mt-1">
                    Range {weapon.range}" • {weapon.A} attacks
                  </div>
                </div>
              </button>
            ))}
          </div>

          {/* Weapon Profile Display */}
          {selectedWeapon && (
            <div className="mt-6">
              <WeaponProfileDisplay
                weapon={selectedWeapon}
                target={targetStats}
              />
            </div>
          )}
        </div>
      </div>

      {/* Target Selection */}
      <div className="mt-8 max-w-2xl mx-auto">
        <div className="bg-gray-800 rounded-lg p-6">
          {/* Target Dropdown */}
          <div className="mb-4">
            <label htmlFor="target-select" className="block text-sm font-medium text-gray-300 mb-2">
              Select Target Unit
            </label>
            <select
              id="target-select"
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

          {/* Selected Target Unit Card */}
          {selectedTarget && (
            <div className="mt-4">
              <UnitCard
                unit={formatUnitForCard(selectedTarget).unit}
                expandable={true}
                defaultExpanded={false}
                className="border-0"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 