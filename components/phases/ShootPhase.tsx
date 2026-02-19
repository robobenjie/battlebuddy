'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { id } from '@instantdb/react';
import { db } from '../../lib/db';
import UnitCard from '../ui/UnitCard';
import { formatUnitForCard, getWeaponsForUnit, sortUnitsByPriority, getUnitDisplayName } from '../../lib/unit-utils';
import CombatCalculatorPage from '../CombatCalculatorPage';
import { getReactiveUnits } from '../../lib/rules-engine/reminder-utils';
import ReactiveAbilitiesSection from '../ui/ReactiveAbilitiesSection';
import { UNIT_BASIC_QUERY } from '../../lib/query-fragments';
import { CombatSessionRecord } from '../../lib/rooms-types';

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
  const router = useRouter();
  const [showCombatCalculator, setShowCombatCalculator] = useState(false);
  const [selectedUnit, setSelectedUnit] = useState<any>(null);
  const [selectedWeaponType, setSelectedWeaponType] = useState<string>('');
  const [selectedWeaponName, setSelectedWeaponName] = useState<string>('');
  const [dismissedSessionUpdatedAt, setDismissedSessionUpdatedAt] = useState<number | null>(null);

  // Query units for this army in the game and destroyed units list
  const { data: unitsData } = db.useQuery({
    armies: {
      armyRules: {},
      units: {
        ...UNIT_BASIC_QUERY,
      },
      $: {
        where: {
          id: army.id
        }
      }
    },
    games: {
      combatSessions: {},
      destroyedUnits: {},
      armies: {
        units: {
          ...UNIT_BASIC_QUERY,
        }
      },
      $: {
        where: {
          id: gameId
        }
      }
    }
  });

  const allUnits = unitsData?.armies[0]?.units || [];
  const gameData = unitsData?.games?.[0];
  const destroyedUnitIds = new Set((gameData?.destroyedUnits || []).map((u: any) => u.id));
  const activeSessionId = gameData?.activeCombatSessionId;
  const activeCombatSession = (gameData?.combatSessions || []).find((session: any) => session.id === activeSessionId) as CombatSessionRecord | undefined;

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

  // Get units with reactive shooting abilities (marked with reactive: true)
  const reactiveUnits = getReactiveUnits(nonActiveArmies, 'shooting')
    .filter((unit: any) => !destroyedUnitIds.has(unit.id));

  useEffect(() => {
    if (!activeCombatSession) return;
    if (dismissedSessionUpdatedAt !== null && activeCombatSession.updatedAt <= dismissedSessionUpdatedAt) {
      return;
    }

    if (activeCombatSession.weaponType === 'melee') {
      if (showCombatCalculator) {
        setShowCombatCalculator(false);
        setSelectedUnit(null);
        setSelectedWeaponType('');
        setSelectedWeaponName('');
      }
      return;
    }

    if (activeCombatSession.screen === 'combat-calculator' || activeCombatSession.screen === 'digital-dice') {
      const unit = units.find((u: any) => u.id === activeCombatSession.attackerUnitId);
      if (!unit) return;
      setSelectedUnit(unit);
      setSelectedWeaponType(activeCombatSession.weaponType || '');
      setSelectedWeaponName(activeCombatSession.weaponName || '');
      setShowCombatCalculator(true);
    }
  }, [activeCombatSession?.id, activeCombatSession?.updatedAt, activeCombatSession?.screen, activeCombatSession?.weaponType, dismissedSessionUpdatedAt, units, showCombatCalculator]);

  // Open combat calculator
  const openCombatCalculator = async (unitId: string, weaponType?: string, weaponName?: string) => {
    const unit = units.find((u: any) => u.id === unitId);
    if (unit) {
      const now = Date.now();
      const sessionId = id();
      try {
        await db.transact([
          db.tx.combatSessions[sessionId].update({
            screen: 'combat-calculator',
            createdAt: now,
            updatedAt: now,
            initiatorPlayerId: currentPlayer?.id,
            initiatorPlayerName: currentPlayer?.name,
            attackerUnitId: unit.id,
            attackerArmyId: army.id,
            weaponType: weaponType || '',
            weaponName: weaponName || '',
            phase: 'attacks',
            version: 1,
            payload: {}
          }).link({ game: gameId }),
          db.tx.games[gameId].update({ activeCombatSessionId: sessionId })
        ]);
      } catch (error) {
        console.error('Failed to create combat session:', error);
      }
      setSelectedUnit(unit);
      setSelectedWeaponType(weaponType || '');
      setSelectedWeaponName(weaponName || '');
      setShowCombatCalculator(true);
      setDismissedSessionUpdatedAt(null);
    }
  };

  // Close combat calculator
  const closeCombatCalculator = () => {
    setShowCombatCalculator(false);
    setSelectedUnit(null);
    setSelectedWeaponType('');
    setSelectedWeaponName('');
    if (activeCombatSession?.updatedAt) {
      setDismissedSessionUpdatedAt(activeCombatSession.updatedAt);
    }
  };

  // Helper function to get weapon status for a unit, separated by type
  const getWeaponStatus = (unit: any) => {
    const weapons = getWeaponsForUnit(unit);
    const rangedWeapons = weapons.filter((weapon: any) => weapon.range > 0);

    // Separate pistols from other ranged weapons
    const pistols = rangedWeapons.filter((weapon: any) =>
      weapon.keywords && weapon.keywords.some((keyword: string) => keyword.toLowerCase() === 'pistol')
    );
    const regularWeapons = rangedWeapons.filter((weapon: any) =>
      !weapon.keywords || !weapon.keywords.some((keyword: string) => keyword.toLowerCase() === 'pistol')
    );

    // Create turn+player identifier
    const turnPlayerId = `${game.currentTurn}-${currentPlayer.id}`;

    // Check if any pistols have been fired this player's turn
    const anyPistolsFired = pistols.some((weapon: any) =>
      weapon.turnsFired && weapon.turnsFired.includes(turnPlayerId)
    );

    // Check if any non-pistols have been fired this player's turn
    const anyNonPistolsFired = regularWeapons.some((weapon: any) =>
      weapon.turnsFired && weapon.turnsFired.includes(turnPlayerId)
    );

    const processWeaponGroup = (weaponList: any[]) => {
      const weaponGroups = new Map<string, { total: number, fired: number, range: number }>();

      weaponList.forEach((weapon: any) => {
        const key = weapon.name;
        const isFired = weapon.turnsFired && weapon.turnsFired.includes(turnPlayerId);

        if (!weaponGroups.has(key)) {
          weaponGroups.set(key, { total: 0, fired: 0, range: weapon.range });
        }

        const group = weaponGroups.get(key)!;
        group.total += 1;
        if (isFired) {
          group.fired += 1;
        }
      });

      return Array.from(weaponGroups.entries()).map(([name, stats]) => ({
        name,
        total: stats.total,
        fired: stats.fired,
        unfired: stats.total - stats.fired,
        range: stats.range,
        isFired: stats.fired === stats.total
      }));
    };

    return {
      pistols: processWeaponGroup(pistols),
      regularWeapons: processWeaponGroup(regularWeapons),
      anyPistolsFired,
      anyNonPistolsFired
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
          Your units fire their ranged weapons at enemy targets. You can fire all pistols OR all other weapons.
        </p>
      </div>

      <div className="space-y-4">
        {units.map(unit => {
          const unitData = formatUnitForCard(unit);
          const weaponStatus = getWeaponStatus(unit);
          const hasUnfiredPistols = weaponStatus.pistols.some(w => w.unfired > 0);
          const hasUnfiredRegular = weaponStatus.regularWeapons.some(w => w.unfired > 0);
          const hasAnyUnfired = hasUnfiredPistols || hasUnfiredRegular;
          
          return (
            <div key={unit.id} className={`bg-gray-800 rounded-lg overflow-hidden ${!isActivePlayer ? 'opacity-60' : ''}`}>
              <UnitCard
                unit={unitData.unit}
                expandable={true}
                defaultExpanded={false}
                className="border-0"
                currentPhase="shooting"
                currentTurn="own"
              />
              
              {/* Shooting Controls */}
              {(weaponStatus.pistols.length > 0 || weaponStatus.regularWeapons.length > 0) && (
                <div className="border-t border-gray-700 p-4">
                  <div className="space-y-4">
                                                              {/* Regular Weapons Section */}
                     {weaponStatus.regularWeapons.length > 0 && (
                       <div className="flex items-center justify-between">
                         <div className="flex-1">
                           <div className="space-y-2">
                             {weaponStatus.regularWeapons.map((weapon, index) => (
                               <div key={index} className="flex items-center justify-between text-sm">
                                 <div>
                                   {weapon.isFired ? (
                                     <span className="text-gray-500 line-through">
                                       {weapon.name} ({weapon.range}" range)
                                     </span>
                                   ) : weapon.unfired === weapon.total ? (
                                     <span className="text-gray-400">
                                       {weapon.total}x {weapon.name} ({weapon.range}" range)
                                     </span>
                                   ) : (
                                     <span className="text-gray-400">
                                       {weapon.unfired}/{weapon.total} {weapon.name} ({weapon.range}" range)
                                     </span>
                                   )}
                                 </div>
                                 {!weapon.isFired && !weaponStatus.anyPistolsFired && (
                                   <button
                                     onClick={() => openCombatCalculator(unit.id, 'regular', weapon.name)}
                                     disabled={!isActivePlayer}
                                     className="bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 disabled:text-gray-400 text-white font-semibold py-1 px-3 rounded transition-colors text-xs disabled:cursor-not-allowed ml-2"
                                   >
                                     Fire
                                   </button>
                                 )}
                               </div>
                             ))}
                           </div>
                         </div>
                       </div>
                     )}

                     {/* Divider if both types exist */}
                     {weaponStatus.pistols.length > 0 && weaponStatus.regularWeapons.length > 0 && hasAnyUnfired && (
                       <div className="text-center text-xs text-gray-500 py-2">
                         --or--
                       </div>
                     )}

                     {/* Pistols Section */}
                     {weaponStatus.pistols.length > 0 && (
                       <div className="flex items-center justify-between">
                         <div className="flex-1">
                           <div className="space-y-2">
                             {weaponStatus.pistols.map((weapon, index) => (
                               <div key={index} className="flex items-center justify-between text-sm">
                                 <div>
                                   {weapon.isFired ? (
                                     <span className="text-gray-500 line-through">
                                       {weapon.name} ({weapon.range}" range)
                                     </span>
                                   ) : weapon.unfired === weapon.total ? (
                                     <span className="text-gray-400">
                                       {weapon.total}x {weapon.name} ({weapon.range}" range)
                                     </span>
                                   ) : (
                                     <span className="text-gray-400">
                                       {weapon.unfired}/{weapon.total} {weapon.name} ({weapon.range}" range)
                                     </span>
                                   )}
                                 </div>
                                 {!weapon.isFired && !weaponStatus.anyNonPistolsFired && (
                                   <button
                                     onClick={() => openCombatCalculator(unit.id, 'pistol', weapon.name)}
                                     disabled={!isActivePlayer}
                                     className="bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 disabled:text-gray-400 text-white font-semibold py-1 px-3 rounded transition-colors text-xs disabled:cursor-not-allowed ml-2"
                                   >
                                     Fire
                                   </button>
                                 )}
                               </div>
                             ))}
                           </div>
                         </div>
                       </div>
                     )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Reactive Abilities Section */}
      <ReactiveAbilitiesSection
        reactiveUnits={reactiveUnits}
        currentPhase="shooting"
        phaseLabel="shooting"
      />

      {/* Combat Calculator Modal */}
      {showCombatCalculator && selectedUnit && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-900 rounded-lg max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-4">
              <CombatCalculatorPage
                gameId={gameId}
                unit={selectedUnit}
                currentArmyId={army.id}
                weaponType={selectedWeaponType}
                preSelectedWeaponName={selectedWeaponName}
                onClose={closeCombatCalculator}
                currentPlayer={currentPlayer}
                combatSession={activeCombatSession}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 
