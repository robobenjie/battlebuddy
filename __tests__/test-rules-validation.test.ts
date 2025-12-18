/**
 * Validation tests for all test rules
 *
 * This test ensures that all rules in test-rules.json are valid
 * and comply with the Zod schema. This is critical for detecting
 * breaking changes when the schema is modified.
 */

import { describe, it, expect } from 'vitest';
import { RuleSchema } from '../lib/rules-engine/rule-schema';
import { TEST_RULES, EXAMPLE_RULES, EXAMPLE_EXPLANATIONS, ALL_TEST_RULES } from '../lib/rules-engine/test-rules';

describe('Test Rules Validation', () => {
  it('should validate all test rules against Zod schema', () => {
    const invalidRules: Array<{ name: string; errors: string[] }> = [];

    for (const testRule of TEST_RULES) {
      const result = RuleSchema.safeParse(testRule.rule);

      if (!result.success) {
        invalidRules.push({
          name: testRule.name,
          errors: result.error.errors.map(e => `${e.path.join('.')}: ${e.message}`)
        });
      }
    }

    if (invalidRules.length > 0) {
      console.error('❌ Invalid rules found:');
      invalidRules.forEach(({ name, errors }) => {
        console.error(`\n  ${name}:`);
        errors.forEach(err => console.error(`    - ${err}`));
      });
    }

    expect(invalidRules).toHaveLength(0);
  });

  it('should have no duplicate rule IDs', () => {
    const ruleIds = ALL_TEST_RULES.map(r => r.id);
    const duplicates = ruleIds.filter((id, index) => ruleIds.indexOf(id) !== index);

    if (duplicates.length > 0) {
      console.error('❌ Duplicate rule IDs found:', duplicates);
    }

    expect(duplicates).toHaveLength(0);
  });

  it('should have explanations for all example rules', () => {
    const missingExplanations = EXAMPLE_RULES
      .map(r => r.id)
      .filter(id => !EXAMPLE_EXPLANATIONS[id] || EXAMPLE_EXPLANATIONS[id].trim() === '');

    if (missingExplanations.length > 0) {
      console.error('❌ Example rules missing explanations:', missingExplanations);
    }

    expect(missingExplanations).toHaveLength(0);
  });

  it('should have at least one example rule', () => {
    expect(EXAMPLE_RULES.length).toBeGreaterThan(0);
  });

  it('should properly categorize isExample flag', () => {
    const exampleCount = TEST_RULES.filter(r => r.isExample).length;
    expect(exampleCount).toBe(EXAMPLE_RULES.length);
  });
});
