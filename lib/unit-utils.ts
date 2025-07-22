/**
 * Shared utilities for unit data transformation and manipulation
 */

// Helper function to get models for a specific unit
export const getModelsForUnit = (models: any[], unitId: string) => {
  return models.filter(model => model.unitId === unitId);
};

// Helper function to get weapons for models in a unit
export const getWeaponsForUnit = (weapons: any[], models: any[], unitId: string) => {
  const unitModels = getModelsForUnit(models, unitId);
  const modelIds = unitModels.map(model => model.id);
  return weapons.filter(weapon => modelIds.includes(weapon.modelId));
};

// Alternative version that works with weapons that have unitId directly
export const getWeaponsForUnitDirect = (weapons: any[], unitId: string) => {
  return weapons.filter(weapon => weapon.unitId === unitId);
};

// Helper function to determine unit movement value
export const getUnitMovement = (models: any[], unitId: string) => {
  const unitModels = getModelsForUnit(models, unitId);
  if (unitModels.length === 0) return null;

  const movements = unitModels.map(model => {
    const stats = model.baseStats || {};
    return stats.M || stats.Movement || stats.Move || '-';
  });

  const uniqueMovements = [...new Set(movements)].filter(m => m !== '-' && m !== undefined);
  if (uniqueMovements.length === 0) return null;
  return uniqueMovements.length === 1 ? uniqueMovements[0] : null;
};


// Helper function to format unit data for ArmyDetailPage (preserves original structure)
export const formatUnitForCard = (unit: any, models: any[], weapons: any[]) => {
  const unitModels = getModelsForUnit(models, unit.id);
  // Weapons are now linked to models via modelId
  const unitWeapons = getWeaponsForUnit(weapons, models, unit.id);
  
  return {
    unit: unit,
    models: unitModels,
    weapons: unitWeapons,
  };
};

// Helper function to calculate army statistics
export const calculateArmyStats = (units: any[], models: any[], weapons: any[]) => {
  // For ArmyDetailPage, models don't have a count property - each model represents 1 model
  // For game phases, models might have count property
  const totalModels = models.reduce((sum, model) => {
    if (typeof model.count === 'number') {
      return sum + model.count;
    }
    return sum + 1; // Each model record represents 1 model
  }, 0);
  
  const totalWeapons = weapons.length;
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
export const hasUnfiredWeapons = (weapons: any[], models: any[], unitId: string) => {
  const unitModels = getModelsForUnit(models, unitId);
  const modelIds = unitModels.map(model => model.id);
  const unitWeapons = weapons.filter(w => modelIds.includes(w.modelId));
  return unitWeapons.some(w => !w.hasShot);
};

// Helper function to get weapons for a unit
export const getUnitWeapons = (weapons: any[], models: any[], unitId: string) => {
  const unitModels = getModelsForUnit(models, unitId);
  const modelIds = unitModels.map(model => model.id);
  return weapons.filter(w => modelIds.includes(w.modelId));
};

// Helper function to get total weapon count for a unit (each weapon row represents one weapon type)
export const getUnitWeaponCount = (weapons: any[], models: any[], unitId: string) => {
  const unitWeapons = getUnitWeapons(weapons, models, unitId);
  return unitWeapons.length;
};

// Helper function to get firing status for a unit
export const getUnitFiringStatus = (weapons: any[], models: any[], unitId: string) => {
  const unitWeapons = getUnitWeapons(weapons, models, unitId);
  const firedWeapons = unitWeapons.filter(w => w.hasShot);
  
  return {
    totalWeapons: unitWeapons.length,
    firedWeapons: firedWeapons.length,
    unfiredWeapons: unitWeapons.length - firedWeapons.length,
    hasUnfired: firedWeapons.length < unitWeapons.length,
    allFired: firedWeapons.length === unitWeapons.length
  };
};

// Helper function to calculate weapon count for a specific weapon type
export const getWeaponCount = (weapon: any, models: any[], weapons: any[], unitId: string) => {
  // Get all models for this unit
  const unitModels = getModelsForUnit(models, unitId);
  // Count how many weapon rows exist for this weapon type in this unit
  const weaponsWithSameName = getUnitWeapons(weapons, models, unitId).filter(w => w.name === weapon.name);
  
  console.log('🔍 getWeaponCount debug:', {
    weaponName: weapon.name,
    weaponModelId: weapon.modelId,
    unitId,
    totalModels: models.length,
    unitModelsCount: unitModels.length,
    weaponsWithSameNameCount: weaponsWithSameName.length,
    unitModelIds: unitModels.map(m => m.id)
  });
  
  return weaponsWithSameName.length;
}; 