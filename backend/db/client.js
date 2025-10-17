import pg from 'pg';

const { Pool } = pg;

const {
  DATABASE_URL,
  DATABASE_SSL,
  PG_POOL_MAX,
  PG_IDLE_TIMEOUT,
  PG_CONNECTION_TIMEOUT
} = process.env;

if (!DATABASE_URL) {
  throw new Error('DATABASE_URL is not set. Please configure the Postgres connection string.');
}

const ssl =
  DATABASE_SSL && DATABASE_SSL !== 'false'
    ? { rejectUnauthorized: DATABASE_SSL === 'verify' }
    : undefined;

export const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl,
  max: Number.parseInt(PG_POOL_MAX ?? '10', 10),
  idleTimeoutMillis: Number.parseInt(PG_IDLE_TIMEOUT ?? '10000', 10),
  connectionTimeoutMillis: Number.parseInt(PG_CONNECTION_TIMEOUT ?? '2000', 10)
});

pool.on('error', (err) => {
  console.error('Unexpected Postgres error', err);
});

export const query = (text, params) => pool.query(text, params);

export const transaction = async (fn) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};
