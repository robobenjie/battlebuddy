/**
 * Shared utilities for unit data transformation and manipulation
 */

// Helper function to get models for a specific unit (now models are nested in unit)
export const getModelsForUnit = (unit: any) => {
  return unit.models || [];
};

// Helper function to get weapons for models in a unit (now weapons are nested in models)
export const getWeaponsForUnit = (unit: any) => {
  const unitModels = getModelsForUnit(unit);
  return unitModels.flatMap((model: any) => model.weapons || []);
};

// Alternative version that works with weapons that have unitId directly
export const getWeaponsForUnitDirect = (weapons: any[], unitId: string) => {
  return weapons.filter(weapon => weapon.unitId === unitId);
};

// Helper function to determine unit movement value
export const getUnitMovement = (unit: any) => {
  const unitModels = getModelsForUnit(unit);
  if (unitModels.length === 0) return null;

  const movements = unitModels.map((model: any) => {
    // Handle both old and new data structures
    const stats = model.baseStats || model;
    return stats.M || stats.Movement || stats.Move || '-';
  });

  const uniqueMovements = Array.from(new Set(movements)).filter(m => m !== '-' && m !== undefined);
  if (uniqueMovements.length === 0) return null;
  return uniqueMovements.length === 1 ? uniqueMovements[0] : null;
};

// Helper function to calculate modified movement based on active rules
export const getModifiedMovement = (unit: any, armyStates?: any[]) => {
  const baseMovement = getUnitMovement(unit);
  if (!baseMovement || baseMovement === '-') return baseMovement;

  let modifier = 0;
  const activeModifiers: { name: string; value: number }[] = [];

  // Check unit rules for movement modifiers
  if (unit.unitRules && Array.isArray(unit.unitRules)) {
    for (const rule of unit.unitRules) {
      if (!rule?.ruleObject) continue;

      try {
        const parsedRules = JSON.parse(rule.ruleObject);
        const ruleArray = Array.isArray(parsedRules) ? parsedRules : [parsedRules];

        for (const parsedRule of ruleArray) {
          // Check if this rule has stat modifiers
          if (!parsedRule.effects || !Array.isArray(parsedRule.effects)) continue;

          // Check conditions
          let conditionsMet = true;
          if (parsedRule.conditions && Array.isArray(parsedRule.conditions)) {
            for (const condition of parsedRule.conditions) {
              if (condition.type === 'army-state') {
                // Check if the required army state is active
                const hasState = armyStates?.some((state: any) => state.state === condition.state);
                if (!hasState) {
                  conditionsMet = false;
                  break;
                }
              }
            }
          }

          if (!conditionsMet) continue;

          // Apply movement modifiers
          for (const effect of parsedRule.effects) {
            if (effect.type === 'stat-modifier' && effect.stat === 'movement') {
              const modValue = parseInt(effect.modifier);
              if (!isNaN(modValue)) {
                modifier += modValue;
                activeModifiers.push({ name: parsedRule.name, value: modValue });
              }
            }
          }
        }
      } catch (e) {
        console.error('Failed to parse unit rule for movement modifiers:', rule.name, e);
      }
    }
  }

  // Check model rules for movement modifiers
  if (unit.models && Array.isArray(unit.models)) {
    for (const model of unit.models) {
      if (!model.modelRules || !Array.isArray(model.modelRules)) continue;

      for (const rule of model.modelRules) {
        if (!rule?.ruleObject) continue;

        try {
          const parsedRules = JSON.parse(rule.ruleObject);
          const ruleArray = Array.isArray(parsedRules) ? parsedRules : [parsedRules];

          for (const parsedRule of ruleArray) {
            // Check if this rule has stat modifiers
            if (!parsedRule.effects || !Array.isArray(parsedRule.effects)) continue;

            // Check conditions
            let conditionsMet = true;
            if (parsedRule.conditions && Array.isArray(parsedRule.conditions)) {
              for (const condition of parsedRule.conditions) {
                if (condition.type === 'army-state') {
                  // Check if the required army state is active
                  const hasState = armyStates?.some((state: any) => state.state === condition.state);
                  if (!hasState) {
                    conditionsMet = false;
                    break;
                  }
                }
              }
            }

            if (!conditionsMet) continue;

            // Apply movement modifiers
            for (const effect of parsedRule.effects) {
              if (effect.type === 'stat-modifier' && effect.stat === 'movement') {
                const modValue = parseInt(effect.modifier);
                if (!isNaN(modValue)) {
                  modifier += modValue;
                  activeModifiers.push({ name: parsedRule.name, value: modValue });
                }
              }
            }
          }
        } catch (e) {
          console.error('Failed to parse model rule for movement modifiers:', rule.name, e);
        }
      }
    }
  }

  if (modifier === 0) return baseMovement;

  const baseValue = parseInt(baseMovement);
  if (isNaN(baseValue)) return baseMovement;

  const modifiedValue = baseValue + modifier;
  return modifiedValue > 0 ? modifiedValue.toString() : baseMovement;
};

// Helper function to format unit data for ArmyDetailPage (updated for new structure)
export const formatUnitForCard = (unit: any) => {
  const unitModels = getModelsForUnit(unit);
  const unitWeapons = getWeaponsForUnit(unit);
  
  return {
    unit: unit,
    models: unitModels,
    weapons: unitWeapons,
  };
};

// Helper function to calculate army statistics
export const calculateArmyStats = (units: any[]) => {
  // For ArmyDetailPage, models don't have a count property - each model represents 1 model
  // For game phases, models might have count property
  const totalModels = units.reduce((sum, unit) => {
    const unitModels = getModelsForUnit(unit);
    return sum + unitModels.reduce((unitSum: number, model: any) => {
      if (typeof model.count === 'number') {
        return unitSum + model.count;
      }
      return unitSum + 1; // Each model record represents 1 model
    }, 0);
  }, 0);
  
  const totalWeapons = units.reduce((sum, unit) => {
    const unitWeapons = getWeaponsForUnit(unit);
    return sum + unitWeapons.length;
  }, 0);
  
  const totalUnits = units.length;
  
  return {
    totalUnits,
    totalModels,
    totalWeapons
  };
};

// Helper function to get all categories/keywords from units
export const getAllCategories = (units: any[]) => {
  return units.flatMap(unit => unit.categories || unit.keywords || []);
};

// Helper function to check if a unit has any unfired weapons
export const hasUnfiredWeapons = (unit: any) => {
  const unitWeapons = getWeaponsForUnit(unit);
  return unitWeapons.some((w: any) => !w.hasShot);
};

// Helper function to get weapons for a unit
export const getUnitWeapons = (unit: any) => {
  return getWeaponsForUnit(unit);
};

// Helper function to get total weapon count for a unit (each weapon row represents one weapon type)
export const getUnitWeaponCount = (unit: any) => {
  const unitWeapons = getUnitWeapons(unit);
  return unitWeapons.length;
};

// Helper function to get firing status for a unit
export const getUnitFiringStatus = (unit: any) => {
  const unitWeapons = getUnitWeapons(unit);
  const firedWeapons = unitWeapons.filter((w: any) => w.hasShot);
  
  return {
    totalWeapons: unitWeapons.length,
    firedWeapons: firedWeapons.length,
    unfiredWeapons: unitWeapons.length - firedWeapons.length,
    hasUnfired: firedWeapons.length < unitWeapons.length,
    allFired: firedWeapons.length === unitWeapons.length
  };
};

// Helper function to calculate weapon count for a specific weapon type
export const getWeaponCount = (weapon: any, unit: any) => {
  // Get all weapons for this unit
  const unitWeapons = getUnitWeapons(unit);
  // Count how many weapon rows exist for this weapon type in this unit
  const weaponsWithSameName = unitWeapons.filter((w: any) => w.name === weapon.name);
  
  console.log('🔍 getWeaponCount debug:', {
    weaponName: weapon.name,
    unitId: unit.id,
    totalWeapons: unitWeapons.length,
    weaponsWithSameNameCount: weaponsWithSameName.length,
  });
  
  return weaponsWithSameName.length;
};

// Category priority order for sorting
export const UNIT_CATEGORY_ORDER = [
  'Epic Heroes',
  'Character',
  'Battleline',
  'Infantry',
  'Mounted',
  'Monster',
  'Vehicle',
  'Dedicated Transport'
];

// Get primary category for sorting (first matching category from priority list)
export const getPrimaryCategory = (unit: any): string => {
  const categories = unit.categories || [];
  for (const priorityCategory of UNIT_CATEGORY_ORDER) {
    if (categories.some((cat: string) => cat.toLowerCase() === priorityCategory.toLowerCase())) {
      return priorityCategory;
    }
  }
  return 'Other';
};

/**
 * Sort units by:
 * 1. Destroyed status (undestroyed first)
 * 2. Category priority (Epic Heroes, Character, Battleline, Infantry, Mounted, Monster, Vehicle, Dedicated Transport, others)
 * 3. Alphabetically by name
 *
 * @param units - Array of units to sort
 * @param destroyedUnitIds - Set of unit IDs that are destroyed (optional)
 * @returns Sorted array of units
 */
export const sortUnitsByPriority = (units: any[], destroyedUnitIds?: Set<string>): any[] => {
  return [...units].sort((a, b) => {
    // First, sort by destroyed status (undestroyed first) if destroyedUnitIds is provided
    if (destroyedUnitIds) {
      const aDestroyed = destroyedUnitIds.has(a.id) ? 1 : 0;
      const bDestroyed = destroyedUnitIds.has(b.id) ? 1 : 0;
      if (aDestroyed !== bDestroyed) return aDestroyed - bDestroyed;
    }

    // Then by category priority
    const aCategoryIndex = UNIT_CATEGORY_ORDER.indexOf(getPrimaryCategory(a));
    const bCategoryIndex = UNIT_CATEGORY_ORDER.indexOf(getPrimaryCategory(b));
    const aIndex = aCategoryIndex === -1 ? UNIT_CATEGORY_ORDER.length : aCategoryIndex;
    const bIndex = bCategoryIndex === -1 ? UNIT_CATEGORY_ORDER.length : bCategoryIndex;

    if (aIndex !== bIndex) return aIndex - bIndex;

    // Finally, alphabetically by name
    return a.name.localeCompare(b.name);
  });
}; 