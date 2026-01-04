import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';

const connectionString = process.env.DATABASE_URL || 'postgres://alysis:alysis_dev@localhost:5432/alysis';

async function runMigrations() {
  const client = postgres(connectionString, { max: 1 });
  const db = drizzle(client);

  try {
    await migrate(db, { migrationsFolder: './drizzle' });
  } catch {
    process.exit(1);
  } finally {
    await client.end();
  }
}

runMigrations();
