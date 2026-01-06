/**
 * Tests for command phase army-wide choices and enemy unit targeting
 *
 * Covers:
 * - Hyper Adaptations (army-wide choice with game lifetime)
 * - Oath of Moment (enemy unit targeting with phase lifetime)
 */

import { describe, it, expect } from 'vitest';
import { TEST_RULES } from '../lib/rules-engine/test-rules';
import { buildCombatContext } from '../lib/rules-engine/context';
import { evaluateRule, getAddedKeywords } from '../lib/rules-engine/evaluator';
import { ArmyState } from '../lib/rules-engine/types';

// Helper to create test context with defaults
function createTestContext(params: any) {
  return buildCombatContext({
    game: {
      id: 'game-1',
      currentTurn: 1,
      currentPhase: 'shooting'
    },
    combatPhase: 'shooting',
    combatRole: 'attacker',
    options: {
      modelsFiring: 5,
      withinHalfRange: false,
      blastBonusAttacks: 0,
      unitHasCharged: false,
      unitRemainedStationary: false
    },
    ...params
  });
}

describe('Command Phase Army-Wide Choices', () => {
  describe('Hyper Adaptations - Swarming Instincts', () => {
    const hyperAdaptationsRule = TEST_RULES.find(r => r.name === 'hyper-adaptations-swarming')?.rule;

    if (!hyperAdaptationsRule) {
      throw new Error('hyper-adaptations-swarming rule not found in TEST_RULES');
    }

    it('should be a choice rule with army scope', () => {
      expect(hyperAdaptationsRule.kind).toBe('choice');
      expect(hyperAdaptationsRule.scope).toBe('army');
    });

    it('should have game lifetime', () => {
      if (hyperAdaptationsRule.kind !== 'choice') throw new Error('Expected choice rule');
      expect(hyperAdaptationsRule.choice.lifetime.t).toBe('game');
    });

    it('should add SUSTAINED HITS 1 when targeting Infantry with Swarming Instincts selected', () => {
      const context = createTestContext({
        weapon: {
          name: 'Test Weapon',
          range: 24,
          A: '2',
          WS: 3,
          S: 4,
          AP: 0,
          D: '1',
          keywords: []
        },
        attacker: {
          id: 'attacker-1',
          name: 'Tyranid Warrior',
          categories: ['Infantry', 'Tyranids'],
          isLeader: false
        },
        defender: {
          id: 'defender-1',
          name: 'Space Marine',
          categories: ['Infantry', 'Adeptus Astartes'],
          T: 4,
          SV: 3,
          W: 2
        },
        armyStates: [
          {
            id: 'state-1',
            armyId: 'tyranid-army',
            state: 'hyper-adaptations',
            choiceValue: 'swarming-instincts',
            activatedTurn: 1
          }
        ]
      });

      const applied = evaluateRule(hyperAdaptationsRule, context);
      expect(applied).toBe(true);

      // Check that SUSTAINED HITS ability was added
      const addedKeywords = getAddedKeywords(context);
      const hasSustainedHits = addedKeywords.some(kw =>
        kw.toLowerCase().includes('sustained') && kw.toLowerCase().includes('hits')
      );
      expect(hasSustainedHits).toBe(true);
    });

    it('should add LETHAL HITS when targeting Vehicle with Hyper-Aggression selected', () => {
      const context = createTestContext({
        weapon: {
          name: 'Test Weapon',
          range: 24,
          A: '2',
          WS: 3,
          S: 8,
          AP: -2,
          D: '3',
          keywords: []
        },
        attacker: {
          id: 'attacker-1',
          name: 'Tyranid Warrior',
          categories: ['Infantry', 'Tyranids'],
          isLeader: false
        },
        defender: {
          id: 'defender-1',
          name: 'Rhino',
          categories: ['Vehicle', 'Adeptus Astartes'],
          T: 9,
          SV: 3,
          W: 10
        },
        armyStates: [
          {
            id: 'state-1',
            armyId: 'tyranid-army',
            state: 'hyper-adaptations',
            choiceValue: 'hyper-aggression',
            activatedTurn: 1
          }
        ],
        combatRole: 'attacker'
      });

      const applied = evaluateRule(hyperAdaptationsRule, context);
      expect(applied).toBe(true);

      // Check that LETHAL HITS ability was added
      const addedKeywords = getAddedKeywords(context);
      const hasLethalHits = addedKeywords.some(kw =>
        kw.toLowerCase().includes('lethal') && kw.toLowerCase().includes('hits')
      );
      expect(hasLethalHits).toBe(true);
    });

    it('should not apply when targeting non-Infantry without Swarming Instincts', () => {
      const context = createTestContext({
        weapon: {
          name: 'Test Weapon',
          range: 24,
          A: '2',
          WS: 3,
          S: 4,
          AP: 0,
          D: '1',
          keywords: []
        },
        attacker: {
          id: 'attacker-1',
          name: 'Tyranid Warrior',
          categories: ['Infantry', 'Tyranids'],
          isLeader: false
        },
        defender: {
          id: 'defender-1',
          name: 'Dreadnought',
          categories: ['Vehicle', 'Adeptus Astartes'],
          T: 9,
          SV: 2,
          W: 8
        },
        armyStates: [
          {
            id: 'state-1',
            armyId: 'tyranid-army',
            state: 'hyper-adaptations',
            choiceValue: 'swarming-instincts',
            activatedTurn: 1
          }
        ],
        combatRole: 'attacker'
      });

      const applied = evaluateRule(hyperAdaptationsRule, context);
      // Rule evaluates but doesn't apply effects due to targetCategory condition
      expect(applied).toBe(true);

      // Should not have added SUSTAINED HITS
      const addedKeywords = getAddedKeywords(context);
      const hasSustainedHits = addedKeywords.some(kw =>
        kw.toLowerCase().includes('sustained') && kw.toLowerCase().includes('hits')
      );
      expect(hasSustainedHits).toBe(false);
    });

    it('should not apply when no choice has been made', () => {
      const context = createTestContext({
        weapon: {
          name: 'Test Weapon',
          range: 24,
          A: '2',
          WS: 3,
          S: 4,
          AP: 0,
          D: '1',
          keywords: []
        },
        attacker: {
          id: 'attacker-1',
          name: 'Tyranid Warrior',
          categories: ['Infantry', 'Tyranids'],
          isLeader: false
        },
        defender: {
          id: 'defender-1',
          name: 'Space Marine',
          categories: ['Infantry', 'Adeptus Astartes'],
          T: 4,
          SV: 3,
          W: 2
        },
        armyStates: [], // No choice made
        combatRole: 'attacker'
      });

      const applied = evaluateRule(hyperAdaptationsRule, context);
      expect(applied).toBe(false);
    });
  });

  describe('Oath of Moment - Enemy Unit Targeting', () => {
    const oathRule = TEST_RULES.find(r => r.name === 'oath-of-moment')?.rule;

    if (!oathRule) {
      throw new Error('oath-of-moment rule not found in TEST_RULES');
    }

    it('should be a passive rule with army scope', () => {
      expect(oathRule.kind).toBe('passive');
      expect(oathRule.scope).toBe('army');
    });

    it('should have isTargetedUnit condition', () => {
      expect(oathRule.when).toEqual({ t: 'isTargetedUnit' });
    });

    it('should apply reroll hits and +1 to wound when targeting the oath target', () => {
      const targetUnitId = 'enemy-unit-123';

      const context = createTestContext({
        weapon: {
          name: 'Bolt Rifle',
          range: 24,
          A: '2',
          WS: 3,
          S: 4,
          AP: -1,
          D: '1',
          keywords: []
        },
        attacker: {
          id: 'attacker-1',
          name: 'Tactical Marine',
          categories: ['Infantry', 'Adeptus Astartes'],
          isLeader: false
        },
        defender: {
          id: targetUnitId,
          unitId: targetUnitId,
          name: 'Ork Warboss',
          categories: ['Character', 'Orks'],
          T: 5,
          SV: 4,
          W: 6
        },
        armyStates: [
          {
            id: 'oath-state-1',
            armyId: 'space-marine-army',
            state: 'oath-of-moment',
            targetUnitId: targetUnitId,
            activatedTurn: 1,
            expiresPhase: 'command'
          }
        ],
        combatRole: 'attacker'
      });

      const applied = evaluateRule(oathRule, context);
      expect(applied).toBe(true);

      // Check for reroll modifier (format is "reroll:hit:failed")
      const allModifiers = context.modifiers.getAllModifiers();
      const hasReroll = Array.from(allModifiers.keys()).some(key =>
        key.startsWith('reroll:hit')
      );
      expect(hasReroll).toBe(true);

      // Check for +1 to wound modifier
      const woundModifiers = context.modifiers.getModifiers('wound');
      expect(woundModifiers.length).toBeGreaterThan(0);
      expect(woundModifiers[0].value).toBe(1);
    });

    it('should not apply when targeting a different unit', () => {
      const targetUnitId = 'enemy-unit-123';
      const otherUnitId = 'enemy-unit-456';

      const context = createTestContext({
        weapon: {
          name: 'Bolt Rifle',
          range: 24,
          A: '2',
          WS: 3,
          S: 4,
          AP: -1,
          D: '1',
          keywords: []
        },
        attacker: {
          id: 'attacker-1',
          name: 'Tactical Marine',
          categories: ['Infantry', 'Adeptus Astartes'],
          isLeader: false
        },
        defender: {
          id: otherUnitId,
          unitId: otherUnitId,
          name: 'Ork Boy',
          categories: ['Infantry', 'Orks'],
          T: 4,
          SV: 6,
          W: 1
        },
        armyStates: [
          {
            id: 'oath-state-1',
            armyId: 'space-marine-army',
            state: 'oath-of-moment',
            targetUnitId: targetUnitId, // Different from defender
            activatedTurn: 1,
            expiresPhase: 'command'
          }
        ],
        combatRole: 'attacker'
      });

      const applied = evaluateRule(oathRule, context);
      expect(applied).toBe(false);

      // Should have no wound modifiers
      const woundModifiers = context.modifiers.getModifiers('wound');
      expect(woundModifiers.length).toBe(0);
    });

    it('should not apply when no target is set', () => {
      const context = createTestContext({
        weapon: {
          name: 'Bolt Rifle',
          range: 24,
          A: '2',
          WS: 3,
          S: 4,
          AP: -1,
          D: '1',
          keywords: []
        },
        attacker: {
          id: 'attacker-1',
          name: 'Tactical Marine',
          categories: ['Infantry', 'Adeptus Astartes'],
          isLeader: false
        },
        defender: {
          id: 'enemy-unit-123',
          name: 'Ork Warboss',
          categories: ['Character', 'Orks'],
          T: 5,
          SV: 4,
          W: 6
        },
        armyStates: [], // No oath target set
        combatRole: 'attacker'
      });

      const applied = evaluateRule(oathRule, context);
      expect(applied).toBe(false);
    });
  });
});
