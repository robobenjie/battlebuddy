/**
 * Army Import Module for BattleBuddy
 * Handles importing and parsing BattleScribe/NewRecruit army roster JSON data
 * 
 * Updated for new simplified schema
 */

import { id } from '@instantdb/react';
import { db } from './db';

export interface ArmyMetadata {
  id: string;
  name: string;
  faction: string;
  detachment?: string;
  ownerId: string;
  sourceData: string;
  createdAt: number;
}

// Updated Unit interface to match new schema
export interface UnitData {
  id: string;
  name: string;
  nickname: string;
  categories: string[];
  rules: Array<{
    id: string;
    name: string;
    description: string;
  }>;
  abilities: Array<{
    id: string;
    name: string;
    description: string;
  }>;
  sourceData: any; // Original selection data for re-parsing
  armyId: string;
}

// Updated Model interface to match new schema
export interface ModelData {
  id: string;
  name: string;
  unitId: string;
  M: number; // movement in inches
  T: number; // toughness
  SV: number; // save value
  W: number; // wounds
  LD: number; // leadership
  OC: number; // objective control
  woundsTaken: number; // starts at zero, tracks damage
}

// Updated Weapon interface to match new schema
export interface WeaponData {
  id: string;
  name: string;
  range: number; // range in inches, 0 for melee
  A: string; // attacks (number or dice representation like "d6 + 3")
  WS: number | null; // weapon skill (just the number: 4 represents "4+", null for N/A)
  S: number; // strength
  AP: number; // armour penetration
  D: string; // damage (number or dice)
  keywords: string[]; // array of keywords like ["melta-2", "assault"]
  turnsFired: number[]; // array of turns when this weapon was fired
  modelId: string;
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
 * Extract basic army metadata from NewRecruit JSON
 */
export function extractArmyMetadata(jsonData: NewRecruitRoster, userId: string): ArmyMetadata {
  const roster = jsonData.roster;
  
  if (!roster) {
    throw new Error('Invalid roster data: missing roster object');
  }

  // Extract basic roster information
  const name = roster.name || 'Unnamed Army';

  // Extract faction and detachment from forces selections
  let faction = '';
  let detachment = '';

  if (roster.forces && roster.forces.length > 0) {
    const force = roster.forces[0];

    if (force.selections) {
      for (const selection of force.selections) {
        // Extract faction from categories - look for "Faction: X" pattern
        if (selection.categories) {
          const factionCategory = selection.categories.find(cat =>
            cat.name && cat.name.startsWith('Faction:')
          );
          if (factionCategory) {
            faction = factionCategory.name.replace('Faction: ', '');
          }
        }

        // Extract detachment - look for selection with name "Detachment" and get the nested selection name
        if (selection.name === 'Detachment' && selection.selections && selection.selections.length > 0) {
          detachment = selection.selections[0].name;
        }
      }
    }
  }

  return {
    id: id(),
    name,
    faction,
    detachment,
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
// Phase 2: Unit Extraction Functions
// ============================================================================

/**
 * Extract units from NewRecruit JSON
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
      // Check if this is a unit (not configuration)
      if (isUnit(selection)) {
        const unitData = parseUnit(selection, armyId, userId);
        units.push(unitData);
      }
    }
  }

  return units;
}

/**
 * Helper method to determine if a selection is a unit
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
 * Helper method to extract abilities from unit profiles
 */
function extractAbilitiesFromUnit(selection: any): Array<{
  id: string;
  name: string;
  description: string;
}> {
  const abilities: Array<{
    id: string;
    name: string;
    description: string;
  }> = [];

  // Look for abilities in profiles
  if (selection.profiles) {
    for (const profile of selection.profiles) {
      if (profile.typeName === 'Abilities') {
        const description = profile.characteristics?.find((char: any) => char.name === 'Description')?.$text || '';
        
        abilities.push({
          id: profile.id,
          name: profile.name,
          description
        });
      }
    }
  }

  return abilities;
}

/**
 * Helper method to parse a unit from selection data
 */
function parseUnit(selection: any, armyId: string, userId: string): UnitData {
  const categories = selection.categories?.map((cat: any) => cat.name) || [];
  
  // Parse rules (simple rules only)
  const rules = selection.rules?.map((rule: any) => ({
    id: rule.id,
    name: rule.name,
    description: rule.description || ''
  })) || [];

  // Parse abilities from profiles
  const abilities = extractAbilitiesFromUnit(selection);

  return {
    id: id(),
    name: selection.name,
    nickname: '', // Initialize as empty string
    categories,
    rules,
    abilities,
    sourceData: selection, // Store original selection for re-parsing
    armyId
  };
}

/**
 * Import an army with units from NewRecruit JSON and store in InstantDB
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
        ownerId: armyMetadata.ownerId,
        sourceData: armyMetadata.sourceData,
        createdAt: armyMetadata.createdAt
      }).link({ owner: armyMetadata.ownerId })
    );
    
    // Add unit transactions
    for (const unit of units) {
      transactions.push(
        db.tx.units[unit.id].update({
          name: unit.name,
          categories: unit.categories,
          rules: unit.rules,
          abilities: unit.abilities,
          armyId: unit.armyId
        }).link({ army: unit.armyId })
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
// Phase 3: Model Processing Functions
// ============================================================================

/**
 * Extract models from a unit
 */
export function extractModels(unit: UnitData): ModelData[] {
  const statlines = getUnitStatlines(unit);
  const models: ModelData[] = [];

  for (const statline of statlines) {
    // Create individual model records for each count
    for (let i = 0; i < statline.count; i++) {
      const model: any = {
        id: id(),
        name: statline.modelName, // This already uses extractModelNameFromSelection in getUnitStatlines
        unitId: unit.id,
        M: statline.M,
        T: statline.T,
        SV: statline.SV,
        W: statline.W,
        LD: statline.LD,
        OC: statline.OC,
        woundsTaken: 0
      };

      // Add invulnerable save if present
      if (statline.INV !== undefined) {
        model.INV = statline.INV;
      }

      models.push(model);
    }
  }

  return models;
}

/**
 * Get unit statlines grouped by model configuration with counts
 */
function getUnitStatlines(unit: UnitData): Array<{
  modelName: string;
  count: number;
  M: number;
  T: number;
  SV: number;
  INV?: number;
  W: number;
  LD: number;
  OC: number;
}> {
  const statlineMap = new Map<string, {
    count: number;
    M: number;
    T: number;
    SV: number;
    INV?: number;
    W: number;
    LD: number;
    OC: number;
  }>();

  // Check unit's own selections for model statlines from source data
  if (unit.sourceData?.selections) {
    extractStatlinesFromSelections(unit.sourceData.selections, statlineMap);
  }

  // If no statlines found in selections, fallback to unit abilities
  if (statlineMap.size === 0 && unit.sourceData?.profiles) {
    // Look for an ability that might represent the unit's profile/statline
    const unitProfileAbility = unit.sourceData.profiles.find((profile: any) => profile.typeName === 'Unit');
    if (unitProfileAbility) {
      const characteristics = unitProfileAbility.characteristics || [];
      const stats = parseCharacteristicsToStats(characteristics);
      
      statlineMap.set(unit.name, {
        count: 1,
        ...stats
      });
    }
  }

  // Convert map to array with counts and sort by count (most common first)
  return Array.from(statlineMap.entries())
    .map(([modelName, data]) => ({
      modelName,
      count: data.count,
      M: data.M,
      T: data.T,
      SV: data.SV,
      INV: data.INV,
      W: data.W,
      LD: data.LD,
      OC: data.OC
    }))
    .sort((a, b) => b.count - a.count); // Sort by count descending (most common first)
}

/**
 * Helper method to extract statlines from selections recursively
 */
function extractStatlinesFromSelections(
  selections: any[],
  statlineMap: Map<string, {
    count: number;
    M: number;
    T: number;
    SV: number;
    INV?: number;
    W: number;
    LD: number;
    OC: number;
  }>
): void {
  for (const selection of selections) {
    // Check if this selection has unit profiles (statlines)
    if (selection.profiles && selection.profiles.length > 0) {
      for (const profile of selection.profiles) {
        if (profile.typeName === 'Unit') {
          // Always use extractModelNameFromSelection for model selections
          let modelName: string;
          if (selection.type === 'model') {
            modelName = extractModelNameFromSelection(selection) || selection.name;
          } else {
            modelName = selection.name !== profile.name ? selection.name : profile.name;
          }

          const modelCount = selection.number || 1;
          const characteristics = profile.characteristics || [];
          const stats = parseCharacteristicsToStats(characteristics);

          // Extract invulnerable save from profiles/abilities if present
          const inv = extractInvulnerableSave(selection.profiles);

          if (statlineMap.has(modelName)) {
            // Add to existing model count
            const existing = statlineMap.get(modelName)!;
            existing.count += modelCount;
          } else {
            // Add new model statline
            statlineMap.set(modelName, {
              count: modelCount,
              ...stats,
              INV: inv
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
          // For now, just record the model name with placeholder stats
          statlineMap.set(modelName, {
            count: modelCount,
            M: 6,
            T: 4,
            SV: 3,
            W: 1,
            LD: 6,
            OC: 1
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
 * Helper method to extract a comprehensive model configuration name from a selection
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
 * Helper method to parse characteristics into stats
 */
function parseCharacteristicsToStats(characteristics: any[]): {
  M: number;
  T: number;
  SV: number;
  W: number;
  LD: number;
  OC: number;
} {
  const stats = {
    M: 6,
    T: 4,
    SV: 3,
    W: 1,
    LD: 6,
    OC: 1
  };

  for (const char of characteristics) {
    const value = char.$text || char.value || '';
    const numValue = parseInt(value.replace(/[^\d]/g, ''), 10);
    
    switch (char.name) {
      case 'M':
        stats.M = numValue || 6;
        break;
      case 'T':
        stats.T = numValue || 4;
        break;
      case 'Sv':
        stats.SV = numValue || 3;
        break;
      case 'W':
        stats.W = numValue || 1;
        break;
      case 'Ld':
        stats.LD = numValue || 6;
        break;
      case 'OC':
        stats.OC = numValue || 1;
        break;
    }
  }

  return stats;
}

/**
 * Extract invulnerable save value from model profiles/abilities
 * Looks for abilities with names like "Invulnerable Save (5+)"
 * or descriptions containing invulnerable save information
 */
function extractInvulnerableSave(profiles: any[]): number | undefined {
  if (!profiles || profiles.length === 0) return undefined;

  for (const profile of profiles) {
    // Check if this is an Abilities profile type
    if (profile.typeName === 'Abilities') {
      // Look for "Invulnerable Save" in the ability name
      const nameMatch = profile.name?.match(/Invulnerable Save \((\d+)\+\)/i);
      if (nameMatch) {
        return parseInt(nameMatch[1], 10);
      }

      // Also check the description for invulnerable save mentions
      if (profile.characteristics) {
        for (const char of profile.characteristics) {
          if (char.name === 'Description') {
            const desc = char.$text || '';
            // Match patterns like "has a 5+ invulnerable save" or "have a 5+ invulnerable save"
            const descMatch = desc.match(/(?:has|have) a (\d+)\+ invulnerable save/i);
            if (descMatch) {
              return parseInt(descMatch[1], 10);
            }
          }
        }
      }
    }
  }

  return undefined;
}

/**
 * Import an army with units and models from NewRecruit JSON and store in InstantDB
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
        ownerId: armyMetadata.ownerId,
        sourceData: armyMetadata.sourceData,
        createdAt: armyMetadata.createdAt
      }).link({ owner: armyMetadata.ownerId })
    );
    
    // Add unit transactions
    for (const unit of units) {
      transactions.push(
        db.tx.units[unit.id].update({
          name: unit.name,
          categories: unit.categories,
          rules: unit.rules,
          armyId: unit.armyId
        }).link({ army: unit.armyId })
      );
    }
    
    // Add model transactions
    for (const model of allModels) {
      transactions.push(
        db.tx.models[model.id].update({
          name: model.name,
          unitId: model.unitId,
          M: model.M,
          T: model.T,
          SV: model.SV,
          W: model.W,
          LD: model.LD,
          OC: model.OC,
          woundsTaken: model.woundsTaken
        }).link({ unit: model.unitId })
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
// Phase 4: Weapon Processing Functions
// ============================================================================

/**
 * Extract weapons from a unit for all models
 */
export function extractWeapons(unit: UnitData, models: ModelData[]): WeaponData[] {
  const allWeapons: WeaponData[] = [];
  
  // For each model, find and create its weapons
  for (const model of models) {
    const modelWeapons = extractWeaponsForModel(unit, model);
    allWeapons.push(...modelWeapons);
  }
  
  return allWeapons;
}

/**
 * Extract weapons for a specific model by finding the model's selection in the unit data
 */
function extractWeaponsForModel(unit: UnitData, model: ModelData): WeaponData[] {
  const weapons: WeaponData[] = [];

  if (!unit.sourceData?.selections) {
    return weapons;
  }

  // Find the most specific model selection for this model
  const modelSelection = findModelSelectionForModel(unit.sourceData.selections, model);
  if (modelSelection) {
    // Only extract weapons from this model's own selections
    const rangedWeapons = extractWeaponsFromModelSelection(modelSelection, model, unit, 'Ranged Weapons');
    const meleeWeapons = extractWeaponsFromModelSelection(modelSelection, model, unit, 'Melee Weapons');
    weapons.push(...rangedWeapons, ...meleeWeapons);
  }

  // Fallback: If no weapons found, try extracting directly from unit selections (for units like Psychophage)
  if (weapons.length === 0) {
    const directWeapons = extractWeaponsFromUnitSelections(unit.sourceData.selections, model, unit);
    weapons.push(...directWeapons);
  }

  return weapons;
}

/**
 * Extract weapons directly from unit selections (for units like Psychophage)
 */
function extractWeaponsFromUnitSelections(selections: any[], model: ModelData, unit: UnitData): WeaponData[] {
  const weapons: WeaponData[] = [];
  
  for (const selection of selections) {
    // Check if this is a weapon upgrade
    if (selection.type === 'upgrade' && selection.profiles) {
      for (const profile of selection.profiles) {
        if (profile.typeName === 'Ranged Weapons' || profile.typeName === 'Melee Weapons') {
          const weaponStats = parseWeaponCharacteristics(profile.characteristics || []);
          
          weapons.push({
            id: id(),
            name: profile.name,
            range: weaponStats.range,
            A: weaponStats.A,
            WS: weaponStats.WS,
            S: weaponStats.S,
            AP: weaponStats.AP,
            D: weaponStats.D,
            keywords: weaponStats.keywords,
            turnsFired: [],
            modelId: model.id
          });
        }
      }
    }
    
    // Recursively search nested selections
    if (selection.selections) {
      const nestedWeapons = extractWeaponsFromUnitSelections(selection.selections, model, unit);
      weapons.push(...nestedWeapons);
    }
  }
  
  return weapons;
}

/**
 * Find the model selection that corresponds to a specific model
 */
function findModelSelectionForModel(selections: any[], model: ModelData): any | null {
  for (const selection of selections) {
    // Check if this is a model selection
    const isModelSelection = selection.type === 'model' || 
      (selection.profiles && selection.profiles.some((p: any) => p.typeName === 'Unit'));

    if (isModelSelection) {
      // Use strict matching: require exact model name (with config) match
      const selectionModelName = extractModelNameFromSelection(selection) || selection.name;
      if (model.name === selectionModelName) {
        return selection;
      }
    }

    // Recursively search nested selections
    if (selection.selections) {
      const found = findModelSelectionForModel(selection.selections, model);
      if (found) return found;
    }
  }

  return null;
}

/**
 * Extract weapons from a specific model selection
 */
function extractWeaponsFromModelSelection(
  modelSelection: any, 
  model: ModelData, 
  unit: UnitData, 
  weaponType: string
): WeaponData[] {
  const weapons: WeaponData[] = [];
  
  // Look for weapon profiles in this model selection and its children
  const findWeaponsRecursively = (selections: any[]) => {
    for (const selection of selections) {
      // Check if this selection has weapon profiles
      if (selection.profiles) {
        for (const profile of selection.profiles) {
          if (profile.typeName === weaponType) {
            // Only add if not already present (by name and type)
            if (!weapons.some(w => w.name === profile.name && w.range === parseWeaponCharacteristics(profile.characteristics || []).range)) {
              const weaponStats = parseWeaponCharacteristics(profile.characteristics || []);
              weapons.push({
                id: id(),
                name: profile.name,
                range: weaponStats.range,
                A: weaponStats.A,
                WS: weaponStats.WS,
                S: weaponStats.S,
                AP: weaponStats.AP,
                D: weaponStats.D,
                keywords: weaponStats.keywords,
                turnsFired: [],
                modelId: model.id
              });
            }
          }
        }
      }
      // Also check if this selection is a weapon upgrade (type: "upgrade")
      // and has weapon profiles in its own profiles
      if (selection.type === 'upgrade' && selection.profiles) {
        for (const profile of selection.profiles) {
          if (profile.typeName === weaponType) {
            // Only add if not already present (by name and type)
            if (!weapons.some(w => w.name === profile.name && w.range === parseWeaponCharacteristics(profile.characteristics || []).range)) {
              const weaponStats = parseWeaponCharacteristics(profile.characteristics || []);
              weapons.push({
                id: id(),
                name: profile.name,
                range: weaponStats.range,
                A: weaponStats.A,
                WS: weaponStats.WS,
                S: weaponStats.S,
                AP: weaponStats.AP,
                D: weaponStats.D,
                keywords: weaponStats.keywords,
                turnsFired: [],
                modelId: model.id
              });
            }
          }
        }
        // Do NOT recurse into upgrade selections, to avoid double-adding
        continue;
      }
      // Recursively search nested selections (only if not an upgrade)
      if (selection.selections) {
        findWeaponsRecursively(selection.selections);
      }
    }
  };
  
  // Start the recursive search from the model selection's selections
  if (modelSelection.selections) {
    findWeaponsRecursively(modelSelection.selections);
  }
  
  return weapons;
}

/**
 * Helper method to parse weapon characteristics into stats
 */
function parseWeaponCharacteristics(characteristics: any[]): {
  range: number;
  A: string;
  WS: number | null;
  S: number;
  AP: number;
  D: string;
  keywords: string[];
} {
  const stats: {
    range: number;
    A: string;
    WS: number | null;
    S: number;
    AP: number;
    D: string;
    keywords: string[];
  } = {
    range: 0,
    A: '1',
    WS: null,
    S: 4,
    AP: 0,
    D: '1',
    keywords: []
  };

  for (const char of characteristics) {
    const value = char.$text || char.value || '';
    
    switch (char.name) {
      case 'Range':
        // Handle "Melee" as 0 range, otherwise extract number
        if (value.toLowerCase() === 'melee') {
          stats.range = 0;
        } else {
          stats.range = parseInt(value.replace(/[^\d]/g, ''), 10) || 0;
        }
        break;
      case 'A':
        stats.A = value;
        break;
      case 'BS':
      case 'WS':
        // Handle "N/A" and empty values - don't default to 4
        if (value === 'N/A' || value === '' || value.toLowerCase() === 'n/a') {
          stats.WS = null;
        } else {
          stats.WS = parseInt(value.replace(/[^\d]/g, ''), 10) || null;
        }
        break;
      case 'S':
        stats.S = parseInt(value.replace(/[^\d]/g, ''), 10) || 4;
        break;
      case 'AP':
        // Handle negative AP values (like "-1", "-2")
        if (value.startsWith('-')) {
          stats.AP = parseInt(value, 10) || 0;
        } else {
          stats.AP = parseInt(value.replace(/[^\d]/g, ''), 10) || 0;
        }
        break;
      case 'D':
        stats.D = value;
        break;
      case 'Keywords':
        // Split keywords by comma and trim whitespace
        if (value) {
          const keywordList = value.split(',').map((k: string) => k.trim());
          stats.keywords.push(...keywordList);
        }
        break;
      default:
        // Check for keywords
        if (value && !['Range', 'A', 'BS', 'WS', 'S', 'AP', 'D', 'Keywords'].includes(char.name)) {
          stats.keywords.push(char.name);
        }
        break;
    }
  }

  return stats;
}

/**
 * Import a complete army from NewRecruit JSON and store in InstantDB
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
    // Helper function to batch arrays into chunks
    const chunkArray = <T>(array: T[], size: number): T[][] => {
      const chunks: T[][] = [];
      for (let i = 0; i < array.length; i += size) {
        chunks.push(array.slice(i, i + size));
      }
      return chunks;
    };

    // Step 1: Create army first
    await db.transact([
      db.tx.armies[armyMetadata.id].update({
        name: armyMetadata.name,
        faction: armyMetadata.faction,
        detachment: armyMetadata.detachment,
        ownerId: armyMetadata.ownerId,
        sourceData: armyMetadata.sourceData,
        createdAt: armyMetadata.createdAt
      }).link({ owner: armyMetadata.ownerId })
    ]);

    // Step 2: Batch units into chunks of 10
    const unitChunks = chunkArray(units, 10);
    for (const unitChunk of unitChunks) {
      const unitTransactions = unitChunk.map(unit =>
        db.tx.units[unit.id].update({
          name: unit.name,
          categories: unit.categories,
          rules: unit.rules,
          abilities: unit.abilities,
          armyId: unit.armyId
        }).link({ army: unit.armyId })
      );
      await db.transact(unitTransactions);
    }

    // Step 3: Batch models into chunks of 20
    const modelChunks = chunkArray(allModels, 20);
    for (const modelChunk of modelChunks) {
      const modelTransactions = modelChunk.map(model =>
        db.tx.models[model.id].update({
          name: model.name,
          unitId: model.unitId,
          M: model.M,
          T: model.T,
          SV: model.SV,
          W: model.W,
          LD: model.LD,
          OC: model.OC,
          woundsTaken: model.woundsTaken
        }).link({ unit: model.unitId })
      );
      await db.transact(modelTransactions);
    }

    // Step 4: Batch weapons into chunks of 30
    const weaponChunks = chunkArray(allWeapons, 30);
    for (const weaponChunk of weaponChunks) {
      const weaponTransactions = weaponChunk.map(weapon =>
        db.tx.weapons[weapon.id].update({
          name: weapon.name,
          range: weapon.range,
          A: weapon.A,
          WS: weapon.WS ?? undefined,
          S: weapon.S,
          AP: weapon.AP,
          D: weapon.D,
          keywords: weapon.keywords,
          turnsFired: weapon.turnsFired,
          modelId: weapon.modelId
        }).link({ model: weapon.modelId })
      );
      await db.transact(weaponTransactions);
    }
    
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
 */
export async function importArmyForGame(jsonData: NewRecruitRoster, userId: string, gameId: string): Promise<{ 
  armyId: string; 
  unitIds: string[]; 
  modelIds: string[]; 
  weaponIds: string[] 
}> {
  // Extract army metadata for game context
  const armyMetadata = extractArmyMetadata(jsonData, userId);
  
  // Generate new IDs for game-specific copies
  const gameArmyId = id();
  
  // Extract units, models, and weapons
  const units = extractUnits(jsonData, gameArmyId, userId);
  const allModels: ModelData[] = [];
  for (const unit of units) {
    const unitModels = extractModels(unit);
    allModels.push(...unitModels);
  }
  
  const allWeapons: WeaponData[] = [];
  for (const unit of units) {
    const unitModels = allModels.filter(model => model.unitId === unit.id);
    const unitWeapons = extractWeapons(unit, unitModels);
    allWeapons.push(...unitWeapons);
  }
  
  try {
    // Helper function to batch arrays into chunks
    const chunkArray = <T>(array: T[], size: number): T[][] => {
      const chunks: T[][] = [];
      for (let i = 0; i < array.length; i += size) {
        chunks.push(array.slice(i, i + size));
      }
      return chunks;
    };

    // Step 1: Create army first
    await db.transact([
      db.tx.armies[gameArmyId].update({
        name: armyMetadata.name,
        faction: armyMetadata.faction,
        detachment: armyMetadata.detachment,
        ownerId: userId,
        sourceData: armyMetadata.sourceData,
        createdAt: armyMetadata.createdAt,
        gameId: gameId
      }).link({ owner: userId, game: gameId })
    ]);

    // Step 2: Batch units into chunks of 10
    const unitChunks = chunkArray(units, 10);
    for (const unitChunk of unitChunks) {
      const unitTransactions = unitChunk.map(unit =>
        db.tx.units[unit.id].update({
          name: unit.name,
          categories: unit.categories,
          rules: unit.rules,
          abilities: unit.abilities,
          armyId: unit.armyId
        }).link({ army: unit.armyId })
      );
      await db.transact(unitTransactions);
    }

    // Step 3: Batch models into chunks of 20
    const modelChunks = chunkArray(allModels, 20);
    for (const modelChunk of modelChunks) {
      const modelTransactions = modelChunk.map(model =>
        db.tx.models[model.id].update({
          name: model.name,
          unitId: model.unitId,
          M: model.M,
          T: model.T,
          SV: model.SV,
          W: model.W,
          LD: model.LD,
          OC: model.OC,
          woundsTaken: model.woundsTaken
        }).link({ unit: model.unitId })
      );
      await db.transact(modelTransactions);
    }

    // Step 4: Batch weapons into chunks of 30
    const weaponChunks = chunkArray(allWeapons, 30);
    for (const weaponChunk of weaponChunks) {
      const weaponTransactions = weaponChunk.map(weapon =>
        db.tx.weapons[weapon.id].update({
          name: weapon.name,
          range: weapon.range,
          A: weapon.A,
          WS: weapon.WS ?? undefined,
          S: weapon.S,
          AP: weapon.AP,
          D: weapon.D,
          keywords: weapon.keywords,
          turnsFired: weapon.turnsFired,
          modelId: weapon.modelId
        }).link({ model: weapon.modelId })
      );
      await db.transact(weaponTransactions);
    }
    
    return {
      armyId: gameArmyId,
      unitIds: units.map(u => u.id),
      modelIds: allModels.map(m => m.id),
      weaponIds: allWeapons.map(w => w.id)
    };
  } catch (error) {
    console.error('Failed to import army for game:', error);
    throw new Error(`Game army import failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
} 

/**
 * Duplicate an existing army for a game using the proper query structure
 * This function expects the army data to be passed in from the React component
 */
export async function duplicateArmyForGame(armyData: any, gameId: string): Promise<{ 
  armyId: string; 
  unitIds: string[]; 
  modelIds: string[]; 
  weaponIds: string[] 
}> {
  try {
    if (!armyData) {
      throw new Error('Army data not provided');
    }
    console.log("Duplicating army for game", gameId);

    // Generate new IDs for game-specific copies
    const gameArmyId = id();
    const newUnitIds: string[] = [];
    const newModelIds: string[] = [];
    const newWeaponIds: string[] = [];

    const transactions = [];

    // Helper function to create a copy of an object with specific overrides
    const createCopy = (original: any, overrides: any = {}) => {
      const copy = { ...original, ...overrides };
      // Remove ID fields to let InstantDB generate new ones
      delete copy.id;
      return copy;
    };

    // Create the game army
    const armyCopy = createCopy(armyData, {
      createdAt: Date.now(),
      gameId: gameId
    });

    delete armyCopy.units;

    // Helper function to batch arrays into chunks
    const chunkArray = <T>(array: T[], size: number): T[][] => {
      const chunks: T[][] = [];
      for (let i = 0; i < array.length; i += size) {
        chunks.push(array.slice(i, i + size));
      }
      return chunks;
    };

    // Step 1: Create army first
    await db.transact([
      db.tx.armies[gameArmyId].update(armyCopy).link({
        owner: armyData.ownerId,
        game: gameId
      })
    ]);

    // Prepare all units, models, and weapons
    const unitTransactions = [];
    const modelTransactions = [];
    const weaponTransactions = [];

    // Duplicate units
    for (const unit of armyData.units || []) {
      const newUnitId = id();
      newUnitIds.push(newUnitId);

      const unitCopy = createCopy(unit, {
        armyId: gameArmyId
      });

      delete unitCopy.armyId;
      delete unitCopy.models;
      unitTransactions.push(
        db.tx.units[newUnitId].update(unitCopy).link({ army: gameArmyId })
      );

      // Duplicate models for this unit
      for (const model of unit.models || []) {
        const newModelId = id();
        newModelIds.push(newModelId);

        const modelCopy = createCopy(model, {
          unitId: newUnitId,
          woundsTaken: 0 // Reset for game
        });
        delete modelCopy.unitId;
        delete modelCopy.weapons;
        modelTransactions.push(
          db.tx.models[newModelId].update(modelCopy).link({ unit: newUnitId })
        );

        // Duplicate weapons for this model
        for (const weapon of model.weapons || []) {
          const newWeaponId = id();
          newWeaponIds.push(newWeaponId);

          const weaponCopy = createCopy(weapon, {
            modelId: newModelId,
            turnsFired: [] // Reset for game
          });
          delete weaponCopy.model;
          weaponTransactions.push(
            db.tx.weapons[newWeaponId].update(weaponCopy).link({ model: newModelId })
          );
        }
      }
    }

    // Step 2: Batch units into chunks of 10
    const unitChunks = chunkArray(unitTransactions, 10);
    for (const unitChunk of unitChunks) {
      await db.transact(unitChunk);
    }

    // Step 3: Batch models into chunks of 20
    const modelChunks = chunkArray(modelTransactions, 20);
    for (const modelChunk of modelChunks) {
      await db.transact(modelChunk);
    }

    // Step 4: Batch weapons into chunks of 30
    const weaponChunks = chunkArray(weaponTransactions, 30);
    for (const weaponChunk of weaponChunks) {
      await db.transact(weaponChunk);
    }

    return {
      armyId: gameArmyId,
      unitIds: newUnitIds,
      modelIds: newModelIds,
      weaponIds: newWeaponIds
    };
  } catch (error) {
    console.error('Failed to duplicate army for game:', error);
    throw new Error(`Game army duplication failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
} 