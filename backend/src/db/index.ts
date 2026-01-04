import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

const connectionString = process.env.DATABASE_URL || 'postgres://alysis:alysis_dev@localhost:5432/alysis';
const client = postgres(connectionString);
export const db = drizzle(client, { schema });

export { schema };
