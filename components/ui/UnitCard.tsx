'use client';

import React, { useState } from 'react';
import { ModelList, ModelSummary } from './ModelCard';
import { WeaponList } from './WeaponCard';
import { KeywordList, extractFactionKeywords, extractGeneralKeywords } from './KeywordBadge';
import { COMMON_RULES, parseRuleDescription } from './RulePopup';

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

  // Calculate model configurations for collapsed view
  const getModelConfigurations = () => {
    if (!models || models.length === 0) return [];
    
    return models.map(model => ({
      name: model.name,
      count: model.count
    }));
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
          <div className="flex-1">
            <h3 className="font-medium text-white text-sm">
              {totalModels > 1 ? `${totalModels} ` : ''}{unit.name}
            </h3>
            {/* Model configurations when collapsed */}
            {!isExpanded && models.length > 0 && (
              <div className="mt-1 space-y-0.5">
                {getModelConfigurations().map((config, index) => (
                  <div key={index} className="text-xs text-gray-400 leading-tight">
                    • {config.count}x {config.name}
                  </div>
                ))}
              </div>
            )}
          </div>
          
          {expandable && (
            <span className={`text-gray-400 transition-transform ml-2 ${isExpanded ? 'rotate-180' : ''}`}>
              ▼
            </span>
          )}
        </div>
      </div>

      {/* Expanded Content */}
      {(isExpanded || !expandable) && (
        <div className="p-4 space-y-4">
          {/* Unit Stats Table */}
          {models.length > 0 && (
            <div>
              <div className="bg-gray-700 rounded-lg overflow-hidden">
                <div className="grid gap-0" style={{ gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr 1fr 1fr' }}>
                  {/* Headers */}
                  <div className="bg-gray-600 px-1 py-1 text-center border-r border-gray-500">
                    <div className="text-xs font-semibold text-gray-200 uppercase">Unit</div>
                  </div>
                  <div className="bg-gray-600 px-1 py-1 text-center border-r border-gray-500">
                    <div className="text-xs font-semibold text-gray-200 uppercase">M</div>
                  </div>
                  <div className="bg-gray-600 px-1 py-1 text-center border-r border-gray-500">
                    <div className="text-xs font-semibold text-gray-200 uppercase">T</div>
                  </div>
                  <div className="bg-gray-600 px-1 py-1 text-center border-r border-gray-500">
                    <div className="text-xs font-semibold text-gray-200 uppercase">SV</div>
                  </div>
                  <div className="bg-gray-600 px-1 py-1 text-center border-r border-gray-500">
                    <div className="text-xs font-semibold text-gray-200 uppercase">W</div>
                  </div>
                  <div className="bg-gray-600 px-1 py-1 text-center border-r border-gray-500">
                    <div className="text-xs font-semibold text-gray-200 uppercase">LD</div>
                  </div>
                  <div className="bg-gray-600 px-1 py-1 text-center">
                    <div className="text-xs font-semibold text-gray-200 uppercase">OC</div>
                  </div>
                  
                  {/* Values - Use first model's stats as representative */}
                  {models[0] && (
                    <>
                      <div className="bg-gray-700 px-1 py-1 text-left border-r border-gray-600">
                        <div className="text-xs font-mono text-white truncate">{unit.name}</div>
                      </div>
                      <div className="bg-gray-700 px-1 py-1 text-center border-r border-gray-600">
                        <div className="text-xs font-mono text-white">
                          {models[0].characteristics.find(c => c.name === 'M')?.value || '-'}
                        </div>
                      </div>
                      <div className="bg-gray-700 px-1 py-1 text-center border-r border-gray-600">
                        <div className="text-xs font-mono text-white">
                          {models[0].characteristics.find(c => c.name === 'T')?.value || '-'}
                        </div>
                      </div>
                      <div className="bg-gray-700 px-1 py-1 text-center border-r border-gray-600">
                        <div className="text-xs font-mono text-white">
                          {models[0].characteristics.find(c => c.name === 'SV')?.value || '-'}
                        </div>
                      </div>
                      <div className="bg-gray-700 px-1 py-1 text-center border-r border-gray-600">
                        <div className="text-xs font-mono text-white">
                          {models[0].characteristics.find(c => c.name === 'W')?.value || '-'}
                        </div>
                      </div>
                      <div className="bg-gray-700 px-1 py-1 text-center border-r border-gray-600">
                        <div className="text-xs font-mono text-white">
                          {models[0].characteristics.find(c => c.name === 'LD')?.value || '-'}
                        </div>
                      </div>
                      <div className="bg-gray-700 px-1 py-1 text-center">
                        <div className="text-xs font-mono text-white">
                          {models[0].characteristics.find(c => c.name === 'OC')?.value || '-'}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Ranged Weapons */}
          {weapons.filter(w => w.type === 'ranged').length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-gray-300 mb-2">Ranged Weapons</h4>
              <div className="space-y-3">
                {weapons.filter(w => w.type === 'ranged').map((weapon) => {
                  const keywordsValue = weapon.characteristics.find(c => c.name === 'Keywords')?.value || '-';
                  const keywords = keywordsValue !== '-' ? keywordsValue.split(',').map(k => k.trim()) : [];
                  
                  return (
                    <div key={weapon.id} className="bg-gray-700 rounded-lg overflow-hidden">
                      {/* Weapon Name Header */}
                      <div className="bg-gray-600 px-2 py-1">
                        <div className="text-xs font-medium text-white">
                          {weapon.name}{weapon.count > 1 ? ` (x${weapon.count})` : ''}
                        </div>
                      </div>
                      
                      {/* Weapon Stats Table */}
                      <div className="bg-gray-700">
                        <div className="grid grid-cols-7 gap-0">
                          {/* Headers */}
                          <div className="bg-gray-600 px-1 py-1 text-center border-r border-gray-500">
                            <div className="text-xs font-semibold text-gray-200 uppercase">Range</div>
                          </div>
                          <div className="bg-gray-600 px-1 py-1 text-center border-r border-gray-500">
                            <div className="text-xs font-semibold text-gray-200 uppercase">A</div>
                          </div>
                          <div className="bg-gray-600 px-1 py-1 text-center border-r border-gray-500">
                            <div className="text-xs font-semibold text-gray-200 uppercase">BS</div>
                          </div>
                          <div className="bg-gray-600 px-1 py-1 text-center border-r border-gray-500">
                            <div className="text-xs font-semibold text-gray-200 uppercase">S</div>
                          </div>
                          <div className="bg-gray-600 px-1 py-1 text-center border-r border-gray-500">
                            <div className="text-xs font-semibold text-gray-200 uppercase">AP</div>
                          </div>
                          <div className="bg-gray-600 px-1 py-1 text-center border-r border-gray-500">
                            <div className="text-xs font-semibold text-gray-200 uppercase">D</div>
                          </div>
                          <div className="bg-gray-600 px-1 py-1 text-center">
                            <div className="text-xs font-semibold text-gray-200 uppercase">Keywords</div>
                          </div>
                          
                          {/* Values */}
                          <div className="bg-gray-700 px-1 py-1 text-center border-r border-gray-600">
                            <div className="text-xs font-mono text-white">
                              {weapon.characteristics.find(c => c.name === 'Range')?.value || '-'}
                            </div>
                          </div>
                          <div className="bg-gray-700 px-1 py-1 text-center border-r border-gray-600">
                            <div className="text-xs font-mono text-white">
                              {weapon.characteristics.find(c => c.name === 'A')?.value || '-'}
                            </div>
                          </div>
                          <div className="bg-gray-700 px-1 py-1 text-center border-r border-gray-600">
                            <div className="text-xs font-mono text-white">
                              {weapon.characteristics.find(c => c.name === 'BS')?.value || '-'}
                            </div>
                          </div>
                          <div className="bg-gray-700 px-1 py-1 text-center border-r border-gray-600">
                            <div className="text-xs font-mono text-white">
                              {weapon.characteristics.find(c => c.name === 'S')?.value || '-'}
                            </div>
                          </div>
                          <div className="bg-gray-700 px-1 py-1 text-center border-r border-gray-600">
                            <div className="text-xs font-mono text-white">
                              {weapon.characteristics.find(c => c.name === 'AP')?.value || '-'}
                            </div>
                          </div>
                          <div className="bg-gray-700 px-1 py-1 text-center border-r border-gray-600">
                            <div className="text-xs font-mono text-white">
                              {weapon.characteristics.find(c => c.name === 'D')?.value || '-'}
                            </div>
                          </div>
                          <div className="bg-gray-700 px-1 py-1 text-left">
                            <div className="text-xs">
                              {keywords.length > 0 ? (
                                keywords.map((keyword, index) => {
                                  const hasRule = COMMON_RULES[keyword] || parseRuleDescription(keyword);
                                  return (
                                    <span key={index}>
                                      {index > 0 && ', '}
                                                                             <span
                                         className={hasRule ? 'text-blue-400 cursor-pointer hover:text-blue-300 underline' : 'text-blue-400'}
                                         onClick={hasRule && onKeywordClick ? () => onKeywordClick(keyword) : undefined}
                                         title={hasRule ? 'Click for details' : undefined}
                                       >
                                        {keyword}
                                      </span>
                                    </span>
                                  );
                                })
                              ) : (
                                <span className="text-blue-400">-</span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Melee Weapons */}
          {weapons.filter(w => w.type === 'melee').length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-gray-300 mb-2">Melee Weapons</h4>
              <div className="space-y-3">
                {weapons.filter(w => w.type === 'melee').map((weapon) => {
                  const keywordsValue = weapon.characteristics.find(c => c.name === 'Keywords')?.value || '-';
                  const keywords = keywordsValue !== '-' ? keywordsValue.split(',').map(k => k.trim()) : [];
                  
                  return (
                    <div key={weapon.id} className="bg-gray-700 rounded-lg overflow-hidden">
                      {/* Weapon Name Header */}
                      <div className="bg-gray-600 px-2 py-1">
                        <div className="text-xs font-medium text-white">
                          {weapon.name}{weapon.count > 1 ? ` (x${weapon.count})` : ''}
                        </div>
                      </div>
                      
                      {/* Weapon Stats Table */}
                      <div className="bg-gray-700">
                        <div className="grid grid-cols-7 gap-0">
                          {/* Headers */}
                          <div className="bg-gray-600 px-1 py-1 text-center border-r border-gray-500">
                            <div className="text-xs font-semibold text-gray-200 uppercase">Range</div>
                          </div>
                          <div className="bg-gray-600 px-1 py-1 text-center border-r border-gray-500">
                            <div className="text-xs font-semibold text-gray-200 uppercase">A</div>
                          </div>
                          <div className="bg-gray-600 px-1 py-1 text-center border-r border-gray-500">
                            <div className="text-xs font-semibold text-gray-200 uppercase">WS</div>
                          </div>
                          <div className="bg-gray-600 px-1 py-1 text-center border-r border-gray-500">
                            <div className="text-xs font-semibold text-gray-200 uppercase">S</div>
                          </div>
                          <div className="bg-gray-600 px-1 py-1 text-center border-r border-gray-500">
                            <div className="text-xs font-semibold text-gray-200 uppercase">AP</div>
                          </div>
                          <div className="bg-gray-600 px-1 py-1 text-center border-r border-gray-500">
                            <div className="text-xs font-semibold text-gray-200 uppercase">D</div>
                          </div>
                          <div className="bg-gray-600 px-1 py-1 text-center">
                            <div className="text-xs font-semibold text-gray-200 uppercase">Keywords</div>
                          </div>
                          
                          {/* Values */}
                          <div className="bg-gray-700 px-1 py-1 text-center border-r border-gray-600">
                            <div className="text-xs font-mono text-white">
                              {weapon.characteristics.find(c => c.name === 'Range')?.value || '-'}
                            </div>
                          </div>
                          <div className="bg-gray-700 px-1 py-1 text-center border-r border-gray-600">
                            <div className="text-xs font-mono text-white">
                              {weapon.characteristics.find(c => c.name === 'A')?.value || '-'}
                            </div>
                          </div>
                          <div className="bg-gray-700 px-1 py-1 text-center border-r border-gray-600">
                            <div className="text-xs font-mono text-white">
                              {weapon.characteristics.find(c => c.name === 'WS')?.value || '-'}
                            </div>
                          </div>
                          <div className="bg-gray-700 px-1 py-1 text-center border-r border-gray-600">
                            <div className="text-xs font-mono text-white">
                              {weapon.characteristics.find(c => c.name === 'S')?.value || '-'}
                            </div>
                          </div>
                          <div className="bg-gray-700 px-1 py-1 text-center border-r border-gray-600">
                            <div className="text-xs font-mono text-white">
                              {weapon.characteristics.find(c => c.name === 'AP')?.value || '-'}
                            </div>
                          </div>
                          <div className="bg-gray-700 px-1 py-1 text-center border-r border-gray-600">
                            <div className="text-xs font-mono text-white">
                              {weapon.characteristics.find(c => c.name === 'D')?.value || '-'}
                            </div>
                          </div>
                          <div className="bg-gray-700 px-1 py-1 text-left">
                            <div className="text-xs">
                              {keywords.length > 0 ? (
                                keywords.map((keyword, index) => {
                                  const hasRule = COMMON_RULES[keyword] || parseRuleDescription(keyword);
                                  return (
                                    <span key={index}>
                                      {index > 0 && ', '}
                                      <span
                                        className={hasRule ? 'text-blue-400 cursor-pointer hover:text-blue-300 underline' : 'text-blue-400'}
                                        onClick={hasRule && onKeywordClick ? () => onKeywordClick(keyword) : undefined}
                                        title={hasRule ? 'Click for details' : undefined}
                                      >
                                        {keyword}
                                      </span>
                                    </span>
                                  );
                                })
                              ) : (
                                <span className="text-blue-400">-</span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Abilities */}
          {unit.rules && unit.rules.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-gray-300 mb-2">Abilities</h4>
              <div className="space-y-2">
                {unit.rules.map((rule) => (
                  <div key={rule.id} className="bg-gray-700 rounded-lg p-2">
                    <div className="text-xs font-medium text-white mb-1">{rule.name}</div>
                    <div className="text-xs text-gray-300">{rule.description}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Keywords */}
          <div>
            <h4 className="text-sm font-semibold text-gray-300 mb-2">Keywords</h4>
            <KeywordList
              keywords={[...factionKeywords, ...generalKeywords]}
              onKeywordClick={onKeywordClick}
              variant="keyword"
            />
          </div>
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
              <h3 className="text-lg font-semibold text-gray-200 mb-3">
                {type} ({typeUnits.length})
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