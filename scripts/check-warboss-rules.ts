import { init } from "@instantdb/admin";

const adminDb = init({
  appId: process.env.NEXT_PUBLIC_INSTANT_APP_ID!,
  adminToken: process.env.INSTANT_APP_ADMIN_TOKEN!,
});

async function checkWarbossRules() {
  const { units } = await adminDb.query({
    units: {
      unitRules: {},
      models: {
        modelRules: {},
      },
    },
  });

  console.log(`Found ${units.length} units\n`);

  const warbossUnits = units.filter((u: any) => u.name?.toLowerCase().includes('warboss'));

  warbossUnits.forEach((unit: any) => {
    console.log(`\n🔍 Unit: ${unit.name} (${unit.id})`);
    console.log(`   Game ID: ${unit.gameId || 'none (template)'}`);

    if (unit.unitRules && unit.unitRules.length > 0) {
      console.log(`\n   Unit Rules (${unit.unitRules.length}):`);
      unit.unitRules.forEach((rule: any) => {
        const ruleObj = JSON.parse(rule.ruleObject || '{}');
        console.log(`     - ${rule.name} (id: ${ruleObj.id || 'none'}, scope: ${ruleObj.scope || 'MISSING'})`);
      });
    } else {
      console.log(`\n   Unit Rules: NONE`);
    }

    if (unit.models && unit.models.length > 0) {
      console.log(`\n   Models (${unit.models.length}):`);
      unit.models.forEach((model: any, idx: number) => {
        console.log(`     Model ${idx + 1} (${model.id}):`);
        if (model.modelRules && model.modelRules.length > 0) {
          model.modelRules.forEach((rule: any) => {
            const ruleObj = JSON.parse(rule.ruleObject || '{}');
            console.log(`       - ${rule.name} (id: ${ruleObj.id || 'none'}, scope: ${ruleObj.scope || 'MISSING'})`);
          });
        } else {
          console.log(`       (no model rules)`);
        }
      });
    }
  });
}

checkWarbossRules().catch(console.error);
