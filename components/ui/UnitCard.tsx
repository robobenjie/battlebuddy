'use client';

import React, { useState } from 'react';

import { KeywordList, extractFactionKeywords, extractGeneralKeywords } from './KeywordBadge';
import { COMMON_RULES, parseRuleDescription } from './RulePopup';
import RulePopup, { useRulePopup } from './RulePopup';
import RuleTip from './RuleTip';
import ReminderBadge from './ReminderBadge';
import { getWeaponCount, getModelsForUnit, getWeaponsForUnit, getUnitDisplayName } from '../../lib/unit-utils';
import { getUnitReminders, deduplicateRemindersByName, PhaseType, TurnContext } from '../../lib/rules-engine/reminder-utils';

interface UnitCardProps {
  unit: {
    id: string;
    name: string;
    type: string;
    cost: number;
    count: number;
    categories: string[];
    rules?: Array<{
      id: string;
      name: string;
      description: string;
      characteristics?: Array<{
        name: string;
        typeId?: string;
        value: string;
      }>;
      typeName?: string;
    }>;
    abilities?: Array<{
      id: string;
      name: string;
      description?: string;
      characteristics?: Array<{
        name: string;
        typeId?: string;
        value: string;
      }>;
    }>;
    models?: Array<{
      id: string;
      name: string;
      M: number; // movement in inches
      T: number; // toughness
      SV: number; // save value
      W: number; // wounds
      LD: number; // leadership
      OC: number; // objective control
      woundsTaken: number; // starts at zero, tracks damage
      weapons?: Array<{
        id: string;
        name: string;
        range: number; // range in inches, 0 for melee
        A: string; // attacks (number or dice representation like "d6 + 3")
        WS: number; // weapon skill (just the number: 4 represents "4+")
        S: number; // strength
        AP: number; // armour penetration
        D: string; // damage (number or dice)
        keywords: string[]; // array of keywords like ["melta-2", "assault"]
        turnsFired: number[]; // array of turns when this weapon was fired
      }>;
    }>;
  };
  className?: string;
  expandable?: boolean;
  defaultExpanded?: boolean;
  currentPhase?: PhaseType;
  currentTurn?: TurnContext;
  armyStates?: any[];
}

export default function UnitCard({
  unit,
  className = '',
  expandable = true,
  defaultExpanded = false,
  currentPhase,
  currentTurn,
  armyStates
}: UnitCardProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const { isOpen, rule, showRule, hideRule } = useRulePopup();

  // Safety check for unit data
  if (!unit || !unit.id || !unit.name) {
    return (
      <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
        <p className="text-gray-400">Invalid unit data</p>
      </div>
    );
  }

  // Get models and weapons from the unit
  const models = getModelsForUnit(unit);
  const weapons = getWeaponsForUnit(unit);

  // Get reminder rules for this unit if phase and turn are provided
  const rawReminders = (currentPhase && currentTurn)
    ? getUnitReminders(unit, currentPhase, currentTurn, armyStates)
    : [];

  // Deduplicate reminders by name (e.g., multiple Waaagh! rules should show as one badge)
  const reminders = deduplicateRemindersByName(rawReminders);

  // Helper: group weapons by name+type (optionally add more fields for uniqueness)
  function groupWeapons(weapons: any[]) {
    const map = new Map<string, { weapon: any, count: number }>();
    for (const weapon of weapons) {
      // Key by name+range (add more fields if needed for uniqueness)
      const key = `${weapon.name}__${weapon.range}`;
      if (map.has(key)) {
        map.get(key)!.count += 1;
      } else {
        map.set(key, { weapon, count: 1 });
      }
    }
    return Array.from(map.values());
  }

  // Extract keywords from categories
  const factionKeywords = extractFactionKeywords(unit.categories || []);
  const generalKeywords = extractGeneralKeywords(unit.categories || []);

  // Calculate model configurations for collapsed view (group by name)
  const getModelConfigurations = () => {
    if (!models || models.length === 0) return [];
    
    const configMap = new Map<string, number>();
    models.forEach((model: any) => {
      configMap.set(model.name, (configMap.get(model.name) || 0) + 1);
    });
    
    return Array.from(configMap.entries()).map(([name, count]) => ({
      name,
      count
    }));
  };

  // Calculate total model count
  const totalModels = models.length;

  // Calculate total weapon count
  const totalWeapons = weapons.length;

  const toggleExpanded = () => {
    if (expandable) {
      setIsExpanded(!isExpanded);
    }
  };

  // Grouped weapons for rendering
  const groupedRangedWeapons = groupWeapons(weapons.filter((w: any) => w.range > 0));
  const groupedMeleeWeapons = groupWeapons(weapons.filter((w: any) => w.range === 0));

  return (
    <>
      <div className={`bg-gray-800 rounded-lg border border-gray-700 overflow-hidden ${className}`}>
        {/* Header */}
        <div 
          className={`bg-gray-750 px-4 py-3 border-b border-gray-700 ${expandable ? 'cursor-pointer hover:bg-gray-700' : ''}`}
          onClick={toggleExpanded}
        >
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <h3 className="font-medium text-white text-sm">
                {totalModels > 1 ? `${totalModels} ` : ''}{getUnitDisplayName(unit)}
              </h3>
              {/* Reminders */}
              {reminders.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {reminders.map((reminder) => (
                    <ReminderBadge
                      key={reminder.id}
                      rule={reminder}
                      onClick={() => showRule(reminder.name, reminder.description)}
                    />
                  ))}
                </div>
              )}
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
                          <div className="text-xs font-mono text-white truncate">{getUnitDisplayName(unit)}</div>
                        </div>
                        <div className="bg-gray-700 px-1 py-1 text-center border-r border-gray-600">
                          <div className="text-xs font-mono text-white">
                            {models[0].M ? `${models[0].M}"` : '-'}
                          </div>
                        </div>
                        <div className="bg-gray-700 px-1 py-1 text-center border-r border-gray-600">
                          <div className="text-xs font-mono text-white">
                            {models[0].T || '-'}
                          </div>
                        </div>
                        <div className="bg-gray-700 px-1 py-1 text-center border-r border-gray-600">
                          <div className="text-xs font-mono text-white">
                            {models[0].SV ? `${models[0].SV}+` : '-'}
                          </div>
                        </div>
                        <div className="bg-gray-700 px-1 py-1 text-center border-r border-gray-600">
                          <div className="text-xs font-mono text-white">
                            {models[0].W || '-'}
                          </div>
                        </div>
                        <div className="bg-gray-700 px-1 py-1 text-center border-r border-gray-600">
                          <div className="text-xs font-mono text-white">
                            {models[0].LD ? `${models[0].LD}+` : '-'}
                          </div>
                        </div>
                        <div className="bg-gray-700 px-1 py-1 text-center">
                          <div className="text-xs font-mono text-white">
                            {models[0].OC || '-'}
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Ranged Weapons */}
            {groupedRangedWeapons.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-gray-300 mb-2">Ranged Weapons</h4>
                <div className="space-y-3">
                  {groupedRangedWeapons.map(({ weapon, count }) => {
                    const keywords = weapon.keywords || [];
                    return (
                      <div key={weapon.name + weapon.range} className="bg-gray-700 rounded-lg overflow-hidden">
                        {/* Weapon Name Header */}
                        <div className="bg-gray-600 px-2 py-1">
                          <div className="text-xs font-medium text-white">
                            {weapon.name}{count > 1 ? ` (x${count})` : ''}
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
                                {weapon.range ? `${weapon.range}"` : '-'}
                              </div>
                            </div>
                            <div className="bg-gray-700 px-1 py-1 text-center border-r border-gray-600">
                              <div className="text-xs font-mono text-white">
                                {weapon.A || '-'}
                              </div>
                            </div>
                            <div className="bg-gray-700 px-1 py-1 text-center border-r border-gray-600">
                              <div className="text-xs font-mono text-white">
                                {weapon.WS ? `${weapon.WS}+` : '-'}
                              </div>
                            </div>
                            <div className="bg-gray-700 px-1 py-1 text-center border-r border-gray-600">
                              <div className="text-xs font-mono text-white">
                                {weapon.S || '-'}
                              </div>
                            </div>
                            <div className="bg-gray-700 px-1 py-1 text-center border-r border-gray-600">
                              <div className="text-xs font-mono text-white">
                                {weapon.AP || '-'}
                              </div>
                            </div>
                            <div className="bg-gray-700 px-1 py-1 text-center border-r border-gray-600">
                              <div className="text-xs font-mono text-white">
                                {weapon.D || '-'}
                              </div>
                            </div>
                            <div className="bg-gray-700 px-1 py-1 text-left">
                              <div className="text-xs">
                                {keywords.length > 0 ? (
                                  keywords.map((keyword: string, index: number) => {
                                    const hasRule = COMMON_RULES[keyword] || parseRuleDescription(keyword);
                                    return (
                                      <span key={index}>
                                        {index > 0 && ', '}
                                        <span
                                          className={hasRule ? 'text-blue-400 cursor-pointer hover:text-blue-300 underline' : 'text-blue-400'}
                                          onClick={hasRule ? () => showRule(keyword) : undefined}
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
            {groupedMeleeWeapons.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-gray-300 mb-2">Melee Weapons</h4>
                <div className="space-y-3">
                  {groupedMeleeWeapons.map(({ weapon, count }) => {
                    const keywords = weapon.keywords || [];
                    return (
                      <div key={weapon.name + weapon.range} className="bg-gray-700 rounded-lg overflow-hidden">
                        {/* Weapon Name Header */}
                        <div className="bg-gray-600 px-2 py-1">
                          <div className="text-xs font-medium text-white">
                            {weapon.name}{count > 1 ? ` (x${count})` : ''}
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
                                {weapon.range ? `${weapon.range}"` : '-'}
                              </div>
                            </div>
                            <div className="bg-gray-700 px-1 py-1 text-center border-r border-gray-600">
                              <div className="text-xs font-mono text-white">
                                {weapon.A || '-'}
                              </div>
                            </div>
                            <div className="bg-gray-700 px-1 py-1 text-center border-r border-gray-600">
                              <div className="text-xs font-mono text-white">
                                {weapon.WS ? `${weapon.WS}+` : '-'}
                              </div>
                            </div>
                            <div className="bg-gray-700 px-1 py-1 text-center border-r border-gray-600">
                              <div className="text-xs font-mono text-white">
                                {weapon.S || '-'}
                              </div>
                            </div>
                            <div className="bg-gray-700 px-1 py-1 text-center border-r border-gray-600">
                              <div className="text-xs font-mono text-white">
                                {weapon.AP || '-'}
                              </div>
                            </div>
                            <div className="bg-gray-700 px-1 py-1 text-center border-r border-gray-600">
                              <div className="text-xs font-mono text-white">
                                {weapon.D || '-'}
                              </div>
                            </div>
                            <div className="bg-gray-700 px-1 py-1 text-left">
                              <div className="text-xs">
                                {keywords.length > 0 ? (
                                  keywords.map((keyword: string, index: number) => {
                                    const hasRule = COMMON_RULES[keyword] || parseRuleDescription(keyword);
                                    return (
                                      <span key={index}>
                                        {index > 0 && ', '}
                                        <span
                                          className={hasRule ? 'text-blue-400 cursor-pointer hover:text-blue-300 underline' : 'text-blue-400'}
                                          onClick={hasRule ? () => showRule(keyword) : undefined}
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
            {unit.abilities && unit.abilities.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-gray-300 mb-2">Abilities</h4>
                <div className="space-y-2">
                  {unit.abilities.map((ability) => {
                    const description = ability.description || 
                      (ability.characteristics && ability.characteristics.length > 0 
                        ? ability.characteristics.map(char => 
                            char.name === 'Description' ? char.value : `${char.name}: ${char.value}`
                          ).join('\n')
                        : undefined
                      );
                    
                    return (
                      <RuleTip
                        key={ability.id}
                        title={ability.name}
                        description={description}
                      />
                    );
                  })}
                </div>
              </div>
            )}

            {/* Rules */}
            {unit.rules && unit.rules.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-gray-300 mb-2">Rules</h4>
                <div className="space-y-2">
                  {unit.rules.map((rule) => (
                    <RuleTip
                      key={rule.id}
                      title={rule.name}
                      description={rule.description}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Keywords */}
            <div>
              <h4 className="text-sm font-semibold text-gray-300 mb-2">Keywords</h4>
              <KeywordList
                keywords={[...factionKeywords, ...generalKeywords]}
                onKeywordClick={showRule}
                variant="keyword"
              />
            </div>
          </div>
        )}
      </div>

      {/* Rule Popup */}
      <RulePopup
        isOpen={isOpen}
        onClose={hideRule}
        rule={rule}
      />
    </>
  );
}

// Component for displaying multiple units
interface UnitListProps {
  units: Array<{
    unit: UnitCardProps['unit'];
  }>;
  className?: string;
  expandable?: boolean;
  groupByType?: boolean;
}

export function UnitList({ 
  units, 
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
          expandable={expandable}
        />
      ))}
    </div>
  );
} 