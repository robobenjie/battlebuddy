/**
 * Validate all ruleObject payloads in InstantDB against RuleSchema.
 *
 * Usage:
 *   set -a; source .env.local; set +a
 *   npm run validate:db-rules
 */

import { init } from '@instantdb/admin';
import { z } from 'zod';
import { RuleSchema } from '../lib/rules-engine/rule-schema';

const appId = process.env.NEXT_PUBLIC_INSTANT_APP_ID;
const adminToken = process.env.INSTANT_APP_ADMIN_TOKEN;

if (!appId || !adminToken) {
  console.error(
    'Missing NEXT_PUBLIC_INSTANT_APP_ID or INSTANT_APP_ADMIN_TOKEN. ' +
      'Load your env first (e.g. `set -a; source .env.local; set +a`).'
  );
  process.exit(1);
}

const adminDb = init({ appId, adminToken });

function summarizeZodError(error: z.ZodError): string {
  return error.issues
    .slice(0, 5)
    .map((issue) => {
      const path = issue.path.length > 0 ? issue.path.join('.') : '(root)';
      return `${path}: ${issue.message}`;
    })
    .join(' | ');
}

async function validateDbRules() {
  const { rules } = await adminDb.query({
    rules: {}
  });

  const allRules = rules || [];
  let validCount = 0;
  let invalidCount = 0;
  let missingRuleObjectCount = 0;
  let parseErrorCount = 0;

  console.log(`Found ${allRules.length} rules in DB.`);

  for (const ruleRow of allRules as any[]) {
    if (!ruleRow.ruleObject) {
      missingRuleObjectCount += 1;
      continue;
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(ruleRow.ruleObject);
    } catch {
      parseErrorCount += 1;
      invalidCount += 1;
      console.log(`\n[INVALID JSON] ${ruleRow.name} (${ruleRow.id})`);
      continue;
    }

    const candidateRules = Array.isArray(parsed) ? parsed : [parsed];
    let rowValid = true;

    for (const candidate of candidateRules) {
      const result = RuleSchema.safeParse(candidate);
      if (!result.success) {
        rowValid = false;
        invalidCount += 1;
        console.log(`\n[INVALID SCHEMA] ${ruleRow.name} (${ruleRow.id})`);
        console.log(summarizeZodError(result.error));
        break;
      }
    }

    if (rowValid) {
      validCount += 1;
    }
  }

  console.log('\nValidation Summary');
  console.log(`- Total rows: ${allRules.length}`);
  console.log(`- Valid rows: ${validCount}`);
  console.log(`- Missing ruleObject: ${missingRuleObjectCount}`);
  console.log(`- Invalid JSON: ${parseErrorCount}`);
  console.log(`- Invalid schema rows: ${invalidCount}`);

  if (invalidCount > 0) {
    process.exit(1);
  }
}

validateDbRules().catch((error) => {
  console.error('Validation script failed:', error);
  process.exit(1);
});

