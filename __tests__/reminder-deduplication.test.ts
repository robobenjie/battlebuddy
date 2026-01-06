/**
 * Test that reminder tags are deduplicated on unit cards
 *
 * Issue: When a rule has multiple abilities (e.g., applies in both movement and charge phases),
 * the yellow reminder tag should only appear once on the unit card, not once per phase.
 */

import { describe, it, expect } from 'vitest';
import { getUnitReminders, deduplicateRemindersByName } from '../lib/rules-engine/reminder-utils';

describe('Reminder Tag Deduplication', () => {
  it('should not show duplicate reminder tags for rules with multiple phases', () => {
    // Create a unit with the "Wild Ride" rule that applies in both movement and charge phases
    const unit = {
      id: 'test-unit',
      name: 'Test Unit',
      unitRules: [
        {
          id: 'wild-ride-rule',
          name: 'Wild Ride',
          ruleObject: JSON.stringify({
            id: 'wild-ride',
            name: 'Wild Ride',
            description: 'You can ignore any or all modifiers to this unit\'s Move characteristic and to Advance and Charge rolls made for this unit.',
            faction: 'Orks',
            scope: 'unit',
            trigger: {
              t: 'manual',
              phase: ['movement', 'charge'],
              turn: 'own',
              limit: 'none'
            },
            when: {
              t: 'true'
            },
            kind: 'reminder'
          })
        }
      ]
    };

    // Get reminders for movement phase
    const movementReminders = getUnitReminders(unit, 'movement', 'own');

    // Get reminders for charge phase
    const chargeReminders = getUnitReminders(unit, 'charge', 'own');

    // Both should return the same rule
    expect(movementReminders).toHaveLength(1);
    expect(chargeReminders).toHaveLength(1);
    expect(movementReminders[0].id).toBe('wild-ride');
    expect(chargeReminders[0].id).toBe('wild-ride');

    // When displayed on a unit card in movement phase, we should only see one badge
    const reminderIds = movementReminders.map(r => r.id);
    const uniqueReminderIds = [...new Set(reminderIds)];

    expect(reminderIds.length).toBe(uniqueReminderIds.length);
  });

  it('should deduplicate reminders with the same name but different IDs (like Waaagh!)', () => {
    // Create a unit with multiple Waaagh! rules that trigger in the same phase
    // This simulates the real Waaagh! ability which is split into multiple rules
    const unit = {
      id: 'test-unit',
      name: 'Ork Boyz',
      unitRules: [
        {
          id: 'waaagh-strength',
          name: 'Waaagh! Strength',
          ruleObject: JSON.stringify({
            id: 'waaagh-strength',
            name: 'Waaagh!',
            description: 'Add 1 to Strength',
            faction: 'Orks',
            scope: 'unit',
            trigger: {
              t: 'automatic',
              phase: 'fight',
              turn: 'both',
              limit: 'none'
            },
            when: { t: 'armyState', is: ['waaagh-active'] },
            kind: 'reminder'
          })
        },
        {
          id: 'waaagh-attacks',
          name: 'Waaagh! Attacks',
          ruleObject: JSON.stringify({
            id: 'waaagh-attacks',
            name: 'Waaagh!',
            description: 'Add 1 to Attacks',
            faction: 'Orks',
            scope: 'unit',
            trigger: {
              t: 'automatic',
              phase: 'fight',
              turn: 'both',
              limit: 'none'
            },
            when: { t: 'armyState', is: ['waaagh-active'] },
            kind: 'reminder'
          })
        },
        {
          id: 'waaagh-toughness',
          name: 'Waaagh! Toughness',
          ruleObject: JSON.stringify({
            id: 'waaagh-toughness',
            name: 'Waaagh!',
            description: 'Add 1 to Toughness',
            faction: 'Orks',
            scope: 'unit',
            trigger: {
              t: 'automatic',
              phase: 'fight',
              turn: 'both',
              limit: 'none'
            },
            when: { t: 'armyState', is: ['waaagh-active'] },
            kind: 'reminder'
          })
        }
      ]
    };

    const armyStates = [{ state: 'waaagh-active', armyId: 'ork-army', id: 'state-1', activatedTurn: 1 }];
    const reminders = getUnitReminders(unit, 'fight', 'both', armyStates);

    // Should see 3 rules (they all have different IDs)
    expect(reminders.length).toBe(3);

    // But they all have the same NAME
    const names = reminders.map(r => r.name);
    expect(names).toEqual(['Waaagh!', 'Waaagh!', 'Waaagh!']);

    // When we deduplicate by name for display, we should only show 1 badge
    const deduplicated = deduplicateRemindersByName(reminders);
    expect(deduplicated.length).toBe(1);
    expect(deduplicated[0].name).toBe('Waaagh!');

    // The combined description should contain info from all 3 rules
    expect(deduplicated[0].description).toContain('Add 1 to Strength');
    expect(deduplicated[0].description).toContain('Add 1 to Attacks');
    expect(deduplicated[0].description).toContain('Add 1 to Toughness');
  });

  it('should deduplicate reminders that come from multiple sources (unit + model + weapon)', () => {
    // Create a unit where the same rule appears on unit, model, and weapon
    const unit = {
      id: 'test-unit',
      name: 'Test Unit',
      unitRules: [
        {
          id: 'test-rule',
          name: 'Test Rule',
          ruleObject: JSON.stringify({
            id: 'shared-rule',
            name: 'Shared Rule',
            description: 'This rule appears everywhere',
            faction: 'Test',
            scope: 'unit',
            trigger: {
              t: 'automatic',
              phase: 'shooting',
              turn: 'own',
              limit: 'none'
            },
            when: { t: 'true' },
            kind: 'reminder'
          })
        }
      ],
      models: [
        {
          id: 'model-1',
          name: 'Test Model',
          modelRules: [
            {
              id: 'test-rule',
              name: 'Test Rule',
              ruleObject: JSON.stringify({
                id: 'shared-rule', // Same ID
                name: 'Shared Rule',
                description: 'This rule appears everywhere',
                faction: 'Test',
                scope: 'unit',
                trigger: {
                  t: 'automatic',
                  phase: 'shooting',
                  turn: 'own',
                  limit: 'none'
                },
                when: { t: 'true' },
                kind: 'reminder'
              })
            }
          ],
          weapons: [
            {
              id: 'weapon-1',
              name: 'Test Weapon',
              weaponRules: [
                {
                  id: 'test-rule',
                  name: 'Test Rule',
                  ruleObject: JSON.stringify({
                    id: 'shared-rule', // Same ID again
                    name: 'Shared Rule',
                    description: 'This rule appears everywhere',
                    faction: 'Test',
                    scope: 'unit',
                    trigger: {
                      t: 'automatic',
                      phase: 'shooting',
                      turn: 'own',
                      limit: 'none'
                    },
                    when: { t: 'true' },
                    kind: 'reminder'
                  })
                }
              ]
            }
          ]
        }
      ]
    };

    const reminders = getUnitReminders(unit, 'shooting', 'own');

    // Should only see the rule once, even though it appears in 3 places
    expect(reminders).toHaveLength(1);
    expect(reminders[0].id).toBe('shared-rule');
  });
});
