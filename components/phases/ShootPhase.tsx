'use client';

import { useRouter } from 'next/navigation';
import { db } from '../../lib/db';
import UnitCard from '../ui/UnitCard';
import { formatUnitForCard, getWeaponsForUnit } from '../../lib/unit-utils';

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

  // Query units for this army in the game
  const { data: unitsData } = db.useQuery({
    armies: {
      units: {
        models: {
          weapons: {}
        },
      },
      $: {
        where: {
          id: army.id
        }
      }
    },
  });

  const units = unitsData?.armies[0].units || [];

  // Check if current user is the active player
  const isActivePlayer = currentUser?.id === currentPlayer.userId;

  // Navigate to combat calculator
  const navigateToCombatCalculator = (unitId: string, weaponType?: string) => {
    const params = new URLSearchParams({
      gameId: gameId,
      unitId: unitId
    });
    if (weaponType) {
      params.append('weaponType', weaponType);
    }
    router.push(`/game/${gameId}/combat-calculator?${params.toString()}`);
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
    
    const processWeaponGroup = (weaponList: any[]) => {
      const weaponGroups = new Map<string, { total: number, fired: number, range: number }>();
      
      weaponList.forEach((weapon: any) => {
        const key = weapon.name;
        const isFired = weapon.turnsFired && weapon.turnsFired.includes(game.currentTurn);
        
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
      regularWeapons: processWeaponGroup(regularWeapons)
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
              />
              
              {/* Shooting Controls */}
              {(weaponStatus.pistols.length > 0 || weaponStatus.regularWeapons.length > 0) && (
                <div className="border-t border-gray-700 p-4">
                  <div className="space-y-4">
                                                              {/* Regular Weapons Section */}
                     {weaponStatus.regularWeapons.length > 0 && (
                       <div className="flex items-center justify-between">
                         <div className="flex-1">
                           <div className="space-y-1">
                             {weaponStatus.regularWeapons.map((weapon, index) => (
                               <div key={index} className="text-sm">
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
                             ))}
                           </div>
                         </div>
                         {hasUnfiredRegular && (
                           <button
                             onClick={() => navigateToCombatCalculator(unit.id, 'regular')}
                             disabled={!isActivePlayer}
                             className="bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 disabled:text-gray-400 text-white font-semibold py-2 px-4 rounded-lg transition-colors text-sm disabled:cursor-not-allowed"
                           >
                             Fire
                           </button>
                         )}
                       </div>
                     )}

                     {/* Divider if both types exist */}
                     {weaponStatus.pistols.length > 0 && weaponStatus.regularWeapons.length > 0 && hasAnyUnfired && (
                       <div className="text-center text-xs text-gray-500" py-2>
                         --or--
                       </div>
                     )}

                     {/* Pistols Section */}
                     {weaponStatus.pistols.length > 0 && (
                       <div className="flex items-center justify-between">
                         <div className="flex-1">
                           <div className="space-y-1">
                             {weaponStatus.pistols.map((weapon, index) => (
                               <div key={index} className="text-sm">
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
                             ))}
                           </div>
                         </div>
                         {hasUnfiredPistols && (
                           <button
                             onClick={() => navigateToCombatCalculator(unit.id, 'pistol')}
                             disabled={!isActivePlayer}
                             className="bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 disabled:text-gray-400 text-white font-semibold py-2 px-4 rounded-lg transition-colors text-sm disabled:cursor-not-allowed"
                           >
                             Fire
                           </button>
                         )}
                       </div>
                     )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
} 