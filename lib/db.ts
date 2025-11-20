import { init } from '@instantdb/react';
import schema from '../instant.schema';

// App ID from InstantDB - loaded from environment variables
const APP_ID = process.env.NEXT_PUBLIC_INSTANT_APP_ID;

if (!APP_ID) {
  throw new Error(
    'Missing NEXT_PUBLIC_INSTANT_APP_ID environment variable. ' +
    'Please add it to your .env.local file.'
  );
}

const db = init({ appId: APP_ID, schema });

export { db }; 