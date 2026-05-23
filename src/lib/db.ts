import { createClient } from '@libsql/client';

const db = createClient({
  url: process.env.DATABASE_URL || 'file:local.db',
});

export { db };
