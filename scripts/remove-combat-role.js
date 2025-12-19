#!/usr/bin/env node
/**
 * Script to remove combatRole conditions from test-rules.json
 */

const fs = require('fs');
const path = require('path');

const testRulesPath = path.join(__dirname, '../lib/rules-engine/test-rules.json');
const testRules = JSON.parse(fs.readFileSync(testRulesPath, 'utf8'));

function removeCombatRoleFromWhen(when) {
  if (!when || typeof when !== 'object') return when;

  // If this is a combatRole condition, return true (remove the condition)
  if (when.t === 'combatRole') {
    return { t: 'true' };
  }

  // If this is an 'all' operator, filter out combatRole conditions
  if (when.t === 'all' && Array.isArray(when.xs)) {
    const filtered = when.xs
      .map(removeCombatRoleFromWhen)
      .filter(x => x.t !== 'true'); // Remove true conditions from all

    // If all conditions were removed, return true
    if (filtered.length === 0) return { t: 'true' };

    // If only one condition left, unwrap it
    if (filtered.length === 1) return filtered[0];

    // Otherwise return the filtered list
    return { t: 'all', xs: filtered };
  }

  // If this is an 'any' operator, process recursively
  if (when.t === 'any' && Array.isArray(when.xs)) {
    return { t: 'any', xs: when.xs.map(removeCombatRoleFromWhen) };
  }

  // If this is a 'not' operator, process recursively
  if (when.t === 'not') {
    return { t: 'not', x: removeCombatRoleFromWhen(when.x) };
  }

  // If this is an 'if' block, process the when clause
  if (when.t === 'if') {
    return {
      ...when,
      when: removeCombatRoleFromWhen(when.when),
      then: when.then.map(removeFromBlock)
    };
  }

  return when;
}

function removeFromBlock(block) {
  if (!block || typeof block !== 'object') return block;

  if (block.t === 'if') {
    return {
      ...block,
      when: removeCombatRoleFromWhen(block.when),
      then: block.then.map(removeFromBlock)
    };
  }

  return block;
}

function processRule(rule) {
  if (!rule) return rule;

  const processed = { ...rule };

  // Process when clause
  if (processed.when) {
    processed.when = removeCombatRoleFromWhen(processed.when);
  }

  // Process then blocks
  if (processed.then && Array.isArray(processed.then)) {
    processed.then = processed.then.map(removeFromBlock);
  }

  return processed;
}

// Process all test rules
let modifiedCount = 0;
const original = JSON.stringify(testRules, null, 2);

testRules.rules = testRules.rules.map(testRule => {
  const originalRule = JSON.stringify(testRule.rule);
  const processed = { ...testRule, rule: processRule(testRule.rule) };
  if (JSON.stringify(processed.rule) !== originalRule) {
    modifiedCount++;
    console.log(`Modified rule: ${testRule.name} (${testRule.rule.id})`);
  }
  return processed;
});

// Write back to file
fs.writeFileSync(testRulesPath, JSON.stringify(testRules, null, 2) + '\n', 'utf8');

console.log(`\n✅ Removed combatRole conditions from ${modifiedCount} rules`);
console.log(`📝 Updated: ${testRulesPath}`);
