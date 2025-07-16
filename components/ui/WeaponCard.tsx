'use client';

import StatTable from './StatTable';
import { KeywordList, parseWeaponKeywords } from './KeywordBadge';

interface WeaponCardProps {
  weapon: {
    id: string;
    name: string;
    type: string; // 'ranged' or 'melee'
    count: number;
    characteristics: Array<{
      name: string;
      value: string;
    }>;
    profiles?: Array<{
      name: string;
      characteristics: Array<{
        name: string;
        value: string;
      }>;
    }>;
  };
  onKeywordClick?: (name: string, description?: string) => void;
  className?: string;
  compact?: boolean;
}

export default function WeaponCard({ 
  weapon, 
  onKeywordClick, 
  className = '',
  compact = false 
}: WeaponCardProps) {
  // Extract keywords from characteristics
  const keywordsChar = weapon.characteristics.find(c => 
    c.name.toLowerCase() === 'keywords' || c.name.toLowerCase() === 'abilities'
  );
  const keywords = keywordsChar ? parseWeaponKeywords(keywordsChar.value) : [];
  
  // Get weapon icon
  const getWeaponIcon = (type: string) => {
    return type === 'ranged' ? '🔫' : '⚔️';
  };

  // Filter out keywords from characteristics for stat display
  const statCharacteristics = weapon.characteristics.filter(c => 
    c.name.toLowerCase() !== 'keywords' && c.name.toLowerCase() !== 'abilities'
  );

  return (
    <div className={`bg-gray-800 rounded-lg border border-gray-700 overflow-hidden ${className}`}>
      {/* Header */}
      <div className="bg-gray-750 px-3 py-2 border-b border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="text-lg">{getWeaponIcon(weapon.type)}</span>
            <div>
              <h4 className="font-semibold text-white text-sm">{weapon.name}</h4>
              {weapon.count > 1 && (
                <span className="text-xs text-gray-400">×{weapon.count}</span>
              )}
            </div>
          </div>
          <div className="text-xs text-gray-400 capitalize">
            {weapon.type}
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="p-3">
        <StatTable 
          characteristics={statCharacteristics} 
          type="weapon"
          className="mb-3"
        />

        {/* Keywords */}
        {keywords.length > 0 && (
          <div className="space-y-1">
            <div className="text-xs font-medium text-gray-400 uppercase tracking-wider">
              Abilities
            </div>
            <KeywordList
              keywords={keywords}
              onKeywordClick={onKeywordClick}
              variant="weapon"
            />
          </div>
        )}

        {/* Multiple Profiles (if any) */}
        {weapon.profiles && weapon.profiles.length > 1 && (
          <div className="mt-3 space-y-2">
            <div className="text-xs font-medium text-gray-400 uppercase tracking-wider">
              Profiles
            </div>
            {weapon.profiles.map((profile, index) => (
              <div key={index} className="bg-gray-700 rounded p-2">
                <div className="text-xs font-medium text-gray-300 mb-1">
                  {profile.name}
                </div>
                <StatTable 
                  characteristics={profile.characteristics.filter(c => 
                    c.name.toLowerCase() !== 'keywords' && c.name.toLowerCase() !== 'abilities'
                  )} 
                  type="weapon"
                  className="text-xs"
                />
                {profile.characteristics.some(c => 
                  c.name.toLowerCase() === 'keywords' || c.name.toLowerCase() === 'abilities'
                ) && (
                  <div className="mt-2">
                    <KeywordList
                      keywords={parseWeaponKeywords(
                        profile.characteristics.find(c => 
                          c.name.toLowerCase() === 'keywords' || c.name.toLowerCase() === 'abilities'
                        )?.value || ''
                      )}
                      onKeywordClick={onKeywordClick}
                      variant="weapon"
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// Component for displaying multiple weapons in a compact list
interface WeaponListProps {
  weapons: WeaponCardProps['weapon'][];
  onKeywordClick?: (name: string, description?: string) => void;
  className?: string;
  groupByType?: boolean;
}

export function WeaponList({ 
  weapons, 
  onKeywordClick, 
  className = '',
  groupByType = true 
}: WeaponListProps) {
  if (!weapons || weapons.length === 0) {
    return (
      <div className="text-center py-4 text-gray-400 text-sm">
        No weapons
      </div>
    );
  }

  if (groupByType) {
    const rangedWeapons = weapons.filter(w => w.type === 'ranged');
    const meleeWeapons = weapons.filter(w => w.type === 'melee');

    return (
      <div className={`space-y-4 ${className}`}>
        {rangedWeapons.length > 0 && (
          <div>
            <h5 className="text-sm font-semibold text-gray-300 mb-2 flex items-center">
              🔫 Ranged Weapons ({rangedWeapons.length})
            </h5>
            <div className="space-y-2">
              {rangedWeapons.map((weapon) => (
                <WeaponCard
                  key={weapon.id}
                  weapon={weapon}
                  onKeywordClick={onKeywordClick}
                  compact
                />
              ))}
            </div>
          </div>
        )}

        {meleeWeapons.length > 0 && (
          <div>
            <h5 className="text-sm font-semibold text-gray-300 mb-2 flex items-center">
              ⚔️ Melee Weapons ({meleeWeapons.length})
            </h5>
            <div className="space-y-2">
              {meleeWeapons.map((weapon) => (
                <WeaponCard
                  key={weapon.id}
                  weapon={weapon}
                  onKeywordClick={onKeywordClick}
                  compact
                />
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={`space-y-2 ${className}`}>
      {weapons.map((weapon) => (
        <WeaponCard
          key={weapon.id}
          weapon={weapon}
          onKeywordClick={onKeywordClick}
        />
      ))}
    </div>
  );
} 