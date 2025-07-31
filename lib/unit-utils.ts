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