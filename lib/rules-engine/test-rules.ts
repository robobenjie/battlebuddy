/**
 * Centralized test rules fixture
 *
 * This file loads all test rules from test-rules.json and provides
 * convenient exports for use in tests and the OpenAI API route.
 *
 * All rules are validated against the Zod schema in the validation test.
 */

import { Rule } from './types';
import testRulesData from './test-rules.json';

export interface TestRule {
  name: string;
  isExample: boolean;
  exampleReason: string;
  rule: Rule;
}

/**
 * All test rules (both examples and test-specific rules)
 */
export const TEST_RULES: TestRule[] = testRulesData.rules as any;

/**
 * Example rules used for OpenAI training
 * (Only rules with isExample: true)
 */
export const EXAMPLE_RULES: Rule[] = TEST_RULES
  .filter(r => r.isExample)
  .map(r => r.rule);

/**
 * Explanations for why each example was included
 * (Maps rule ID to explanation)
 */
export const EXAMPLE_EXPLANATIONS: Record<string, string> = TEST_RULES
  .filter(r => r.isExample)
  .reduce((acc, r) => {
    acc[r.rule.id] = r.exampleReason;
    return acc;
  }, {} as Record<string, string>);

/**
 * All rules (for comprehensive testing)
 */
export const ALL_TEST_RULES: Rule[] = TEST_RULES.map(r => r.rule);

/**
 * Get a specific test rule by name
 */
export function getTestRule(name: string): Rule | undefined {
  const testRule = TEST_RULES.find(r => r.name === name);
  return testRule?.rule;
}

/**
 * Get multiple test rules by names
 */
export function getTestRules(names: string[]): Rule[] {
  return names
    .map(name => getTestRule(name))
    .filter((rule): rule is Rule => rule !== undefined);
}

/**
 * Get all example rules (convenience alias)
 */
export function getExampleRules(): Rule[] {
  return EXAMPLE_RULES;
}

/**
 * Get all test-specific rules (not examples)
 */
export function getTestOnlyRules(): Rule[] {
  return TEST_RULES
    .filter(r => !r.isExample)
    .map(r => r.rule);
}
