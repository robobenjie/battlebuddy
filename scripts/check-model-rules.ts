import { init } from "@instantdb/admin";

const adminDb = init({
  appId: process.env.NEXT_PUBLIC_INSTANT_APP_ID!,
  adminToken: process.env.INSTANT_APP_ADMIN_TOKEN!,
});

async function checkArmyTemplates() {
  // Get all template armies (no gameId)
  const { armies } = await adminDb.query({
    armies: {
      armyRules: {},
      units: {
        unitRules: {},
        models: {
          modelRules: {},
        },
      },
    },
  });

  console.log(`Found ${armies.length} armies`);

  armies.forEach((army: any) => {
    const isTemplate = !army.gameId;
    const ruleCount = (army.armyRules?.length || 0) +
                     (army.units?.reduce((sum: number, u: any) => sum + (u.unitRules?.length || 0), 0) || 0) +
                     (army.units?.reduce((sum: number, u: any) =>
                       sum + (u.models?.reduce((msum: number, m: any) => msum + (m.modelRules?.length || 0), 0) || 0), 0) || 0);

    console.log(`\n${isTemplate ? '📋 TEMPLATE' : '🎮 GAME'} Army: ${army.name} (${army.id})`);
    console.log(`  Faction: ${army.faction}`);
    console.log(`  Game ID: ${army.gameId || 'none (template)'}`);
    console.log(`  Army Rules: ${army.armyRules?.length || 0}`);
    console.log(`  Total Rules: ${ruleCount}`);

    if (isTemplate && army.units) {
      console.log(`  Units: ${army.units.length}`);
      army.units.forEach((unit: any) => {
        const unitRules = unit.unitRules?.length || 0;
        const modelRules = unit.models?.reduce((sum: number, m: any) => sum + (m.modelRules?.length || 0), 0) || 0;
        if (unitRules > 0 || modelRules > 0) {
          console.log(`    - ${unit.name}: ${unitRules} unit rules, ${modelRules} model rules`);
        }
      });
    }
  });
}

checkArmyTemplates();
