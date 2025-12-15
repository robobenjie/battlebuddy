/**
 * Test to validate that our Zod schema converts to a valid OpenAI JSON Schema
 */

import { describe, it, expect } from 'vitest';
import { zodResponseFormat } from 'openai/helpers/zod';
import { OpenAIResponseSchema } from '../lib/rules-engine/rule-schema';

describe('OpenAI Schema Compatibility', () => {
  it('should convert RuleSchema to valid OpenAI JSON Schema', () => {
    // Use OpenAI's official zodResponseFormat helper
    const responseFormat = zodResponseFormat(OpenAIResponseSchema, 'rule_implementation');
    const jsonSchema = responseFormat.json_schema.schema;

    console.log('Generated JSON Schema:', JSON.stringify(jsonSchema, null, 2));

    // Check root is object
    expect(jsonSchema.type).toBe('object');

    // Check all required fields are listed
    expect(jsonSchema.required).toContain('implementable');
    expect(jsonSchema.required).toContain('message');
    expect(jsonSchema.required).toContain('rules');

    // Check additionalProperties is false
    expect(jsonSchema.additionalProperties).toBe(false);

    // Check properties exist
    expect(jsonSchema.properties).toBeDefined();
    expect(jsonSchema.properties.implementable).toBeDefined();
    expect(jsonSchema.properties.message).toBeDefined();
    expect(jsonSchema.properties.rules).toBeDefined();
  });

  it('should not contain unsupported keywords', () => {
    const responseFormat = zodResponseFormat(OpenAIResponseSchema, 'rule_implementation');
    const jsonSchema = responseFormat.json_schema.schema;

    const schemaString = JSON.stringify(jsonSchema);

    // Check for unsupported keywords
    expect(schemaString).not.toContain('allOf');
    expect(schemaString).not.toContain('oneOf');
    expect(schemaString).not.toContain('not');
  });

  it('should have additionalProperties: false on all nested objects', () => {
    const responseFormat = zodResponseFormat(OpenAIResponseSchema, 'rule_implementation');
    const jsonSchema = responseFormat.json_schema.schema;

    // Recursively check all objects have additionalProperties: false
    function checkObjects(obj: any, path: string = 'root') {
      if (typeof obj !== 'object' || obj === null) return;

      if (obj.type === 'object' && obj.properties) {
        if (obj.additionalProperties !== false) {
          console.error(`Missing additionalProperties: false at ${path}`);
        }
        expect(obj.additionalProperties).toBe(false);

        // Check nested properties
        for (const [key, value] of Object.entries(obj.properties)) {
          checkObjects(value, `${path}.${key}`);
        }
      }

      if (obj.type === 'array' && obj.items) {
        checkObjects(obj.items, `${path}[]`);
      }

      if (obj.anyOf) {
        obj.anyOf.forEach((branch: any, i: number) => {
          checkObjects(branch, `${path}.anyOf[${i}]`);
        });
      }
    }

    checkObjects(jsonSchema);
  });
});
