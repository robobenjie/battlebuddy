import { init } from "@instantdb/admin";

const adminDb = init({
  appId: '446ec6c8-b282-4737-9d7c-95521a0336e7',
  adminToken: process.env.INSTANT_APP_ADMIN_TOKEN!,
});

async function createWaaaghWithLink() {
  const armyId = 'f33d7b1a-f905-4404-a9ac-99cd76af829c'; // Stompy army

  console.log('🔍 Creating Waaagh! state with proper link...');

  // Delete old state (with armyId field)
  console.log('Deleting old state...');
  const { armyStates } = await adminDb.query({
    armyStates: {
      $: {
        where: {
          armyId: armyId
        }
      }
    }
  });

  for (const state of armyStates) {
    await adminDb.transact([
      adminDb.tx.armyStates[state.id].delete()
    ]);
    console.log(`  Deleted old state: ${state.id}`);
  }

  // Create new state using link AND armyId field
  console.log('Creating new state with link...');
  const newStateId = crypto.randomUUID();
  await adminDb.transact([
    adminDb.tx.armyStates[newStateId].update({
      state: 'waaagh-active',
      activatedTurn: 1,
      armyId: armyId, // Still need this field
    }).link({ army: armyId })
  ]);

  console.log(`✅ Created new Waaagh! state: ${newStateId}`);

  // Verify it works
  console.log('\n🔍 Verifying the link works...');
  const { armies } = await adminDb.query({
    armies: {
      states: {},
      $: {
        where: {
          id: armyId
        }
      }
    }
  });

  const army = armies[0];
  console.log(`Army: ${army.name}`);
  console.log(`States: ${army.states?.length || 0}`);
  if (army.states && army.states.length > 0) {
    army.states.forEach((s: any) => {
      console.log(`  - ${s.state}`);
    });
    console.log('\n✅ SUCCESS! The link is working!');
  } else {
    console.log('\n❌ Still not working...');
  }
}

createWaaaghWithLink();
