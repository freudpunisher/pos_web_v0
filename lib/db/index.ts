import 'dotenv/config';
import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from './schema';

/**
 * Single shared connection pool.
 *
 * The Supabase session-mode pooler limits physical clients (pool_size, default 15).
 * We keep a single module-level pool, cap `max` below that limit, and release idle
 * connections so the pool never exhausts.
 *
 * In Next.js dev, hot-reload re-executes this module. Persisting the pool on
 * `globalThis` ensures we reuse the SAME pool instead of creating a new one on
 * every reload (which previously leaked connections until the pool limit was hit).
 */

const MAX_CLIENTS = Number(process.env.DATABASE_MAX_CLIENTS || 5);
const DATABASE_URL = process.env.DATABASE_URL!;

declare global {
  // eslint-disable-next-line no-var
  var __smartpos_pool: Pool | undefined;
}

function buildPool(): Pool {
  const pool = new Pool({
    connectionString: DATABASE_URL,
    max: MAX_CLIENTS,
    connectionTimeoutMillis: 8000,
    idleTimeoutMillis: 30000,
    query_timeout: 20000,
    statement_timeout: 20000,
    allowExitOnIdle: true,
  });

  pool.on('error', (err) => {
    console.error('Unexpected error on idle PostgreSQL client:', err);
  });

  return pool;
}

globalThis.__smartpos_pool ??= buildPool();
const pool = globalThis.__smartpos_pool;
const db = drizzle(pool, { schema });

export default db;
export { pool };
