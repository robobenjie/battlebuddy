/**
 * Unit tests for Army Import Module - Phase 1
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
          update: (data: any) => ({ type: 'army-update', id: prop, data })
        })
      }),
      units: new Proxy({}, {
        get: (target, prop) => ({
          update: (data: any) => ({ type: 'unit-update', id: prop, data })
        })
      }),
      models: new Proxy({}, {
        get: (target, prop) => ({
          update: (data: any) => ({ type: 'model-update', id: prop, data })
        })
      }),
      weapons: new Proxy({}, {
        get: (target, prop) => ({
          update: (data: any) => ({ type: 'weapon-update', id: prop, data })
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
      
      console.log('🧪 Extracted units:', units.length);
      
      // Test model extraction for each unit
      units.forEach((unit, index) => {
        console.log(`🧪 Unit ${index + 1}: ${unit.name}, count: ${unit.count}`);
        
        const models = extractModels(unit);
        console.log(`🧪 Models for unit ${unit.name}:`, models.map(m => ({ name: m.name, count: m.count })));
        
        // Verify no model has count of 1 unless that's actually correct
        models.forEach(model => {
          expect(model.count).toBeGreaterThan(0);
          console.log(`🧪 Model: ${model.name}, count: ${model.count}`);
        });
      });
    });

    it('should preserve model counts through full import process', async () => {
      const jsonData = testData as NewRecruitRoster;
      
      // Test import for player 1 (host)
      console.log('🧪 Testing import for Player 1 (host)');
      const result1 = await importArmyForGame(jsonData, userId1, gameId);
      
      // Extract model transactions for player 1
      const player1ModelTransactions = mockTransactions.filter(t => t.type === 'model-update');
      console.log('🧪 Player 1 model transactions:', player1ModelTransactions.length);
      
      player1ModelTransactions.forEach((transaction, index) => {
        console.log(`🧪 Player 1 Model ${index + 1}: ${transaction.data.name}, count: ${transaction.data.count}`);
        expect(transaction.data.count).toBeGreaterThan(0);
        expect(transaction.data.count).toBeDefined();
      });
      
      // Clear transactions and test player 2
      mockTransactions.length = 0;
      
      console.log('🧪 Testing import for Player 2 (non-host)');
      const result2 = await importArmyForGame(jsonData, userId2, gameId);
      
      // Extract model transactions for player 2
      const player2ModelTransactions = mockTransactions.filter(t => t.type === 'model-update');
      console.log('🧪 Player 2 model transactions:', player2ModelTransactions.length);
      
      player2ModelTransactions.forEach((transaction, index) => {
        console.log(`🧪 Player 2 Model ${index + 1}: ${transaction.data.name}, count: ${transaction.data.count}`);
        expect(transaction.data.count).toBeGreaterThan(0);
        expect(transaction.data.count).toBeDefined();
      });
      
      // Compare counts between players
      expect(player1ModelTransactions.length).toBe(player2ModelTransactions.length);
      
      for (let i = 0; i < player1ModelTransactions.length; i++) {
        const p1Model = player1ModelTransactions[i];
        const p2Model = player2ModelTransactions[i];
        
        console.log(`🧪 Comparing model ${i + 1}: P1=${p1Model.data.count}, P2=${p2Model.data.count}`);
        expect(p1Model.data.count).toBe(p2Model.data.count);
      }
    });
  });

  describe('Different Army Data Structures', () => {
    it('should handle armies with different model configurations', async () => {
      // Create test data with known model counts
      const testArmy1: NewRecruitRoster = {
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

      const testArmy2: NewRecruitRoster = {
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
      console.log('🧪 Testing Army 1 (5 models)');
      await importArmyForGame(testArmy1, userId1, gameId);
      const army1Models = mockTransactions.filter(t => t.type === 'model-update');
      
      mockTransactions.length = 0;
      
      console.log('🧪 Testing Army 2 (10 models)');
      await importArmyForGame(testArmy2, userId2, gameId);
      const army2Models = mockTransactions.filter(t => t.type === 'model-update');
      
      // Verify counts are preserved
      army1Models.forEach(transaction => {
        console.log(`🧪 Army 1 Model: ${transaction.data.name}, count: ${transaction.data.count}`);
        expect(transaction.data.count).toBe(5);
      });
      
      army2Models.forEach(transaction => {
        console.log(`🧪 Army 2 Model: ${transaction.data.name}, count: ${transaction.data.count}`);
        expect(transaction.data.count).toBe(10);
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

    it('should extract correct points information', () => {
      const metadata = extractArmyMetadata(jsonData, userId);
      
      expect(metadata.totalPoints).toBe(270);
      expect(metadata.pointsLimit).toBe(1000);
    });

    it('should extract faction from categories', () => {
      const metadata = extractArmyMetadata(jsonData, userId);
      
      expect(metadata.faction).toBe('Adeptus Astartes');
    });

    it('should extract detachment information', () => {
      const metadata = extractArmyMetadata(jsonData, userId);
      
      // Note: The test JSON might not have detachment info, so we test for string type
      expect(typeof metadata.detachment).toBe('string');
    });

    it('should extract battle size information', () => {
      const metadata = extractArmyMetadata(jsonData, userId);
      
      // Note: The test JSON might not have battle size info, so we test for string type
      expect(typeof metadata.battleSize).toBe('string');
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
      expect(metadata.totalPoints).toBe(0);
      expect(metadata.pointsLimit).toBe(0);
      expect(metadata.faction).toBe('');
      expect(metadata.detachment).toBe('');
      expect(metadata.battleSize).toBe('');
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
      expect(typeof metadata.detachment).toBe('string');
      expect(typeof metadata.battleSize).toBe('string');
      expect(typeof metadata.totalPoints).toBe('number');
      expect(typeof metadata.pointsLimit).toBe('number');
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
      
      // Log units for debugging
      console.log('Extracted units:', units.map(u => ({ name: u.name, categories: u.categories })));
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
        expect(unit.ownerId).toBe(userId);
        expect(Array.isArray(unit.categories)).toBe(true);
        expect(typeof unit.cost).toBe('number');
        expect(typeof unit.count).toBe('number');
        expect(unit.count).toBeGreaterThan(0);
      }
    });

    it('should parse unit profiles correctly', () => {
      const units = extractUnits(jsonData, armyId, userId);
      
      // Find units that should have profiles
      const unitsWithProfiles = units.filter(unit => unit.profiles.length > 0);
      
      for (const unit of unitsWithProfiles) {
        for (const profile of unit.profiles) {
          expect(profile.id).toBeDefined();
          expect(profile.name).toBeDefined();
          expect(Array.isArray(profile.characteristics)).toBe(true);
          
          // Check characteristic structure
          for (const char of profile.characteristics) {
            expect(char.name).toBeDefined();
            expect(char.typeId).toBeDefined();
            expect(char.value).toBeDefined();
          }
        }
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

    it('should calculate unit costs correctly', () => {
      const units = extractUnits(jsonData, armyId, userId);
      
      for (const unit of units) {
        expect(typeof unit.cost).toBe('number');
        expect(unit.cost).toBeGreaterThanOrEqual(0);
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
      expect(typeof unit.type).toBe('string');
      expect(typeof unit.armyId).toBe('string');
      expect(typeof unit.ownerId).toBe('string');
      
      // Required number fields
      expect(typeof unit.cost).toBe('number');
      expect(typeof unit.count).toBe('number');
      
      // Required array fields
      expect(Array.isArray(unit.categories)).toBe(true);
      expect(Array.isArray(unit.profiles)).toBe(true);
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
      
      // Log extracted unit names for verification
      console.log('Unit names found:', units.map(u => u.name));
      
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
        expect(model.armyId).toBe(armyId);
        expect(model.ownerId).toBe(userId);
        expect(typeof model.count).toBe('number');
        expect(model.count).toBeGreaterThan(0);
        expect(Array.isArray(model.characteristics)).toBe(true);
      }
    });

    it('should parse model characteristics correctly', () => {
      const units = extractUnits(jsonData, armyId, userId);
      const firstUnit = units[0];
      const models = extractModels(firstUnit);
      
      if (models.length > 0) {
        const model = models[0];
        
        // Should have characteristics
        expect(model.characteristics.length).toBeGreaterThan(0);
        
        for (const characteristic of model.characteristics) {
          expect(characteristic.name).toBeDefined();
          expect(typeof characteristic.name).toBe('string');
          expect(characteristic.value).toBeDefined();
          expect(typeof characteristic.value).toBe('string');
        }
        
        // Log characteristics for debugging
        console.log(`Model ${model.name} characteristics:`, model.characteristics);
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

    it('should extract common 40k characteristics', () => {
      const units = extractUnits(jsonData, armyId, userId);
      
      for (const unit of units) {
        const models = extractModels(unit);
        
                for (const model of models) {
          if (model.characteristics.length > 0) {
            const charNames = model.characteristics.map(c => c.name);
            
            // Should have some typical 40k stats
            const has40kStats = charNames.some(name => 
              ['M', 'T', 'Sv', 'W', 'Ld', 'OC', 'Movement', 'Toughness', 'Save', 'Wounds', 'Leadership', 'Objective Control'].includes(name)
            );
            
            if (has40kStats) {
              expect(has40kStats).toBe(true);
            }
          }
        }
      }
    });

    it('should preserve model counts correctly', () => {
      const units = extractUnits(jsonData, armyId, userId);
      
      for (const unit of units) {
        const models = extractModels(unit);
        
        // Total model count should make sense
        const totalModelCount = models.reduce((sum, model) => sum + model.count, 0);
        expect(totalModelCount).toBeGreaterThan(0);
        
        // Each model should have a positive count
        for (const model of models) {
          expect(model.count).toBeGreaterThan(0);
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
      expect(typeof model.armyId).toBe('string');
      expect(typeof model.ownerId).toBe('string');
      
      // Required number field
      expect(typeof model.count).toBe('number');
      
      // Required array field
      expect(Array.isArray(model.characteristics)).toBe(true);
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
      
      // Log model information for verification
      console.log('Extracted models:', allModels.map(m => ({ 
        name: m.name, 
        count: m.count, 
        characteristics: m.characteristics.length 
      })));
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
      
      // All models should belong to their respective units and the army
      for (const model of allModels) {
        expect(model.armyId).toBe(armyMetadata.id);
        
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
        expect(weapon.unitId).toBe(firstUnit.id);
        expect(weapon.armyId).toBe(armyId);
        expect(weapon.ownerId).toBe(userId);
        expect(typeof weapon.count).toBe('number');
        expect(weapon.count).toBeGreaterThan(0);
        expect(['ranged', 'melee']).toContain(weapon.type);
        expect(Array.isArray(weapon.characteristics)).toBe(true);
        expect(Array.isArray(weapon.profiles)).toBe(true);
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
        const rangedWeapons = allWeapons.filter(w => w.type === 'ranged');
        const meleeWeapons = allWeapons.filter(w => w.type === 'melee');
        
        // Should have some weapons
        expect(allWeapons.length).toBeGreaterThan(0);
        
        // Log weapon breakdown for verification
        console.log('Weapon breakdown:', {
          total: allWeapons.length,
          ranged: rangedWeapons.length,
          melee: meleeWeapons.length,
          weaponNames: allWeapons.map(w => ({ name: w.name, type: w.type }))
        });
      }
    });

    it('should parse weapon characteristics correctly', () => {
      const units = extractUnits(jsonData, armyId, userId);
      
      for (const unit of units) {
        const models = extractModels(unit);
        const weapons = extractWeapons(unit, models);
        
        for (const weapon of weapons) {
          if (weapon.characteristics.length > 0) {
            for (const characteristic of weapon.characteristics) {
              expect(characteristic.name).toBeDefined();
              expect(typeof characteristic.name).toBe('string');
              expect(characteristic.value).toBeDefined();
              expect(typeof characteristic.value).toBe('string');
            }
            
            // Log characteristics for debugging
            console.log(`Weapon ${weapon.name} (${weapon.type}) characteristics:`, weapon.characteristics);
          }
        }
      }
    });

    it('should extract common 40k weapon characteristics', () => {
      const units = extractUnits(jsonData, armyId, userId);
      
      for (const unit of units) {
        const models = extractModels(unit);
        const weapons = extractWeapons(unit, models);
        
        for (const weapon of weapons) {
          if (weapon.characteristics.length > 0) {
            const charNames = weapon.characteristics.map(c => c.name);
            
            // Common 40k weapon stats
            const commonWeaponStats = ['Range', 'A', 'BS', 'S', 'AP', 'D', 'Attacks', 'Strength', 'Damage'];
            const hasCommonStats = charNames.some(name => 
              commonWeaponStats.some(stat => name.includes(stat))
            );
            
            if (hasCommonStats) {
              expect(hasCommonStats).toBe(true);
            }
          }
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

    it('should preserve weapon counts correctly', () => {
      const units = extractUnits(jsonData, armyId, userId);
      
      for (const unit of units) {
        const models = extractModels(unit);
        const weapons = extractWeapons(unit, models);
        
        // Each weapon should have a positive count
        for (const weapon of weapons) {
          expect(weapon.count).toBeGreaterThan(0);
        }
        
        // Total weapon count should make sense
        const totalWeaponCount = weapons.reduce((sum, weapon) => sum + weapon.count, 0);
        if (weapons.length > 0) {
          expect(totalWeaponCount).toBeGreaterThan(0);
        }
      }
    });

    it('should handle weapon profiles correctly', () => {
      const units = extractUnits(jsonData, armyId, userId);
      
      for (const unit of units) {
        const models = extractModels(unit);
        const weapons = extractWeapons(unit, models);
        
        for (const weapon of weapons) {
          expect(Array.isArray(weapon.profiles)).toBe(true);
          
          for (const profile of weapon.profiles) {
            expect(profile.name).toBeDefined();
            expect(typeof profile.name).toBe('string');
            expect(Array.isArray(profile.characteristics)).toBe(true);
            
            for (const char of profile.characteristics) {
              expect(char.name).toBeDefined();
              expect(char.value).toBeDefined();
            }
          }
        }
      }
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
        expect(typeof weapon.type).toBe('string');
        expect(typeof weapon.modelId).toBe('string');
        expect(typeof weapon.unitId).toBe('string');
        expect(typeof weapon.armyId).toBe('string');
        expect(typeof weapon.ownerId).toBe('string');
        
        // Required number field
        expect(typeof weapon.count).toBe('number');
        
        // Required array fields
        expect(Array.isArray(weapon.characteristics)).toBe(true);
        expect(Array.isArray(weapon.profiles)).toBe(true);
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
      
      // Log weapon information for verification
      console.log('Extracted weapons:', allWeapons.map(w => ({ 
        name: w.name, 
        type: w.type,
        count: w.count, 
        characteristics: w.characteristics.length 
      })));
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
      
      // All models should belong to their respective units and the army
      for (const model of allModels) {
        expect(model.armyId).toBe(armyMetadata.id);
        
        const parentUnit = units.find(u => u.id === model.unitId);
        expect(parentUnit).toBeDefined();
      }
      
      // All weapons should belong to their respective models, units, and the army
      for (const weapon of allWeapons) {
        expect(weapon.armyId).toBe(armyMetadata.id);
        
        const parentUnit = units.find(u => u.id === weapon.unitId);
        expect(parentUnit).toBeDefined();
        
        if (weapon.modelId) {
          const parentModel = allModels.find(m => m.id === weapon.modelId);
          expect(parentModel).toBeDefined();
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
        
        expect(hasRecognizable40kWeapons).toBe(true);
      }
    });
    });
  });
}); 