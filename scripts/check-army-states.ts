import { init } from "@instantdb/admin";

const adminDb = init({
  appId: '446ec6c8-b282-4737-9d7c-95521a0336e7',
  adminToken: process.env.INSTANT_APP_ADMIN_TOKEN!,
});

async function checkArmyStates() {
  console.log('🔍 Checking army states in database...\n');

  const { armyStates } = await adminDb.query({
    armyStates: {}
  });

  console.log(`Found ${armyStates.length} army states:`);
  armyStates.forEach((state: any) => {
    console.log(`  - ${state.state} (armyId: ${state.armyId}, id: ${state.id})`);
  });

  if (armyStates.length === 0) {
    console.log('\n❌ No army states found in database!');
    console.log('💡 This explains why the rules are not applying.');
  }

  // Also check armies
  const { armies } = await adminDb.query({
    armies: {
      states: {}
    }
  });

  console.log(`\nFound ${armies.length} armies:`);
  armies.forEach((army: any) => {
    console.log(`  - ${army.name} (id: ${army.id})`);
    console.log(`    gameId: ${army.gameId || 'none (template)'}`);
    console.log(`    Army states: ${army.states?.length || 0}`);
    if (army.states && army.states.length > 0) {
      army.states.forEach((state: any) => {
        console.log(`      - ${state.state}`);
      });
    }
  });

  // Cross-reference: which armyIds have states?
  console.log('\n📊 Cross-reference check:');
  armyStates.forEach((state: any) => {
    const army = armies.find((a: any) => a.id === state.armyId);
    console.log(`  State "${state.state}" → armyId: ${state.armyId}`);
    if (army) {
      console.log(`    ✅ Army found: ${army.name} (gameId: ${army.gameId || 'none'})`);
    } else {
      console.log(`    ❌ No army found with this ID`);
    }
  });
}

checkArmyStates();
