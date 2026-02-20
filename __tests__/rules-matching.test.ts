import { describe, expect, it } from 'vitest';
import { matchRuleToImplementation, ImportedRule } from '../lib/rules-matching';

describe('matchRuleToImplementation', () => {
  it('matches Tank Hunters import to Tank Hunter implementation', () => {
    const importedRule: ImportedRule = {
      name: 'Tank Hunters',
      rawText: 'Each time this model makes a ranged attack that targets a VEHICLE unit, re-roll a Wound roll of 1.',
      battlescribeId: 'test-id',
      scope: 'unit'
    };

    const matched = matchRuleToImplementation(importedRule, 'Orks', [
      {
        faction: 'Orks',
        scope: 'unit',
        ruleObject: JSON.stringify({
          id: 'tank-hunters-orks',
          name: 'Tank Hunter',
          faction: 'Orks',
          scope: 'unit'
        })
      }
    ]);
    expect(matched).toBeDefined();
    expect(matched?.id).toBe('tank-hunters-orks');
  });

  it('does not cross-match unrelated names', () => {
    const importedRule: ImportedRule = {
      name: 'Completely Different Rule',
      rawText: 'No-op',
      battlescribeId: 'test-id-2',
      scope: 'unit'
    };

    const matched = matchRuleToImplementation(importedRule, 'Orks', [
      {
        faction: 'Orks',
        scope: 'unit',
        ruleObject: JSON.stringify({
          id: 'tank-hunters-orks',
          name: 'Tank Hunter',
          faction: 'Orks',
          scope: 'unit'
        })
      }
    ]);
    expect(matched).toBeNull();
  });
});
