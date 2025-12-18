/**
 * Validation test for migrated rules against new schema
 */
import { describe, it, expect } from 'vitest';
import { RuleSchema } from '../rule-schema';
import testRules from '../test-rules.json';

describe('New schema validation', () => {
  it('should validate all migrated rules against new schema', () => {
    const failures: Array<{name: string; issues: any}> = [];

    testRules.rules.forEach((testRule) => {
      const result = RuleSchema.safeParse(testRule.rule);
      if (!result.success) {
        failures.push({
          name: testRule.name,
          issues: result.error.issues
        });
      }
    });

    if (failures.length > 0) {
      console.log('\n❌ Validation failures:');
      failures.forEach(f => {
        console.log(`\n  ${f.name}:`);
        console.log(JSON.stringify(f.issues, null, 4));
      });
    }

    expect(failures).toHaveLength(0);
  });

  it('should have all expected example rules', () => {
    const exampleRules = testRules.rules.filter(r => r.isExample);
    // As we migrate, we'll update this count
    expect(exampleRules.length).toBeGreaterThan(0);
  });

  it('should have unique rule IDs', () => {
    const ids = testRules.rules.map(r => r.rule.id);
    const uniqueIds = new Set(ids);
    expect(ids.length).toBe(uniqueIds.size);
  });
});
