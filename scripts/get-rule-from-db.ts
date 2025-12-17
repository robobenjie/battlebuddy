/**
 * Fetch and display a rule from the database by ID or name pattern
 *
 * Usage:
 *   npx tsx scripts/get-rule-from-db.ts <rule-id-or-pattern>
 *
 * Examples:
 *   npx tsx scripts/get-rule-from-db.ts super-runts
 *   npx tsx scripts/get-rule-from-db.ts "might.*right"
 */

import { init } from "@instantdb/admin";

const adminDb = init({
  appId: process.env.NEXT_PUBLIC_INSTANT_APP_ID!,
  adminToken: process.env.INSTANT_APP_ADMIN_TOKEN!,
});

async function getRuleFromDb(searchTerm: string) {
  console.log(`\n🔍 Searching for rules matching: "${searchTerm}"\n`);

  // Query all units with their rules
  const { units } = await adminDb.query({
    units: {
      unitRules: {},
      models: {
        modelRules: {}
      }
    }
  });

  // Extract all rules from units
  const allRules: any[] = [];

  units?.forEach((unit: any) => {
    // Add unit-level rules
    unit.unitRules?.forEach((rule: any) => {
      allRules.push({
        ...rule,
        source: 'unitRule',
        unitName: unit.name,
        unitId: unit.id
      });
    });

    // Add model-level rules
    unit.models?.forEach((model: any) => {
      model.modelRules?.forEach((rule: any) => {
        allRules.push({
          ...rule,
          source: 'modelRule',
          unitName: unit.name,
          unitId: unit.id,
          modelId: model.id
        });
      });
    });
  });

  console.log(`📊 Total rules in database: ${allRules.length}\n`);

  // Try exact ID match first
  const exactMatch = allRules.find((r: any) => r.id === searchTerm);

  if (exactMatch) {
    console.log(`✅ Found exact match by ID: ${exactMatch.id}\n`);
    displayRule(exactMatch);
    return;
  }

  // Try regex pattern match on ID and name
  const pattern = new RegExp(searchTerm, 'i');
  const matches = allRules.filter((r: any) =>
    pattern.test(r.id || '') ||
    pattern.test(r.name || '')
  );

  if (matches.length === 0) {
    console.log(`❌ No rules found matching: "${searchTerm}"`);
    console.log('\nTry a different search term or pattern.\n');
    return;
  }

  if (matches.length === 1) {
    console.log(`✅ Found 1 matching rule:\n`);
    displayRule(matches[0]);
    return;
  }

  console.log(`✅ Found ${matches.length} matching rules:\n`);
  matches.forEach((rule: any, idx: number) => {
    console.log(`${idx + 1}. ${rule.name} (id: ${rule.id}, source: ${rule.source})`);
  });
  console.log('\n📋 Showing first match:\n');
  displayRule(matches[0]);
  console.log(`\n💡 To see other matches, use a more specific search term.\n`);
}

function displayRule(rule: any) {
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`Rule: ${rule.name}`);
  console.log(`ID: ${rule.id}`);
  console.log(`Source: ${rule.source}`);
  console.log(`Unit: ${rule.unitName} (${rule.unitId})`);
  if (rule.modelId) {
    console.log(`Model: ${rule.modelId}`);
  }
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

  if (rule.ruleObject) {
    try {
      const parsed = JSON.parse(rule.ruleObject);
      console.log('Rule Object (parsed):');
      console.log(JSON.stringify(parsed, null, 2));
    } catch (e) {
      console.log('Rule Object (raw):');
      console.log(rule.ruleObject);
      console.log('\n⚠️  Failed to parse rule object as JSON');
    }
  } else {
    console.log('⚠️  No ruleObject field found');
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

const searchTerm = process.argv[2];

if (!searchTerm) {
  console.log('❌ Usage: npx tsx scripts/get-rule-from-db.ts <rule-id-or-pattern>');
  console.log('\nExamples:');
  console.log('  npx tsx scripts/get-rule-from-db.ts super-runts');
  console.log('  npx tsx scripts/get-rule-from-db.ts "might.*right"');
  process.exit(1);
}

getRuleFromDb(searchTerm).catch(console.error);
