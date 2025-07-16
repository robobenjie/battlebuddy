'use client';

import { useState } from 'react';
import { ModelList, ModelSummary } from './ModelCard';
import { WeaponList } from './WeaponCard';
import { KeywordList, extractFactionKeywords, extractGeneralKeywords } from './KeywordBadge';

interface UnitCardProps {
  unit: {
    id: string;
    name: string;
    type: string;
    cost: number;
    count: number;
    categories: string[];
    profiles?: Array<{
      id: string;
      name: string;
      typeName?: string;
      characteristics: Array<{
        name: string;
        typeId: string;
        value: string;
      }>;
    }>;
    rules?: Array<{
      id: string;
      name: string;
      description: string;
    }>;
  };
  models?: Array<{
    id: string;
    name: string;
    count: number;
    characteristics: Array<{
      name: string;
      value: string;
    }>;
  }>;
  weapons?: Array<{
    id: string;
    name: string;
    type: string;
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
  }>;
  onKeywordClick?: (name: string, description?: string) => void;
  className?: string;
  expandable?: boolean;
  defaultExpanded?: boolean;
}

export default function UnitCard({ 
  unit, 
  models = [],
  weapons = [],
  onKeywordClick, 
  className = '',
  expandable = true,
  defaultExpanded = false
}: UnitCardProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  // Extract keywords from categories
  const factionKeywords = extractFactionKeywords(unit.categories);
  const generalKeywords = extractGeneralKeywords(unit.categories);

  // Get unit icon based on categories
  const getUnitIcon = () => {
    if (unit.categories.includes('Character')) return '👑';
    if (unit.categories.includes('Vehicle')) return '🚗';
    if (unit.categories.includes('Monster')) return '🐲';
    if (unit.categories.includes('Infantry')) return '🪖';
    if (unit.categories.includes('Battleline')) return '🛡️';
    return '⚔️';
  };

  // Calculate total model count
  const totalModels = models.reduce((sum, model) => sum + model.count, 0);

  // Calculate total weapon count
  const totalWeapons = weapons.reduce((sum, weapon) => sum + weapon.count, 0);

  const toggleExpanded = () => {
    if (expandable) {
      setIsExpanded(!isExpanded);
    }
  };

  return (
    <div className={`bg-gray-800 rounded-lg border border-gray-700 overflow-hidden ${className}`}>
      {/* Header */}
      <div 
        className={`bg-gray-750 px-4 py-3 border-b border-gray-700 ${expandable ? 'cursor-pointer hover:bg-gray-700' : ''}`}
        onClick={toggleExpanded}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <span className="text-xl">{getUnitIcon()}</span>
            <div>
              <h3 className="font-semibold text-white">{unit.name}</h3>
              <div className="flex items-center space-x-4 text-sm text-gray-400">
                <span>{unit.cost} pts</span>
                {totalModels > 0 && <span>{totalModels} models</span>}
                {totalWeapons > 0 && <span>{totalWeapons} weapons</span>}
              </div>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            {/* Faction keywords */}
            {factionKeywords.length > 0 && (
              <KeywordList
                keywords={factionKeywords}
                onKeywordClick={onKeywordClick}
                variant="faction"
              />
            )}
            
            {expandable && (
              <span className={`text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}>
                ▼
              </span>
            )}
          </div>
        </div>

        {/* Quick info when collapsed */}
        {!isExpanded && generalKeywords.length > 0 && (
          <div className="mt-2">
            <KeywordList
              keywords={generalKeywords.slice(0, 5)} // Show first 5 keywords
              onKeywordClick={onKeywordClick}
              variant="keyword"
            />
            {generalKeywords.length > 5 && (
              <span className="text-xs text-gray-500 ml-2">
                +{generalKeywords.length - 5} more
              </span>
            )}
          </div>
        )}
      </div>

      {/* Expanded Content */}
      {(isExpanded || !expandable) && (
        <div className="p-4 space-y-4">
          {/* Keywords */}
          {generalKeywords.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-gray-300 mb-2">Keywords</h4>
              <KeywordList
                keywords={generalKeywords}
                onKeywordClick={onKeywordClick}
                variant="keyword"
              />
            </div>
          )}

          {/* Rules */}
          {unit.rules && unit.rules.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-gray-300 mb-2">Special Rules</h4>
              <div className="space-y-2">
                {unit.rules.map((rule) => (
                  <div key={rule.id} className="bg-gray-700 rounded-lg p-3">
                    <button
                      onClick={() => onKeywordClick?.(rule.name, rule.description)}
                      className="text-left w-full"
                    >
                      <h5 className="text-sm font-medium text-blue-300 hover:text-blue-200 transition-colors">
                        {rule.name}
                      </h5>
                      <p className="text-xs text-gray-400 mt-1 line-clamp-2">
                        {rule.description}
                      </p>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Model Summary */}
          {models.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-gray-300 mb-2">Model Summary</h4>
              <ModelSummary models={models} />
            </div>
          )}

          {/* Models Details */}
          {models.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-gray-300 mb-2">Models ({models.length})</h4>
              <ModelList
                models={models}
                weapons={weapons}
                onKeywordClick={onKeywordClick}
                compact={true}
                showWeapons={false} // Show weapons separately
              />
            </div>
          )}

          {/* Weapons */}
          {weapons.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-gray-300 mb-2">Weapons ({weapons.length})</h4>
              <WeaponList
                weapons={weapons}
                onKeywordClick={onKeywordClick}
                groupByType={true}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Component for displaying multiple units
interface UnitListProps {
  units: Array<{
    unit: UnitCardProps['unit'];
    models: UnitCardProps['models'];
    weapons: UnitCardProps['weapons'];
  }>;
  onKeywordClick?: (name: string, description?: string) => void;
  className?: string;
  expandable?: boolean;
  groupByType?: boolean;
}

export function UnitList({ 
  units, 
  onKeywordClick, 
  className = '',
  expandable = true,
  groupByType = false 
}: UnitListProps) {
  if (!units || units.length === 0) {
    return (
      <div className="text-center py-8 text-gray-400">
        No units available
      </div>
    );
  }

  if (groupByType) {
    // Group units by type/category
    const groupedUnits = units.reduce((acc, unitData) => {
      const primaryType = unitData.unit.categories.find(cat => 
        ['Character', 'Infantry', 'Vehicle', 'Monster', 'Battleline'].includes(cat)
      ) || 'Other';
      
      if (!acc[primaryType]) {
        acc[primaryType] = [];
      }
      acc[primaryType].push(unitData);
      return acc;
    }, {} as Record<string, typeof units>);

    const typeOrder = ['Character', 'Battleline', 'Infantry', 'Vehicle', 'Monster', 'Other'];

    return (
      <div className={`space-y-6 ${className}`}>
        {typeOrder.map(type => {
          const typeUnits = groupedUnits[type];
          if (!typeUnits || typeUnits.length === 0) return null;

          return (
            <div key={type}>
              <h3 className="text-lg font-semibold text-gray-200 mb-3 flex items-center">
                {type === 'Character' && '👑'}
                {type === 'Battleline' && '🛡️'}
                {type === 'Infantry' && '🪖'}
                {type === 'Vehicle' && '🚗'}
                {type === 'Monster' && '🐲'}
                {type === 'Other' && '⚔️'}
                <span className="ml-2">{type} ({typeUnits.length})</span>
              </h3>
              <div className="space-y-3">
                {typeUnits.map((unitData, index) => (
                  <UnitCard
                    key={unitData.unit.id || index}
                    unit={unitData.unit}
                    models={unitData.models}
                    weapons={unitData.weapons}
                    onKeywordClick={onKeywordClick}
                    expandable={expandable}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className={`space-y-3 ${className}`}>
      {units.map((unitData, index) => (
        <UnitCard
          key={unitData.unit.id || index}
          unit={unitData.unit}
          models={unitData.models}
          weapons={unitData.weapons}
          onKeywordClick={onKeywordClick}
          expandable={expandable}
        />
      ))}
    </div>
  );
} 