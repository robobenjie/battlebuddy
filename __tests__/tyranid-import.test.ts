/**
 * Test importing Tyranid army with Hyper Adaptations
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import { extractRulesFromSourceData } from '../lib/rules-matching';

describe('Tyranid Army Import', () => {
  it('should extract Hyper Adaptations from tiny_nids.json', () => {
    // Read the tiny_nids.json file
    const filePath = join(process.cwd(), 'test_data', 'tiny_nids.json');
    const sourceData = readFileSync(filePath, 'utf-8');

    // Extract rules from the source data
    const extractedRules = extractRulesFromSourceData(sourceData);

    // Check that we found army rules
    expect(extractedRules.armyRules.length).toBeGreaterThan(0);

    // Look for Hyper Adaptations (or Hyper Adaptions - check spelling)
    const hyperAdaptations = extractedRules.armyRules.find(
      rule => rule.name.toLowerCase().includes('hyper adapt')
    );

    expect(hyperAdaptations).toBeDefined();
    expect(hyperAdaptations?.name).toMatch(/hyper adapt/i);
    expect(hyperAdaptations?.rawText).toBeTruthy();
    expect(hyperAdaptations?.battlescribeId).toBeTruthy();
    expect(hyperAdaptations?.scope).toBe('army');

    // Log all army rules for debugging
    console.log('Found army rules:');
    extractedRules.armyRules.forEach(rule => {
      console.log(`  - ${rule.name} (scope: ${rule.scope})`);
    });
  });

  it('should extract army rules from both force.rules and force.selections', () => {
    const filePath = join(process.cwd(), 'test_data', 'tiny_nids.json');
    const sourceData = readFileSync(filePath, 'utf-8');

    const extractedRules = extractRulesFromSourceData(sourceData);

    // Parse the JSON to check structure
    const roster = JSON.parse(sourceData);
    const force = roster.roster.forces[0];

    console.log('\nForce rules count:', force.rules?.length || 0);
    console.log('Force selections count:', force.selections?.length || 0);

    // Log Configuration selections
    const configSelections = force.selections?.filter((s: any) =>
      s.categories?.some((c: any) => c.name === 'Configuration')
    );
    console.log('Configuration selections:', configSelections?.length || 0);

    configSelections?.forEach((sel: any) => {
      console.log(`  - ${sel.name}`);
      sel.profiles?.forEach((p: any) => {
        console.log(`    - Profile: ${p.name} (type: ${p.typeName})`);
      });
    });

    expect(extractedRules.armyRules.length).toBeGreaterThan(0);
  });
});
