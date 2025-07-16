import { init } from '@instantdb/react';

// App ID from InstantDB
const APP_ID = '446ec6c8-b282-4737-9d7c-95521a0336e7';

const db = init({ appId: APP_ID });

export { db }; 