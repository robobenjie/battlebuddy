/**
 * Army Import Module for BattleBuddy
 * Handles importing and parsing BattleScribe/NewRecruit army roster JSON data
 * 
 * Phase 1: Basic Army Import - Parse roster metadata and create army entity
 * Phase 2: Unit Extraction - Extract and create unit entities
 */

import { id } from '@instantdb/react';
import { db } from './db';

export interface ArmyMetadata {
  id: string;
  name: string;
  faction: string;
  detachment: string;
  battleSize: string;
  totalPoints: number;
  pointsLimit: number;
  ownerId: string;
  sourceData: string;
  createdAt: number;
}

// Phase 2: Unit interfaces adapted from old_parsing.ts
export interface UnitData {
  id: string;
  name: string;
  type: string;
  cost: number;
  count: number;
  categories: string[];
  profiles: Array<{
    id: string;
    name: string;
    typeName?: string;
    characteristics: Array<{
      name: string;
      typeId: string;
      value: string;
    }>;
  }>;
  rules: Array<{
    id: string;
    name: string;
    description: string;
  }>;
  sourceData: any; // Original selection data for re-parsing
  armyId: string;
  ownerId: string;
}

// Phase 3: Model interfaces adapted from old_parsing.ts
export interface ModelData {
  id: string;
  name: string;
  characteristics: Array<{
    name: string;
    value: string;
  }>;
  unitId: string;
  armyId: string;
  ownerId: string;
}

// Phase 4: Weapon interfaces adapted from old_parsing.ts
export interface WeaponData {
  id: string;
  name: string;
  type: string; // 'ranged' or 'melee'
  count: number;
  characteristics: Array<{
    name: string;
    value: string;
  }>;
  profiles: Array<{
    name: string;
    characteristics: Array<{
      name: string;
      value: string;
    }>;
  }>;
  modelId: string;
  unitId: string;
  armyId: string;
  ownerId: string;
}

export interface NewRecruitRoster {
  roster: {
    name?: string;
    costs?: Array<{ name: string; typeId: string; value: number }>;
    costLimits?: Array<{ name: string; typeId: string; value: number }>;
    forces?: Array<{
      selections?: Array<{
        name: string;
        categories?: Array<{ name: string; id: string }>;
        selections?: Array<any>;
      }>;
    }>;
  };
}

/**
 * Phase 1: Extract basic army metadata from NewRecruit JSON
 */
export function extractArmyMetadata(jsonData: NewRecruitRoster, userId: string): ArmyMetadata {
  const roster = jsonData.roster;
  
  if (!roster) {
    throw new Error('Invalid roster data: missing roster object');
  }

  // Extract basic roster information
  const name = roster.name || 'Unnamed Army';
  const totalPoints = roster.costs?.find(cost => cost.name === 'pts')?.value || 0;
  const pointsLimit = roster.costLimits?.find(limit => limit.name === 'pts')?.value || 0;

  // Extract faction, detachment, and battle size from forces selections
  let faction = '';
  let detachment = '';
  let battleSize = '';

  if (roster.forces && roster.forces.length > 0) {
    const force = roster.forces[0];
    
    if (force.selections) {
      for (const selection of force.selections) {
        // Check for battle size
        if (selection.name === 'Battle Size' && selection.selections && selection.selections.length > 0) {
          battleSize = selection.selections[0].name || '';
        }
        
        // Check for detachment
        if (selection.name === 'Detachment' && selection.selections && selection.selections.length > 0) {
          detachment = selection.selections[0].name || '';
        }
        
        // Extract faction from categories - look for "Faction: X" pattern
        if (selection.categories) {
          const factionCategory = selection.categories.find(cat => 
            cat.name && cat.name.startsWith('Faction:')
          );
          if (factionCategory) {
            faction = factionCategory.name.replace('Faction: ', '');
          }
        }
      }
    }
  }

  return {
    id: id(),
    name,
    faction,
    detachment,
    battleSize,
    totalPoints,
    pointsLimit,
    ownerId: userId,
    sourceData: JSON.stringify(jsonData),
    createdAt: Date.now()
  };
}

/**
 * Import an army from NewRecruit JSON and store in InstantDB
 */
export async function importArmy(jsonData: NewRecruitRoster, userId: string): Promise<string> {
  const armyMetadata = extractArmyMetadata(jsonData, userId);
  
  try {
    // Store in user's private armies collection
    await db.transact([
      db.tx.armies[armyMetadata.id].update({
        name: armyMetadata.name,
        faction: armyMetadata.faction,
        detachment: armyMetadata.detachment,
        battleSize: armyMetadata.battleSize,
        totalPoints: armyMetadata.totalPoints,
        pointsLimit: armyMetadata.pointsLimit,
        ownerId: armyMetadata.ownerId,
        sourceData: armyMetadata.sourceData,
        createdAt: armyMetadata.createdAt
      })
    ]);
    
    return armyMetadata.id;
  } catch (error) {
    console.error('Failed to import army:', error);
    throw new Error(`Army import failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// ============================================================================
// Phase 2: Unit Extraction Functions (adapted from old_parsing.ts)
// ============================================================================

/**
 * Extract units from NewRecruit JSON - Phase 2 functionality
 */
export function extractUnits(jsonData: NewRecruitRoster, armyId: string, userId: string): UnitData[] {
  const roster = jsonData.roster;
  
  if (!roster?.forces || roster.forces.length === 0) {
    return [];
  }

  const units: UnitData[] = [];
  const force = roster.forces[0];
  
  if (force.selections) {
    for (const selection of force.selections) {
      // Check if this is a unit (not configuration) using adapted logic
      if (isUnit(selection)) {
        const unitData = parseUnit(selection, armyId, userId);
        units.push(unitData);
      }
    }
  }

  return units;
}

/**
 * Helper method to determine if a selection is a unit (adapted from old_parsing.ts)
 */
function isUnit(selection: any): boolean {
  if (!selection.categories) return false;
  
  // Configuration items are not units
  const isConfiguration = selection.categories.some((cat: any) => 
    cat.name === 'Configuration'
  );
  
  if (isConfiguration) return false;
  
  // Must have unit-like categories
  const unitCategories = ['Character', 'Infantry', 'Monster', 'Vehicle', 'Battleline', 'Mounted'];
  return selection.categories.some((cat: any) => 
    unitCategories.some(unitCat => cat.name === unitCat)
  );
}

/**
 * Helper method to parse a unit from selection data (adapted from old_parsing.ts)
 */
function parseUnit(selection: any, armyId: string, userId: string): UnitData {
  const categories = selection.categories?.map((cat: any) => cat.name) || [];
  let cost = selection.costs?.[0]?.value || 0;
  
  // If unit cost is 0, sum up costs from model selections
  if (cost === 0 && selection.selections) {
    cost = sumSelectionCosts(selection.selections);
  }
  
  // Parse rules
  const rules = selection.rules?.map((rule: any) => ({
    id: rule.id,
    name: rule.name,
    description: rule.description || ''
  })) || [];
  
  // Parse profiles
  const profiles = selection.profiles?.map((profile: any) => ({
    id: profile.id,
    name: profile.name,
    typeName: profile.typeName,
    characteristics: profile.characteristics?.map((char: any) => ({
      name: char.name,
      typeId: char.typeId,
      value: char.$text || ''
    })) || []
  })) || [];

  return {
    id: id(),
    name: selection.name,
    type: selection.type || 'unit',
    cost,
    count: selection.number || 1,
    categories,
    profiles,
    rules,
    sourceData: selection, // Store original selection for re-parsing
    armyId,
    ownerId: userId
  };
}

/**
 * Helper method to sum costs from nested selections (adapted from old_parsing.ts)
 */
function sumSelectionCosts(selections: any[]): number {
  let totalCost = 0;
  for (const sel of selections) {
    const selectionCost = sel.costs?.[0]?.value || 0;
    totalCost += selectionCost;
    
    // Recursively sum nested selection costs
    if (sel.selections) {
      totalCost += sumSelectionCosts(sel.selections);
    }
  }
  return totalCost;
}

/**
 * Import an army with units (Phase 1 + Phase 2) from NewRecruit JSON and store in InstantDB
 */
export async function importArmyWithUnits(jsonData: NewRecruitRoster, userId: string): Promise<{ armyId: string; unitIds: string[] }> {
  // Phase 1: Import army metadata
  const armyMetadata = extractArmyMetadata(jsonData, userId);
  
  // Phase 2: Extract units
  const units = extractUnits(jsonData, armyMetadata.id, userId);
  
  try {
    const transactions = [];
    
    // Add army transaction
    transactions.push(
      db.tx.armies[armyMetadata.id].update({
        name: armyMetadata.name,
        faction: armyMetadata.faction,
        detachment: armyMetadata.detachment,
        battleSize: armyMetadata.battleSize,
        totalPoints: armyMetadata.totalPoints,
        pointsLimit: armyMetadata.pointsLimit,
        ownerId: armyMetadata.ownerId,
        sourceData: armyMetadata.sourceData,
        createdAt: armyMetadata.createdAt
      })
    );
    
    // Add unit transactions (Note: This will need units entity in schema)
    for (const unit of units) {
      transactions.push(
        db.tx.units[unit.id].update({
          name: unit.name,
          type: unit.type,
          cost: unit.cost,
          count: unit.count,
          categories: unit.categories,
          profiles: unit.profiles,
          rules: unit.rules,
          sourceData: unit.sourceData,
          armyId: unit.armyId,
          ownerId: unit.ownerId
        })
      );
    }
    
    // Execute all transactions
    await db.transact(transactions);
    
    return {
      armyId: armyMetadata.id,
      unitIds: units.map(u => u.id)
    };
  } catch (error) {
    console.error('Failed to import army with units:', error);
    throw new Error(`Army import failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// ============================================================================
// Phase 3: Model Processing Functions (adapted from old_parsing.ts)
// ============================================================================

/**
 * Extract models from a unit - Phase 3 functionality
 */
export function extractModels(unit: UnitData): ModelData[] {
  const statlines = getUnitStatlines(unit);
  const models: ModelData[] = [];

  for (const statline of statlines) {
    // Create individual model records for each count
    for (let i = 0; i < statline.count; i++) {
      models.push({
        id: id(),
        name: statline.modelName,
        characteristics: statline.characteristics,
        unitId: unit.id,
        armyId: unit.armyId,
        ownerId: unit.ownerId
      });
    }
  }

  return models;
}

/**
 * Get unit statlines grouped by model configuration with counts (adapted from old_parsing.ts)
 */
function getUnitStatlines(unit: UnitData): Array<{
  modelName: string;
  count: number;
  characteristics: Array<{ name: string; value: string }>;
}> {
  const statlineMap = new Map<string, {
    count: number;
    characteristics: Array<{ name: string; value: string }>;
  }>();

  // Check unit's own selections for model statlines from source data
  if (unit.sourceData?.selections) {
    extractStatlinesFromSelections(unit.sourceData.selections, statlineMap);
  }

  // If no statlines found in selections, fallback to unit profiles
  if (statlineMap.size === 0 && unit.profiles) {
    for (const profile of unit.profiles) {
      if (profile.typeName === 'Unit' && profile.characteristics && profile.characteristics.length > 0) {
        statlineMap.set(unit.name, {
          count: unit.count || 1,
          characteristics: profile.characteristics.map(char => ({
            name: char.name,
            value: char.value
          }))
        });
        break; // Use first valid unit profile
      }
    }
  } else if (statlineMap.size > 0) {
    // Check if any models have empty characteristics (meaning they need parent unit profile)
    const parentUnitProfile = unit.profiles?.find(p => p.typeName === 'Unit' && p.characteristics && p.characteristics.length > 0);
    
    if (parentUnitProfile) {
      const parentCharacteristics = parentUnitProfile.characteristics.map(char => ({
        name: char.name,
        value: char.value
      }));
      
      // Fill in empty characteristics with parent unit profile
      for (const [modelName, data] of statlineMap.entries()) {
        if (data.characteristics.length === 0) {
          data.characteristics = parentCharacteristics;
        }
      }
    }
  }

  // Convert map to array with counts and sort by count (most common first)
  return Array.from(statlineMap.entries())
    .map(([modelName, data]) => ({
      modelName,
      count: data.count,
      characteristics: data.characteristics
    }))
    .sort((a, b) => b.count - a.count); // Sort by count descending (most common first)
}

/**
 * Helper method to extract statlines from selections recursively (adapted from old_parsing.ts)
 */
function extractStatlinesFromSelections(
  selections: any[], 
  statlineMap: Map<string, {
    count: number;
    characteristics: Array<{ name: string; value: string }>;
  }>
): void {
  for (const selection of selections) {
    // Check if this selection has unit profiles (statlines)
    if (selection.profiles && selection.profiles.length > 0) {
      for (const profile of selection.profiles) {
        if (profile.typeName === 'Unit') {
          // Use selection name if it's different from profile name (more specific)
          // Otherwise use profile name for backward compatibility
          let modelName = selection.name !== profile.name ? selection.name : profile.name;
          
          // If this is a model selection, enhance with weapon configuration
          if (selection.type === 'model' && selection.selections && selection.selections.length > 0) {
            const weapons = selection.selections
              .filter((sel: any) => {
                if (sel.type === 'upgrade') return true;
                return sel.categories?.some((cat: any) => 
                  cat.toLowerCase().includes('weapon')
                );
              })
              .map((sel: any) => sel.name)
              .filter((name: string) => name && name.trim().length > 0);
            
            if (weapons.length > 0) {
              modelName += ` w/ ${weapons.join(' and ')}`;
            }
          }
          
          const modelCount = selection.number || 1;
          
          if (statlineMap.has(modelName)) {
            // Add to existing model count
            const existing = statlineMap.get(modelName)!;
            existing.count += modelCount;
          } else {
            // Add new model statline
            statlineMap.set(modelName, {
              count: modelCount,
              characteristics: profile.characteristics.map((char: any) => ({
                name: char.name,
                value: char.$text || ''
              }))
            });
          }
        }
      }
    } else if (selection.type === 'model' && selection.number && selection.number > 0) {
      // Handle model selections that don't have their own Unit profiles
      // but should be counted as separate model types with weapon configurations
      const modelName = extractModelNameFromSelection(selection);
      if (modelName) {
        const modelCount = selection.number;
        
        if (statlineMap.has(modelName)) {
          // Add to existing model count
          const existing = statlineMap.get(modelName)!;
          existing.count += modelCount;
        } else {
          // We need to find the parent unit's statline for this model
          // This will be handled by the caller if no statlines are found
          // For now, just record the model name with a placeholder
          statlineMap.set(modelName, {
            count: modelCount,
            characteristics: [] // Will be filled by parent unit profile
          });
        }
      }
    }

    // Recursively check nested selections
    if (selection.selections) {
      extractStatlinesFromSelections(selection.selections, statlineMap);
    }
  }
}

/**
 * Helper method to extract a comprehensive model configuration name from a selection (adapted from old_parsing.ts)
 */
function extractModelNameFromSelection(selection: any): string | null {
  if (selection.type === 'model' && selection.name) {
    let configName = selection.name;
    
    // Add weapon/equipment configurations from nested selections
    if (selection.selections && selection.selections.length > 0) {
      const weapons = selection.selections
        .filter((sel: any) => {
          if (sel.type === 'upgrade') return true;
          return sel.categories?.some((cat: any) => 
            cat.toLowerCase().includes('weapon')
          );
        })
        .map((sel: any) => sel.name)
        .filter((name: string) => name && name.trim().length > 0);
      
      if (weapons.length > 0) {
        configName += ` w/ ${weapons.join(' and ')}`;
      }
    }
    
    return configName;
  }
  return null;
}

/**
 * Import an army with units and models (Phase 1 + Phase 2 + Phase 3) from NewRecruit JSON and store in InstantDB
 */
export async function importArmyWithUnitsAndModels(jsonData: NewRecruitRoster, userId: string): Promise<{ armyId: string; unitIds: string[]; modelIds: string[] }> {
  // Phase 1: Import army metadata
  const armyMetadata = extractArmyMetadata(jsonData, userId);
  
  // Phase 2: Extract units
  const units = extractUnits(jsonData, armyMetadata.id, userId);
  
  // Phase 3: Extract models from units
  const allModels: ModelData[] = [];
  for (const unit of units) {
    const unitModels = extractModels(unit);
    allModels.push(...unitModels);
  }
  
  try {
    const transactions = [];
    
    // Add army transaction
    transactions.push(
      db.tx.armies[armyMetadata.id].update({
        name: armyMetadata.name,
        faction: armyMetadata.faction,
        detachment: armyMetadata.detachment,
        battleSize: armyMetadata.battleSize,
        totalPoints: armyMetadata.totalPoints,
        pointsLimit: armyMetadata.pointsLimit,
        ownerId: armyMetadata.ownerId,
        sourceData: armyMetadata.sourceData,
        createdAt: armyMetadata.createdAt
      })
    );
    
    // Add unit transactions
    for (const unit of units) {
      transactions.push(
        db.tx.units[unit.id].update({
          name: unit.name,
          type: unit.type,
          cost: unit.cost,
          count: unit.count,
          categories: unit.categories,
          profiles: unit.profiles,
          rules: unit.rules,
          sourceData: unit.sourceData,
          armyId: unit.armyId,
          ownerId: unit.ownerId
        })
      );
    }
    
    // Add model transactions
    for (const model of allModels) {
      transactions.push(
        db.tx.models[model.id].update({
          name: model.name,
          characteristics: model.characteristics,
          unitId: model.unitId,
          armyId: model.armyId,
          ownerId: model.ownerId
        })
      );
    }
    
    // Execute all transactions
    await db.transact(transactions);
    
    return {
      armyId: armyMetadata.id,
      unitIds: units.map(u => u.id),
      modelIds: allModels.map(m => m.id)
    };
  } catch (error) {
    console.error('Failed to import army with units and models:', error);
    throw new Error(`Army import failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// ============================================================================
// Phase 4: Weapon Processing Functions (adapted from old_parsing.ts)
// ============================================================================

/**
 * Extract weapons from a unit for all models - Phase 4 functionality
 */
export function extractWeapons(unit: UnitData, models: ModelData[]): WeaponData[] {
  const allWeapons: WeaponData[] = [];
  
  // Extract ranged weapons
  const rangedWeapons = extractWeaponsFromUnit(unit, models, 'Ranged Weapons');
  allWeapons.push(...rangedWeapons);
  
  // Extract melee weapons
  const meleeWeapons = extractWeaponsFromUnit(unit, models, 'Melee Weapons');
  allWeapons.push(...meleeWeapons);
  
  return allWeapons;
}

/**
 * Extract weapons of a specific type from a unit (adapted from old_parsing.ts)
 */
function extractWeaponsFromUnit(unit: UnitData, models: ModelData[], weaponType: string): WeaponData[] {
  const weaponMap = new Map<string, {
    count: number;
    characteristics: Array<{ name: string; value: string }>;
    profiles: Array<{
      name: string;
      characteristics: Array<{ name: string; value: string }>;
    }>;
    modelIds: Set<string>;
  }>();

  if (unit.sourceData?.selections) {
    // Use model-specific extraction with casualty awareness
    extractWeaponsFromSelections(unit.sourceData.selections, weaponType, weaponMap, models, unit);
  }

  // Convert map to weapon data array
  const weapons: WeaponData[] = [];
  for (const [weaponName, weaponInfo] of weaponMap.entries()) {
    // For now, assign weapons to the first model they're associated with
    // In a more sophisticated implementation, we might distribute them more intelligently
    const modelId = weaponInfo.modelIds.size > 0 ? Array.from(weaponInfo.modelIds)[0] : models[0]?.id || '';
    
    weapons.push({
      id: id(),
      name: weaponName,
      type: weaponType === 'Ranged Weapons' ? 'ranged' : 'melee',
      count: weaponInfo.count,
      characteristics: weaponInfo.characteristics,
      profiles: weaponInfo.profiles,
      modelId,
      unitId: unit.id,
      armyId: unit.armyId,
      ownerId: unit.ownerId
    });
  }

  return weapons;
}

/**
 * Helper method to extract weapons from selections recursively (adapted from old_parsing.ts)
 */
function extractWeaponsFromSelections(
  selections: any[], 
  weaponType: string, 
  weaponMap: Map<string, {
    count: number;
    characteristics: Array<{ name: string; value: string }>;
    profiles: Array<{
      name: string;
      characteristics: Array<{ name: string; value: string }>;
    }>;
    modelIds: Set<string>;
  }>,
  models: ModelData[],
  unit: UnitData,
  parentModelSelection?: any
): void {
  for (const selection of selections) {
    // Check if this is a model selection
    const isModelSelection = selection.type === 'model' || 
      (selection.profiles && selection.profiles.some((p: any) => p.typeName === 'Unit'));
    
    if (isModelSelection) {
      // This is a model - recursively process its weapons with this model as parent
      if (selection.selections) {
        extractWeaponsFromSelections(selection.selections, weaponType, weaponMap, models, unit, selection);
      }
    } else {
      // Check if this selection has weapon profiles
      if (selection.profiles) {
        for (const profile of selection.profiles) {
          if (profile.typeName === weaponType) {
            const weaponName = profile.name;
            const weaponCharacteristics = profile.characteristics?.map((c: any) => ({ 
              name: c.name, 
              value: c.$text || '' 
            })) || [];
            
            // Find matching model for this weapon
            let associatedModelId = '';
            if (parentModelSelection) {
              const parentModelName = extractModelNameFromSelection(parentModelSelection) || parentModelSelection.name;
              const matchingModel = models.find(model => 
                model.name === parentModelName || 
                model.name.includes(parentModelName) ||
                parentModelName.includes(model.name)
              );
              associatedModelId = matchingModel?.id || '';
            }
            
            // Calculate weapon count
            let weaponCount = selection.number || 1;
            
            // Add to weapon map
            const existing = weaponMap.get(weaponName);
            if (existing) {
              existing.count += weaponCount;
              if (associatedModelId) {
                existing.modelIds.add(associatedModelId);
              }
            } else {
              weaponMap.set(weaponName, {
                count: weaponCount,
                characteristics: weaponCharacteristics,
                profiles: [{
                  name: 'Standard',
                  characteristics: weaponCharacteristics
                }],
                modelIds: associatedModelId ? new Set([associatedModelId]) : new Set()
              });
            }
          }
        }
      }

      // Recursively search nested selections (with same parent)
      if (selection.selections) {
        extractWeaponsFromSelections(selection.selections, weaponType, weaponMap, models, unit, parentModelSelection);
      }
    }
  }
}

/**
 * Import a complete army (Phase 1 + 2 + 3 + 4) from NewRecruit JSON and store in InstantDB
 */
export async function importCompleteArmy(jsonData: NewRecruitRoster, userId: string): Promise<{ 
  armyId: string; 
  unitIds: string[]; 
  modelIds: string[]; 
  weaponIds: string[] 
}> {
  // Phase 1: Import army metadata
  const armyMetadata = extractArmyMetadata(jsonData, userId);
  
  // Phase 2: Extract units
  const units = extractUnits(jsonData, armyMetadata.id, userId);
  
  // Phase 3: Extract models from units
  const allModels: ModelData[] = [];
  for (const unit of units) {
    const unitModels = extractModels(unit);
    allModels.push(...unitModels);
  }
  
  // Phase 4: Extract weapons from units
  const allWeapons: WeaponData[] = [];
  for (const unit of units) {
    const unitModels = allModels.filter(model => model.unitId === unit.id);
    const unitWeapons = extractWeapons(unit, unitModels);
    allWeapons.push(...unitWeapons);
  }
  
  try {
    const transactions = [];
    
    // Add army transaction
    transactions.push(
      db.tx.armies[armyMetadata.id].update({
        name: armyMetadata.name,
        faction: armyMetadata.faction,
        detachment: armyMetadata.detachment,
        battleSize: armyMetadata.battleSize,
        totalPoints: armyMetadata.totalPoints,
        pointsLimit: armyMetadata.pointsLimit,
        ownerId: armyMetadata.ownerId,
        sourceData: armyMetadata.sourceData,
        createdAt: armyMetadata.createdAt
      })
    );
    
    // Add unit transactions
    for (const unit of units) {
      transactions.push(
        db.tx.units[unit.id].update({
          name: unit.name,
          type: unit.type,
          cost: unit.cost,
          count: unit.count,
          categories: unit.categories,
          profiles: unit.profiles,
          rules: unit.rules,
          sourceData: unit.sourceData,
          armyId: unit.armyId,
          ownerId: unit.ownerId
        })
      );
    }
    
    // Add model transactions
    for (const model of allModels) {
      transactions.push(
        db.tx.models[model.id].update({
          name: model.name,
          characteristics: model.characteristics,
          unitId: model.unitId,
          armyId: model.armyId,
          ownerId: model.ownerId
        })
      );
    }
    
    // Add weapon transactions
    for (const weapon of allWeapons) {
      transactions.push(
        db.tx.weapons[weapon.id].update({
          name: weapon.name,
          type: weapon.type,
          count: weapon.count,
          characteristics: weapon.characteristics,
          profiles: weapon.profiles,
          modelId: weapon.modelId,
          unitId: weapon.unitId,
          armyId: weapon.armyId,
          ownerId: weapon.ownerId
        })
      );
    }
    
    // Execute all transactions
    await db.transact(transactions);
    
    return {
      armyId: armyMetadata.id,
      unitIds: units.map(u => u.id),
      modelIds: allModels.map(m => m.id),
      weaponIds: allWeapons.map(w => w.id)
    };
  } catch (error) {
    console.error('Failed to import complete army:', error);
    throw new Error(`Complete army import failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
} 

/**
 * Import an army for a specific game (creates game copies instead of user templates)
 * Simplified version that only uses core schema fields to test the copying functionality
 */
export async function importArmyForGame(jsonData: NewRecruitRoster, userId: string, gameId: string): Promise<{ 
  armyId: string; 
  unitIds: string[]; 
  modelIds: string[]; 
  weaponIds: string[] 
}> {
  console.log('📥 importArmyForGame called with:', { userId, gameId });
  
  // Phase 1: Import army metadata
  console.log('📥 Phase 1: Extracting army metadata...');
  const armyMetadata = extractArmyMetadata(jsonData, userId);
  console.log('📥 Army metadata:', armyMetadata);
  
  // Phase 2: Extract units
  console.log('📥 Phase 2: Extracting units...');
  const units = extractUnits(jsonData, armyMetadata.id, userId);
  console.log('📥 Units extracted:', units.length, units);
  
  // Phase 3: Extract models from units
  console.log('📥 Phase 3: Extracting models...');
  const allModels: ModelData[] = [];
  for (const unit of units) {
    const unitModels = extractModels(unit);
    allModels.push(...unitModels);
  }
  console.log('📥 Models extracted:', allModels.length, allModels);
  
  // Phase 4: Extract weapons from units
  console.log('📥 Phase 4: Extracting weapons...');
  const allWeapons: WeaponData[] = [];
  for (const unit of units) {
    const unitModels = allModels.filter(model => model.unitId === unit.id);
    const unitWeapons = extractWeapons(unit, unitModels);
    allWeapons.push(...unitWeapons);
  }
  console.log('📥 Weapons extracted:', allWeapons.length, allWeapons);
  
  try {
    const transactions = [];
    
    console.log('📥 Building army transaction...');
    // Add army transaction with required fields that database expects
    transactions.push(
      db.tx.armies[armyMetadata.id].update({
        name: armyMetadata.name,
        faction: armyMetadata.faction,
        pointsValue: armyMetadata.totalPoints,
        unitIds: units.map(u => u.id),
        ownerId: armyMetadata.ownerId,
        sourceData: armyMetadata.sourceData,
        gameId: gameId,
        // Add missing required fields that database expects
        detachment: armyMetadata.detachment,
        battleSize: armyMetadata.battleSize,
        totalPoints: armyMetadata.totalPoints,
        pointsLimit: armyMetadata.pointsLimit,
        createdAt: armyMetadata.createdAt
      })
    );
    
    console.log('📥 Building unit transactions...');
    // Add unit transactions with same structure as template armies
    for (const unit of units) {
      const unitModels = allModels.filter(m => m.unitId === unit.id);
      // Calculate total model count for this unit (count individual models)
      const totalModelCount = unitModels.length;
      
      transactions.push(
        db.tx.units[unit.id].update({
          // Template army fields (keep data structure consistent)
          name: unit.name,
          type: unit.type,
          cost: unit.cost,
          count: unit.count,
          categories: unit.categories,
          profiles: unit.profiles,
          rules: unit.rules,
          sourceData: unit.sourceData,
          armyId: unit.armyId,
          ownerId: unit.ownerId,
          // Game-specific fields  
          startingModels: totalModelCount,
          currentWounds: 0,
          hasMoved: false,
          hasAdvanced: false,
          hasCharged: false,
          isBattleShocked: false,
          hasFallenBack: false,
          isEngaged: false,
          isDestroyed: false,
          turnHistory: [],
          lastActionTurn: 0,
          gameId: gameId,
          // Legacy fields for backward compatibility
          abilities: unit.rules || [],
          modelIds: unitModels.map(m => m.id),
          keywords: unit.categories || []
        })
      );
    }
    
    console.log('📥 Building model transactions...');
    // Add model transactions with required fields that database expects
    for (const model of allModels) {
      const modelWeapons = allWeapons.filter(w => w.modelId === model.id);
      
      // Convert characteristics to baseStats format
      const baseStats: Record<string, any> = {};
      if (model.characteristics && Array.isArray(model.characteristics)) {
        model.characteristics.forEach((char: any) => {
          baseStats[char.name] = char.value;
        });
      }
      
      transactions.push(
        db.tx.models[model.id].update({
          name: model.name,
          baseStats: baseStats,
          currentWounds: 0,
          keywords: [],
          specialRules: [],
          weaponIds: modelWeapons.map(w => w.id),
          isLeader: false,
          isDestroyed: false,
          turnHistory: [],
          lastActionTurn: 0,
          unitId: model.unitId,
          gameId: gameId,
          // Add missing required fields that database expects
          characteristics: model.characteristics || [],
          armyId: model.armyId,
          ownerId: model.ownerId
        })
      );
    }
    
    console.log('📥 Building weapon transactions...');
    // Add weapon transactions with required fields that database expects
    for (const weapon of allWeapons) {
      transactions.push(
        db.tx.weapons[weapon.id].update({
          name: weapon.name,
          type: weapon.type,
          profiles: weapon.profiles || [],
          abilities: [],
          keywords: [],
          modelId: weapon.modelId,
          ownerId: weapon.ownerId,
          gameId: gameId,
          // Add missing required fields that database expects
          count: weapon.count,
          characteristics: weapon.characteristics,
          armyId: weapon.armyId,
          unitId: weapon.unitId
        })
      );
    }
    
    console.log('📥 Executing transactions:', transactions.length, 'total');
    // Execute all transactions
    await db.transact(transactions);
    console.log('📥 Transactions completed successfully');
    
    const result = {
      armyId: armyMetadata.id,
      unitIds: units.map(u => u.id),
      modelIds: allModels.map(m => m.id),
      weaponIds: allWeapons.map(w => w.id)
    };
    console.log('📥 Returning result:', result);
    
    return result;
  } catch (error) {
    console.error('❌ Failed to import army for game:', error);
    throw new Error(`Game army import failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
} 