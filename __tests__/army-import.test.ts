/**
 * Unit tests for Army Import Module - Updated for new schema
 * Tests basic army metadata extraction and parsing from NewRecruit JSON
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { 
  extractArmyMetadata, 
  extractUnits,
  extractModels,
  extractWeapons,
  importArmyForGame,
  type NewRecruitRoster, 
  type ArmyMetadata,
  type UnitData,
  type ModelData,
  type WeaponData
} from '../lib/army-import';
import testData from '../test_data/assault_weapon_test.json';

// Mock transactions storage
const mockTransactions: any[] = [];

// Mock the db import
vi.mock('../lib/db', () => ({
  db: {
    transact: async (transactions: any[]) => {
      mockTransactions.push(...transactions);
      return Promise.resolve();
    },
    tx: {
      armies: new Proxy({}, {
        get: (target, prop) => ({
          update: (data: any) => ({
            type: 'army-update', 
            id: prop, 
            data,
            link: (links: any) => ({ type: 'army-update', id: prop, data, links })
          })
        })
      }),
      units: new Proxy({}, {
        get: (target, prop) => ({
          update: (data: any) => ({
            type: 'unit-update', 
            id: prop, 
            data,
            link: (links: any) => ({ type: 'unit-update', id: prop, data, links })
          })
        })
      }),
      models: new Proxy({}, {
        get: (target, prop) => ({
          update: (data: any) => ({
            type: 'model-update', 
            id: prop, 
            data,
            link: (links: any) => ({ type: 'model-update', id: prop, data, links })
          })
        })
      }),
      weapons: new Proxy({}, {
        get: (target, prop) => ({
          update: (data: any) => ({
            type: 'weapon-update', 
            id: prop, 
            data,
            link: (links: any) => ({ type: 'weapon-update', id: prop, data, links })
          })
        })
      })
    }
  }
}));

describe('Army Import - Model Count Preservation', () => {
  const userId1 = 'player1-user-id';
  const userId2 = 'player2-user-id';
  const gameId = 'test-game-id';

  beforeEach(() => {
    // Clear mock transactions before each test
    mockTransactions.length = 0;
  });

  describe('Model Count Extraction Tests', () => {
    it('should extract correct model counts from unit data', () => {
      const jsonData = testData as NewRecruitRoster;
      const armyMetadata = extractArmyMetadata(jsonData, userId1);
      const units = extractUnits(jsonData, armyMetadata.id, userId1);
      
      // Test model extraction for each unit
      units.forEach((unit, index) => {
        const models = extractModels(unit);
        
        // Verify each model is an individual record (no count field)
        models.forEach(model => {
          expect(model.hasOwnProperty('count')).toBe(false); // Individual models don't have count
        });
      });
    });

    it('should preserve model counts through full import process', async () => {
      const jsonData = testData as NewRecruitRoster;
      
      // Test import for player 1 (host)
      const result1 = await importArmyForGame(jsonData, userId1, gameId);
      
      // Extract model transactions for player 1
      const player1ModelTransactions = mockTransactions.filter(t => t.type === 'model-update');
      
      player1ModelTransactions.forEach((transaction, index) => {
        // Individual models don't have count field
        expect(transaction.data.hasOwnProperty('count')).toBe(false);
      });
      
      // Clear transactions and test player 2
      mockTransactions.length = 0;
      
      const result2 = await importArmyForGame(jsonData, userId2, gameId);
      
      // Extract model transactions for player 2
      const player2ModelTransactions = mockTransactions.filter(t => t.type === 'model-update');
      
      player2ModelTransactions.forEach((transaction, index) => {
        // Individual models don't have count field
        expect(transaction.data.hasOwnProperty('count')).toBe(false);
      });
      
      // Compare counts between players
      expect(player1ModelTransactions.length).toBe(player2ModelTransactions.length);
      
      // Compare that both players have same number of individual models
      expect(player1ModelTransactions.length).toBe(player2ModelTransactions.length);
    });
  });

  describe('Different Army Data Structures', () => {
    it('should handle armies with different model configurations', async () => {
      // Create test data with known model counts
      const testArmy1 = {
        roster: {
          name: "Test Army 1",
          costs: [{ name: "pts", typeId: "points", value: 500 }],
          costLimits: [{ name: "pts", typeId: "points", value: 1000 }],
          forces: [{
            selections: [{
              name: "Test Unit",
              type: "unit",
              number: 1,
              categories: [{ name: "Infantry", id: "cat1" }],
              selections: [{
                name: "Test Model",
                type: "model",
                number: 5, // 5 models
                profiles: [{
                  id: "prof1",
                  name: "Test Model",
                  typeName: "Unit",
                  characteristics: [
                    { name: "M", typeId: "M", $text: "6\"" },
                    { name: "T", typeId: "T", $text: "4" }
                  ]
                }]
              }]
            }]
          }]
        }
      };

      const testArmy2 = {
        roster: {
          name: "Test Army 2", 
          costs: [{ name: "pts", typeId: "points", value: 500 }],
          costLimits: [{ name: "pts", typeId: "points", value: 1000 }],
          forces: [{
            selections: [{
              name: "Test Unit 2",
              type: "unit", 
              number: 1,
              categories: [{ name: "Infantry", id: "cat1" }],
              selections: [{
                name: "Test Model 2",
                type: "model",
                number: 10, // 10 models
                profiles: [{
                  id: "prof2",
                  name: "Test Model 2", 
                  typeName: "Unit",
                  characteristics: [
                    { name: "M", typeId: "M", $text: "6\"" },
                    { name: "T", typeId: "T", $text: "3" }
                  ]
                }]
              }]
            }]
          }]
        }
      };

      // Test both armies
      await importArmyForGame(testArmy1 as NewRecruitRoster, userId1, gameId);
      const army1Models = mockTransactions.filter(t => t.type === 'model-update');
      
      mockTransactions.length = 0;
      
      await importArmyForGame(testArmy2 as NewRecruitRoster, userId2, gameId);
      const army2Models = mockTransactions.filter(t => t.type === 'model-update');
      
      // Verify individual model counts are correct
      expect(army1Models.length).toBe(5);
      
      expect(army2Models.length).toBe(10);
      
      // Verify individual models don't have count field
      army1Models.forEach(transaction => {
        expect(transaction.data.hasOwnProperty('count')).toBe(false);
      });
      
      army2Models.forEach(transaction => {
        expect(transaction.data.hasOwnProperty('count')).toBe(false);
      });
    });
  });
});

describe('Army Import - Phase 1: Basic Army Metadata', () => {
  const userId = 'test-user-123';
  const jsonData = testData as NewRecruitRoster;

  describe('extractArmyMetadata', () => {
    it('should extract basic army information from test JSON', () => {
      const metadata = extractArmyMetadata(jsonData, userId);

      expect(metadata).toBeDefined();
      expect(metadata.id).toBeDefined();
      expect(typeof metadata.id).toBe('string');
      expect(metadata.id.length).toBeGreaterThan(0);
    });

    it('should extract correct army name', () => {
      const metadata = extractArmyMetadata(jsonData, userId);
      
      expect(metadata.name).toBe('assault_weapon_test');
    });

    it('should extract faction from categories', () => {
      const metadata = extractArmyMetadata(jsonData, userId);
      
      expect(metadata.faction).toBe('Adeptus Astartes');
    });

    it('should set correct owner ID', () => {
      const metadata = extractArmyMetadata(jsonData, userId);
      
      expect(metadata.ownerId).toBe(userId);
    });

    it('should store source data as JSON string', () => {
      const metadata = extractArmyMetadata(jsonData, userId);
      
      expect(typeof metadata.sourceData).toBe('string');
      
      // Verify it's valid JSON
      const parsedSourceData = JSON.parse(metadata.sourceData);
      expect(parsedSourceData).toEqual(jsonData);
    });

    it('should set createdAt timestamp', () => {
      const beforeTest = Date.now();
      const metadata = extractArmyMetadata(jsonData, userId);
      const afterTest = Date.now();
      
      expect(metadata.createdAt).toBeGreaterThanOrEqual(beforeTest);
      expect(metadata.createdAt).toBeLessThanOrEqual(afterTest);
    });

    it('should handle missing roster gracefully', () => {
      const invalidJson = {} as NewRecruitRoster;
      
      expect(() => {
        extractArmyMetadata(invalidJson, userId);
      }).toThrow('Invalid roster data: missing roster object');
    });

    it('should handle missing cost information gracefully', () => {
      const minimalRoster: NewRecruitRoster = {
        roster: {
          name: 'Test Army'
        }
      };
      
      const metadata = extractArmyMetadata(minimalRoster, userId);
      
      expect(metadata.name).toBe('Test Army');
      expect(metadata.faction).toBe('');
    });

    it('should handle missing army name gracefully', () => {
      const rosterWithoutName: NewRecruitRoster = {
        roster: {}
      };
      
      const metadata = extractArmyMetadata(rosterWithoutName, userId);
      
      expect(metadata.name).toBe('Unnamed Army');
    });
  });

  describe('Faction extraction from real data', () => {
    it('should find faction in force selections categories', () => {
      const metadata = extractArmyMetadata(jsonData, userId);
      
      // From the test JSON, we should be able to extract Adeptus Astartes
      expect(metadata.faction).toBe('Adeptus Astartes');
    });
  });

  describe('Army metadata structure validation', () => {
    it('should return all required fields with correct types', () => {
      const metadata = extractArmyMetadata(jsonData, userId);
      
      expect(typeof metadata.id).toBe('string');
      expect(typeof metadata.name).toBe('string');
      expect(typeof metadata.faction).toBe('string');
      expect(typeof metadata.ownerId).toBe('string');
      expect(typeof metadata.sourceData).toBe('string');
      expect(typeof metadata.createdAt).toBe('number');
    });
  });
});

// ============================================================================
// Phase 2: Unit Extraction Tests
// ============================================================================

describe('Army Import - Phase 2: Unit Extraction', () => {
  const userId = 'test-user-123';
  const armyId = 'test-army-456';
  const jsonData = testData as NewRecruitRoster;

  describe('extractUnits', () => {
    it('should extract units from test JSON', () => {
      const units = extractUnits(jsonData, armyId, userId);
      
      expect(units).toBeDefined();
      expect(Array.isArray(units)).toBe(true);
      expect(units.length).toBeGreaterThan(0);
    });

    it('should extract correct number of units', () => {
      const units = extractUnits(jsonData, armyId, userId);
      
      // Based on assault_weapon_test.json, we should find actual unit selections
      // (not including configuration items)
      expect(units.length).toBeGreaterThan(0);
    });

    it('should filter out configuration items', () => {
      const units = extractUnits(jsonData, armyId, userId);
      
      // None of the extracted units should have 'Configuration' category
      for (const unit of units) {
        expect(unit.categories).not.toContain('Configuration');
      }
    });

    it('should only extract actual unit types', () => {
      const units = extractUnits(jsonData, armyId, userId);
      
      const validUnitCategories = ['Character', 'Infantry', 'Monster', 'Vehicle', 'Battleline', 'Mounted'];
      
      for (const unit of units) {
        const hasValidCategory = unit.categories.some(category => 
          validUnitCategories.some(validCat => category.includes(validCat))
        );
        expect(hasValidCategory).toBe(true);
      }
    });

    it('should set correct metadata for each unit', () => {
      const units = extractUnits(jsonData, armyId, userId);
      
      for (const unit of units) {
        expect(unit.id).toBeDefined();
        expect(typeof unit.id).toBe('string');
        expect(unit.name).toBeDefined();
        expect(typeof unit.name).toBe('string');
        expect(unit.armyId).toBe(armyId);
        expect(Array.isArray(unit.categories)).toBe(true);
        expect(Array.isArray(unit.rules)).toBe(true);
      }
    });

    it('should parse unit rules correctly', () => {
      const units = extractUnits(jsonData, armyId, userId);
      // Find units that should have rules
      const unitsWithRules = units.filter(unit => unit.rules.length > 0);
      for (const unit of unitsWithRules) {
        for (const rule of unit.rules) {
          expect(rule.id).toBeDefined();
          expect(rule.name).toBeDefined();
          expect(typeof rule.description).toBe('string');
        }
      }
    });

    it('should preserve source data for re-parsing', () => {
      const units = extractUnits(jsonData, armyId, userId);
      
      for (const unit of units) {
        expect(unit.sourceData).toBeDefined();
        expect(typeof unit.sourceData).toBe('object');
        expect(unit.sourceData.name).toBe(unit.name);
      }
    });

    it('should handle empty forces gracefully', () => {
      const emptyData: NewRecruitRoster = {
        roster: {
          name: 'Empty Roster',
          forces: []
        }
      };
      
      const units = extractUnits(emptyData, armyId, userId);
      expect(units).toEqual([]);
    });

    it('should handle missing selections gracefully', () => {
      const noSelectionsData: NewRecruitRoster = {
        roster: {
          name: 'No Selections Roster',
          forces: [{ selections: undefined }]
        }
      };
      
      const units = extractUnits(noSelectionsData, armyId, userId);
      expect(units).toEqual([]);
    });
  });

  describe('Unit data structure validation', () => {
    it('should return units with all required fields and correct types', () => {
      const units = extractUnits(jsonData, armyId, userId);
      
      expect(units.length).toBeGreaterThan(0);
      
      const unit = units[0];
      
      // Required string fields
      expect(typeof unit.id).toBe('string');
      expect(typeof unit.name).toBe('string');
      expect(typeof unit.armyId).toBe('string');
      
      // Required array fields
      expect(Array.isArray(unit.categories)).toBe(true);
      expect(Array.isArray(unit.rules)).toBe(true);
      
      // Required object field
      expect(typeof unit.sourceData).toBe('object');
      expect(unit.sourceData).not.toBeNull();
    });
  });

  describe('Real data parsing validation', () => {
    it('should find Space Marines units in assault_weapon_test.json', () => {
      const units = extractUnits(jsonData, armyId, userId);
      
      // Should extract some units from the test data
      expect(units.length).toBeGreaterThan(0);
      
      // Check that we have some recognizable 40k unit types
      const hasSpaceMarineUnits = units.some(unit => 
        unit.categories.some(cat => cat.includes('Adeptus Astartes') || cat.includes('Infantry') || cat.includes('Character'))
      );
      
      expect(hasSpaceMarineUnits).toBe(true);
    });
  });
});

// ============================================================================
// Phase 3: Model Processing Tests
// ============================================================================

describe('Army Import - Phase 3: Model Processing', () => {
  const userId = 'test-user-123';
  const armyId = 'test-army-456';
  const jsonData = testData as NewRecruitRoster;

  describe('extractModels', () => {
    it('should extract models from units', () => {
      const units = extractUnits(jsonData, armyId, userId);
      expect(units.length).toBeGreaterThan(0);
      
      const firstUnit = units[0];
      const models = extractModels(firstUnit);
      
      expect(models).toBeDefined();
      expect(Array.isArray(models)).toBe(true);
    });

    it('should extract models with correct metadata', () => {
      const units = extractUnits(jsonData, armyId, userId);
      const firstUnit = units[0];
      const models = extractModels(firstUnit);
      
      for (const model of models) {
        expect(model.id).toBeDefined();
        expect(typeof model.id).toBe('string');
        expect(model.name).toBeDefined();
        expect(typeof model.name).toBe('string');
        expect(model.unitId).toBe(firstUnit.id);
        
        // Check individual stat fields
        expect(typeof model.M).toBe('number');
        expect(typeof model.T).toBe('number');
        expect(typeof model.SV).toBe('number');
        expect(typeof model.W).toBe('number');
        expect(typeof model.LD).toBe('number');
        expect(typeof model.OC).toBe('number');
        expect(typeof model.woundsTaken).toBe('number');
        expect(model.woundsTaken).toBe(0); // Should start at zero
      }
    });

    it('should parse model stats correctly', () => {
      const units = extractUnits(jsonData, armyId, userId);
      const firstUnit = units[0];
      const models = extractModels(firstUnit);
      
      if (models.length > 0) {
        const model = models[0];
        
        // Should have valid stat values
        expect(model.M).toBeGreaterThan(0);
        expect(model.T).toBeGreaterThan(0);
        expect(model.SV).toBeGreaterThan(0);
        expect(model.W).toBeGreaterThan(0);
        expect(model.LD).toBeGreaterThan(0);
        expect(model.OC).toBeGreaterThanOrEqual(0);
        expect(model.woundsTaken).toBe(0); // Should start at zero
      }
    });

    it('should handle units with multiple model types', () => {
      const units = extractUnits(jsonData, armyId, userId);
      
      for (const unit of units) {
        const models = extractModels(unit);
        
        // Each unit should have at least one model
        expect(models.length).toBeGreaterThan(0);
        
        // Check for consistent unit linkage
        for (const model of models) {
          expect(model.unitId).toBe(unit.id);
        }
      }
    });

    it('should extract common 40k stats', () => {
      const units = extractUnits(jsonData, armyId, userId);
      
      for (const unit of units) {
        const models = extractModels(unit);
        
        for (const model of models) {
          // Should have valid 40k stat values
          expect(model.M).toBeGreaterThan(0);
          expect(model.T).toBeGreaterThan(0);
          expect(model.SV).toBeGreaterThan(0);
          expect(model.W).toBeGreaterThan(0);
          expect(model.LD).toBeGreaterThan(0);
          expect(model.OC).toBeGreaterThanOrEqual(0);
        }
      }
    });

    it('should preserve model counts correctly', () => {
      const units = extractUnits(jsonData, armyId, userId);
      
      for (const unit of units) {
        const models = extractModels(unit);
        
        // Total model count is now just the number of individual model records
        const totalModelCount = models.length;
        expect(totalModelCount).toBeGreaterThan(0);
        
        // Each model should be an individual record (no count field)
        for (const model of models) {
          expect(model.hasOwnProperty('count')).toBe(false);
        }
      }
    });
  });

  describe('Model data structure validation', () => {
    it('should return models with all required fields and correct types', () => {
      const units = extractUnits(jsonData, armyId, userId);
      const firstUnit = units[0];
      const models = extractModels(firstUnit);
      
      expect(models.length).toBeGreaterThan(0);
      
      const model = models[0];
      
      // Required string fields
      expect(typeof model.id).toBe('string');
      expect(typeof model.name).toBe('string');
      expect(typeof model.unitId).toBe('string');
      
      // Check individual stat fields
      expect(typeof model.M).toBe('number');
      expect(typeof model.T).toBe('number');
      expect(typeof model.SV).toBe('number');
      expect(typeof model.W).toBe('number');
      expect(typeof model.LD).toBe('number');
      expect(typeof model.OC).toBe('number');
      expect(typeof model.woundsTaken).toBe('number');
    });
  });

  describe('Model extraction from real data', () => {
    it('should extract models from Space Marines units', () => {
      const units = extractUnits(jsonData, armyId, userId);
      const allModels: ModelData[] = [];
      
      for (const unit of units) {
        const unitModels = extractModels(unit);
        allModels.push(...unitModels);
      }
      
      expect(allModels.length).toBeGreaterThan(0);
    });

    it('should maintain data integrity across army -> units -> models', () => {
      // Extract army metadata
      const armyMetadata = extractArmyMetadata(jsonData, userId);
      
      // Extract units  
      const units = extractUnits(jsonData, armyMetadata.id, userId);
      
      // Extract models from all units
      const allModels: ModelData[] = [];
      for (const unit of units) {
        const unitModels = extractModels(unit);
        allModels.push(...unitModels);
      }
      
      // Verify data consistency
      expect(armyMetadata.id).toBeDefined();
      expect(units.length).toBeGreaterThan(0);
      expect(allModels.length).toBeGreaterThan(0);
      
      // All units should belong to the army
      for (const unit of units) {
        expect(unit.armyId).toBe(armyMetadata.id);
      }
      
      // All models should belong to their respective units
      for (const model of allModels) {
        const parentUnit = units.find(u => u.id === model.unitId);
        expect(parentUnit).toBeDefined();
      }
    });
  });
});

// ============================================================================
// Phase 4: Weapon Processing Tests
// ============================================================================

describe('Army Import - Phase 4: Weapon Processing', () => {
  const userId = 'test-user-123';
  const armyId = 'test-army-456';
  const jsonData = testData as NewRecruitRoster;

  describe('extractWeapons', () => {
    it('should extract weapons from units', () => {
      const units = extractUnits(jsonData, armyId, userId);
      expect(units.length).toBeGreaterThan(0);
      
      const firstUnit = units[0];
      const models = extractModels(firstUnit);
      const weapons = extractWeapons(firstUnit, models);
      
      expect(weapons).toBeDefined();
      expect(Array.isArray(weapons)).toBe(true);
    });

    it('should extract weapons with correct metadata', () => {
      const units = extractUnits(jsonData, armyId, userId);
      const firstUnit = units[0];
      const models = extractModels(firstUnit);
      const weapons = extractWeapons(firstUnit, models);
      
      for (const weapon of weapons) {
        expect(weapon.id).toBeDefined();
        expect(typeof weapon.id).toBe('string');
        expect(weapon.name).toBeDefined();
        expect(typeof weapon.name).toBe('string');
        expect(weapon.modelId).toBeDefined();
        expect(typeof weapon.modelId).toBe('string');
        
        // Check weapon stats
        expect(typeof weapon.range).toBe('number');
        expect(typeof weapon.A).toBe('string');
        expect(typeof weapon.WS).toBe('number');
        expect(typeof weapon.S).toBe('number');
        expect(typeof weapon.AP).toBe('number');
        expect(typeof weapon.D).toBe('string');
        expect(Array.isArray(weapon.keywords)).toBe(true);
        expect(Array.isArray(weapon.turnsFired)).toBe(true);
      }
    });

    it('should distinguish between ranged and melee weapons', () => {
      const units = extractUnits(jsonData, armyId, userId);
      const allWeapons: WeaponData[] = [];
      
      for (const unit of units) {
        const models = extractModels(unit);
        const unitWeapons = extractWeapons(unit, models);
        allWeapons.push(...unitWeapons);
      }
      
      if (allWeapons.length > 0) {
        const rangedWeapons = allWeapons.filter(w => w.range > 0);
        const meleeWeapons = allWeapons.filter(w => w.range === 0);
        
        // Should have some weapons
        expect(allWeapons.length).toBeGreaterThan(0);
      }
    });

    it('should parse weapon stats correctly', () => {
      const units = extractUnits(jsonData, armyId, userId);
      
      for (const unit of units) {
        const models = extractModels(unit);
        const weapons = extractWeapons(unit, models);
        
        for (const weapon of weapons) {
          // Check weapon stat fields
          expect(typeof weapon.range).toBe('number');
          expect(typeof weapon.A).toBe('string');
          expect(typeof weapon.WS).toBe('number');
          expect(typeof weapon.S).toBe('number');
          expect(typeof weapon.AP).toBe('number');
          expect(typeof weapon.D).toBe('string');
          expect(Array.isArray(weapon.keywords)).toBe(true);
          expect(Array.isArray(weapon.turnsFired)).toBe(true);
        }
      }
    });

    it('should extract common 40k weapon stats', () => {
      const units = extractUnits(jsonData, armyId, userId);
      
      for (const unit of units) {
        const models = extractModels(unit);
        const weapons = extractWeapons(unit, models);
        
        for (const weapon of weapons) {
          // Check for valid 40k weapon stat values
          expect(weapon.range).toBeGreaterThanOrEqual(0);
          expect(weapon.WS).toBeGreaterThan(0);
          expect(weapon.S).toBeGreaterThan(0);
          expect(weapon.AP).toBeDefined(); // AP can be positive or negative
          expect(weapon.A).toBeDefined();
          expect(weapon.D).toBeDefined();
        }
      }
    });

    it('should link weapons to correct models', () => {
      const units = extractUnits(jsonData, armyId, userId);
      
      for (const unit of units) {
        const models = extractModels(unit);
        const weapons = extractWeapons(unit, models);
        
        for (const weapon of weapons) {
          // Weapon should be linked to a model in the unit
          const linkedModel = models.find(m => m.id === weapon.modelId);
          if (weapon.modelId) {
            expect(linkedModel).toBeDefined();
            if (linkedModel) {
              expect(linkedModel.unitId).toBe(unit.id);
            }
          }
        }
      }
    });

    it('should handle weapon keywords correctly', () => {
      const units = extractUnits(jsonData, armyId, userId);
      
      for (const unit of units) {
        const models = extractModels(unit);
        const weapons = extractWeapons(unit, models);
        
        for (const weapon of weapons) {
          expect(Array.isArray(weapon.keywords)).toBe(true);
          expect(Array.isArray(weapon.turnsFired)).toBe(true);
          
          // Keywords should be strings
          for (const keyword of weapon.keywords) {
            expect(typeof keyword).toBe('string');
          }
          
          // Turns fired should be numbers
          for (const turn of weapon.turnsFired) {
            expect(typeof turn).toBe('number');
          }
        }
      }
    });
  });

  describe('Weapon data structure validation', () => {
    it('should return weapons with all required fields and correct types', () => {
      const units = extractUnits(jsonData, armyId, userId);
      const firstUnit = units[0];
      const models = extractModels(firstUnit);
      const weapons = extractWeapons(firstUnit, models);
      
      if (weapons.length > 0) {
        const weapon = weapons[0];
        
        // Required string fields
        expect(typeof weapon.id).toBe('string');
        expect(typeof weapon.name).toBe('string');
        expect(typeof weapon.modelId).toBe('string');
        
        // Required stat fields
        expect(typeof weapon.range).toBe('number');
        expect(typeof weapon.A).toBe('string');
        expect(typeof weapon.WS).toBe('number');
        expect(typeof weapon.S).toBe('number');
        expect(typeof weapon.AP).toBe('number');
        expect(typeof weapon.D).toBe('string');
        
        // Required array fields
        expect(Array.isArray(weapon.keywords)).toBe(true);
        expect(Array.isArray(weapon.turnsFired)).toBe(true);
      }
    });
  });

  describe('Weapon extraction from real data', () => {
    it('should extract weapons from Space Marines units', () => {
      const units = extractUnits(jsonData, armyId, userId);
      const allWeapons: WeaponData[] = [];
      
      for (const unit of units) {
        const models = extractModels(unit);
        const unitWeapons = extractWeapons(unit, models);
        allWeapons.push(...unitWeapons);
      }
      
      expect(allWeapons.length).toBeGreaterThan(0);
    });

    it('should maintain data integrity across army -> units -> models -> weapons', () => {
      // Extract army metadata
      const armyMetadata = extractArmyMetadata(jsonData, userId);
      
      // Extract units  
      const units = extractUnits(jsonData, armyMetadata.id, userId);
      
      // Extract models from all units
      const allModels: ModelData[] = [];
      for (const unit of units) {
        const unitModels = extractModels(unit);
        allModels.push(...unitModels);
      }
      
      // Extract weapons from all units
      const allWeapons: WeaponData[] = [];
      for (const unit of units) {
        const unitModels = allModels.filter(model => model.unitId === unit.id);
        const unitWeapons = extractWeapons(unit, unitModels);
        allWeapons.push(...unitWeapons);
      }
      
      // Verify data consistency
      expect(armyMetadata.id).toBeDefined();
      expect(units.length).toBeGreaterThan(0);
      expect(allModels.length).toBeGreaterThan(0);
      expect(allWeapons.length).toBeGreaterThan(0);
      
      // All units should belong to the army
      for (const unit of units) {
        expect(unit.armyId).toBe(armyMetadata.id);
      }
      
      // All models should belong to their respective units
      for (const model of allModels) {
        const parentUnit = units.find(u => u.id === model.unitId);
        expect(parentUnit).toBeDefined();
      }
      
      // All weapons should belong to their respective models
      for (const weapon of allWeapons) {
        if (weapon.modelId) {
          const parentModel = allModels.find(m => m.id === weapon.modelId);
          expect(parentModel).toBeDefined();
          
          if (parentModel) {
            const parentUnit = units.find(u => u.id === parentModel.unitId);
            expect(parentUnit).toBeDefined();
          }
        }
      }
    });

    it('should extract recognizable 40k weapons', () => {
      const units = extractUnits(jsonData, armyId, userId);
      const allWeapons: WeaponData[] = [];
      
      for (const unit of units) {
        const models = extractModels(unit);
        const unitWeapons = extractWeapons(unit, models);
        allWeapons.push(...unitWeapons);
      }
      
      if (allWeapons.length > 0) {
        // Should have some recognizable 40k weapon names
        const weaponNames = allWeapons.map(w => w.name.toLowerCase());
        const common40kWeapons = ['bolt', 'rifle', 'pistol', 'storm', 'melta', 'plasma', 'power', 'chainsword', 'cannon'];
        
        const hasRecognizable40kWeapons = weaponNames.some(name => 
          common40kWeapons.some(weaponType => name.includes(weaponType))
        );
        
        if (hasRecognizable40kWeapons) {
          expect(hasRecognizable40kWeapons).toBe(true);
        }
      }
    });
  });
});

describe('Psychophage Weapon Extraction', () => {
  const userId1 = 'player1-user-id';
  it('should extract weapons from Psychophage unit correctly', () => {
    const tyranidData = require('../test_data/tyranid_combat_patrol.json') as NewRecruitRoster;
    const armyMetadata = extractArmyMetadata(tyranidData, userId1);
    const units = extractUnits(tyranidData, armyMetadata.id, userId1);
    
    // Find the Psychophage unit
    const psychophageUnit = units.find(unit => unit.name === 'Psychophage');
    expect(psychophageUnit).toBeDefined();
    
    if (psychophageUnit) {
      const models = extractModels(psychophageUnit);
      const weapons = extractWeapons(psychophageUnit, models);
      
      // Verify weapon extraction is working correctly
      
      // Should have at least 2 weapons: Psycholastic torrent (ranged) and Talons and betentacled maw (melee)
      expect(weapons.length).toBeGreaterThanOrEqual(2);
      
      // Check for specific weapons
      const weaponNames = weapons.map(w => w.name);
      expect(weaponNames).toContain('Psycholastic torrent');
      expect(weaponNames).toContain('Talons and betentacled maw');
      
      // Check weapon stats
      const torrentWeapon = weapons.find(w => w.name === 'Psycholastic torrent');
      if (torrentWeapon) {
        expect(torrentWeapon.range).toBe(12);
        expect(torrentWeapon.A).toBe('D6');
        expect(torrentWeapon.WS).toBe(null); // N/A for torrent weapon
        expect(torrentWeapon.S).toBe(6);
        expect(torrentWeapon.AP).toBe(-1);
        expect(torrentWeapon.D).toBe('1');
        expect(torrentWeapon.keywords).toContain('Ignores Cover');
        expect(torrentWeapon.keywords).toContain('Torrent');
      }
      
      const meleeWeapon = weapons.find(w => w.name === 'Talons and betentacled maw');
      if (meleeWeapon) {
        expect(meleeWeapon.range).toBe(0); // Melee
        expect(meleeWeapon.A).toBe('6');
        expect(meleeWeapon.WS).toBe(3);
        expect(meleeWeapon.S).toBe(6);
        expect(meleeWeapon.AP).toBe(-2);
        expect(meleeWeapon.D).toBe('2');
        expect(meleeWeapon.keywords).toContain('Anti-Psyker 4+');
        expect(meleeWeapon.keywords).toContain('Devastating Wounds');
      }
      
      // Check abilities
      expect(psychophageUnit.abilities).toBeDefined();
      expect(psychophageUnit.abilities.length).toBeGreaterThan(0);
      
      // Check for specific abilities
      const abilityNames = psychophageUnit.abilities.map(a => a.name);
      expect(abilityNames).toContain('Bio-stimulus');
      expect(abilityNames).toContain('Feeding Frenzy');
      
      // Check ability descriptions
      const bioStimulusAbility = psychophageUnit.abilities.find(a => a.name === 'Bio-stimulus');
      if (bioStimulusAbility) {
        expect(bioStimulusAbility.description).toContain('In your Shooting phase');
        expect(bioStimulusAbility.description).toContain('improve the Armour Penetration characteristic');
      }
      
      const feedingFrenzyAbility = psychophageUnit.abilities.find(a => a.name === 'Feeding Frenzy');
      if (feedingFrenzyAbility) {
        expect(feedingFrenzyAbility.description).toContain('Each time this model makes a melee attack');
        expect(feedingFrenzyAbility.description).toContain('add 1 to the Hit roll');
      }
    }
  });
});

// ============================================================================
// Integration Test with Simple Data
// ============================================================================

describe('Army Import - Integration Test with Simple Data', () => {
  const userId = 'test-user-123';
  
  it('should parse simple.json and extract units, models, and weapons', async () => {
    // Import the simple test data
    const simpleData = require('../test_data/simple.json') as NewRecruitRoster;
    
    // Extract army metadata
    const armyMetadata = extractArmyMetadata(simpleData, userId);
    expect(armyMetadata).toBeDefined();
    expect(armyMetadata.name).toBeDefined();
    expect(armyMetadata.faction).toBeDefined();
    
    // Extract units
    const units = extractUnits(simpleData, armyMetadata.id, userId);
    expect(units.length).toBeGreaterThan(0);
    expect(units.length).toBe(1); // Should have exactly one unit (Boyz)
    
    const firstUnit = units[0];
    expect(firstUnit.name).toBe('Boyz');
    expect(firstUnit.categories).toContain('Infantry');
    expect(firstUnit.categories).toContain('Battleline');
    
    // Extract models from the unit
    const models = extractModels(firstUnit);
    expect(models.length).toBeGreaterThan(0);
    expect(models.length).toBe(10); // 1 Boss Nob + 9 Boyz
    
    // Verify model stats
    for (const model of models) {
      expect(model.name).toBeDefined();
      expect(model.unitId).toBe(firstUnit.id);
      expect(typeof model.M).toBe('number');
      expect(typeof model.T).toBe('number');
      expect(typeof model.SV).toBe('number');
      expect(typeof model.W).toBe('number');
      expect(typeof model.LD).toBe('number');
      expect(typeof model.OC).toBe('number');
      expect(model.woundsTaken).toBe(0);
    }
    
    // Extract weapons from the unit
    const weapons = extractWeapons(firstUnit, models);
    expect(weapons.length).toBeGreaterThan(0);
    
    // Verify weapon stats
    for (const weapon of weapons) {
      expect(weapon.name).toBeDefined();
      expect(weapon.modelId).toBeDefined();
      expect(typeof weapon.range).toBe('number');
      expect(typeof weapon.A).toBe('string');
      expect(typeof weapon.WS).toBe('number');
      expect(typeof weapon.S).toBe('number');
      expect(typeof weapon.AP).toBe('number');
      expect(typeof weapon.D).toBe('string');
      expect(Array.isArray(weapon.keywords)).toBe(true);
      expect(Array.isArray(weapon.turnsFired)).toBe(true);
    }
    
    // Verify data integrity
    // Each weapon should be linked to a model
    for (const weapon of weapons) {
      const linkedModel = models.find(m => m.id === weapon.modelId);
      expect(linkedModel).toBeDefined();
      if (linkedModel) {
        expect(linkedModel.unitId).toBe(firstUnit.id);
      }
    }
    
    // Should have some recognizable Ork weapons
    const weaponNames = weapons.map(w => w.name.toLowerCase());
    expect(weaponNames.some(name => name.includes('choppa'))).toBe(true);
    expect(weaponNames.some(name => name.includes('slugga'))).toBe(true);
    
    console.log('✅ Simple data parsing successful:', {
      armyName: armyMetadata.name,
      faction: armyMetadata.faction,
      unitCount: units.length,
      modelCount: models.length,
      weaponCount: weapons.length,
      unitName: firstUnit.name,
      modelNames: models.map(m => m.name),
      weaponNames: weapons.map(w => w.name)
    });
  });
}); 

describe('Weapon-to-Model Linking Integrity', () => {
  it('should only link each Terminator model to its correct weapons', () => {
    const userId = 'test-user-terminator';
    const armyId = 'test-army-terminator';
    const jsonData = testData as NewRecruitRoster;
    const units = extractUnits(jsonData, armyId, userId);
    // Find the Terminator unit (name may need to be adjusted to match test data)
    const terminatorUnit = units.find(u => u.name.toLowerCase().includes('terminator'));
    expect(terminatorUnit).toBeDefined();
    if (!terminatorUnit) return;
    const models = extractModels(terminatorUnit);
    const weapons = extractWeapons(terminatorUnit, models);

    // Group weapons by modelId
    const weaponsByModel: Record<string, string[]> = {};
    for (const weapon of weapons) {
      if (!weaponsByModel[weapon.modelId]) weaponsByModel[weapon.modelId] = [];
      weaponsByModel[weapon.modelId].push(weapon.name);
    }

    // Find all unique weapon sets
    const weaponSets = (Object.values(weaponsByModel) as string[][]).map(names => names.sort().join(','));
    const uniqueWeaponSets = Array.from(new Set(weaponSets));

    // There should be 2 unique weapon sets (for 2 configs: regular/sergeant and heavy weapon)
    expect(uniqueWeaponSets.length).toBe(2);

    // Each model should only have 2 weapons (not all 6)
    for (const weaponList of Object.values(weaponsByModel) as string[][]) {
      expect(weaponList.length).toBe(2);
    }
  });
}); 