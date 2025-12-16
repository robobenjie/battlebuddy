/**
 * Test for army states extraction from InstantDB query
 */

import { describe, it, expect } from 'vitest';

describe('Army States Extraction', () => {
  it('should extract army states from game query structure', () => {
    // Mock the structure returned by InstantDB query
    // NOTE: The link label is "states", not "armyStates" (see instant.schema.ts line 217)
    const mockGameData = {
      games: [
        {
          id: 'game-123',
          armies: [
            {
              id: 'army-1',
              name: 'Ork Army',
              states: [
                { id: 'state-1', armyId: 'army-1', state: 'waaagh-active', createdAt: Date.now() }
              ]
            },
            {
              id: 'army-2',
              name: 'Space Marine Army',
              states: []
            }
          ]
        }
      ]
    };

    // Extract army states using the same logic as CombatCalculatorPage
    const game = mockGameData.games[0];
    const armyStates = game?.armies?.flatMap((army: any) => army.states || []) || [];

    // Should have 1 army state (from army-1)
    expect(armyStates).toHaveLength(1);
    expect(armyStates[0].state).toBe('waaagh-active');
    expect(armyStates[0].armyId).toBe('army-1');
  });

  it('should handle missing states in query result', () => {
    // This tests what happens if InstantDB doesn't return states in the nested structure
    const mockGameData = {
      games: [
        {
          id: 'game-123',
          armies: [
            {
              id: 'army-1',
              name: 'Ork Army'
              // states is MISSING - this might be our issue!
            }
          ]
        }
      ]
    };

    const game = mockGameData.games[0];
    const armyStates = game?.armies?.flatMap((army: any) => army.states || []) || [];

    // Should return empty array, not crash
    expect(armyStates).toHaveLength(0);
  });

  it('should handle armies with multiple army states', () => {
    const mockGameData = {
      games: [
        {
          id: 'game-123',
          armies: [
            {
              id: 'army-1',
              name: 'Ork Army',
              states: [
                { id: 'state-1', armyId: 'army-1', state: 'waaagh-active', createdAt: Date.now() },
                { id: 'state-2', armyId: 'army-1', state: 'mob-rule-active', createdAt: Date.now() }
              ]
            },
            {
              id: 'army-2',
              name: 'Space Marine Army',
              states: [
                { id: 'state-3', armyId: 'army-2', state: 'tactical-doctrine', createdAt: Date.now() }
              ]
            }
          ]
        }
      ]
    };

    const game = mockGameData.games[0];
    const armyStates = game?.armies?.flatMap((army: any) => army.states || []) || [];

    // Should have all 3 army states
    expect(armyStates).toHaveLength(3);
    expect(armyStates.map(s => s.state)).toEqual([
      'waaagh-active',
      'mob-rule-active',
      'tactical-doctrine'
    ]);
  });
});
