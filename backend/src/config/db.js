const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
const config = require('./env');

let pool = null;
let isInMemory = false;

function initPgMemDb(isTestMode = false) {
  console.log(`[DB] Running in in-memory PostgreSQL emulation mode (pg-mem) for ${isTestMode ? 'automated testing' : 'preview mode (USE_IN_MEMORY_DB=true)'}.`);
  
  const { newDb } = require('pg-mem');
  const db = newDb();

  // Register pgcrypto gen_random_uuid as impure function so it generates a new UUID on every call
  db.public.registerFunction({
    name: 'gen_random_uuid',
    impure: true,
    implementation: () => require('crypto').randomUUID(),
  });

  // Load and execute schema in pg-mem
  // 1. Create Enums first
  db.public.none(`
    CREATE TYPE user_role AS ENUM ('customer', 'staff', 'manager', 'admin');
    CREATE TYPE billing_interval_type AS ENUM ('day', 'week', 'month', 'year');
    CREATE TYPE subscription_status AS ENUM ('draft', 'quotation', 'confirmed', 'active', 'paused', 'closed', 'trialing', 'past_due', 'cancelled', 'expired');
    CREATE TYPE tax_rate_type AS ENUM ('percentage', 'flat');
    CREATE TYPE discount_type_enum AS ENUM ('percentage', 'fixed_amount');
    CREATE TYPE discount_target_scope AS ENUM ('subscription', 'plan', 'invoice', 'product');
    CREATE TYPE invoice_status AS ENUM ('draft', 'confirmed', 'paid', 'open', 'void', 'uncollectible');
    CREATE TYPE payment_method_type AS ENUM ('credit_card', 'bank_transfer', 'upi', 'cash', 'manual');
    CREATE TYPE payment_status AS ENUM ('pending', 'successful', 'failed', 'refunded');
  `);

  // 2. Load schema.sql and strip DO $$ blocks & extensions
  const schemaPath = path.resolve(__dirname, '../models/schema.sql');
  let rawSql = fs.readFileSync(schemaPath, 'utf8');

  // Remove CREATE EXTENSION and DO $$ blocks
  rawSql = rawSql.replace(/CREATE EXTENSION[^;]+;/gi, '');
  rawSql = rawSql.replace(/DO \$\$[\s\S]*?END \$\$;/gi, '');

  const statements = rawSql
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0);

  for (const stmt of statements) {
    try {
      db.public.none(stmt);
    } catch (sqlErr) {
      if (!sqlErr.message.includes('already exists')) {
        console.warn('[DB pg-mem DDL Notice]:', sqlErr.message);
      }
    }
  }

  const pgMemPool = db.adapters.createPg().Pool;
  pool = new pgMemPool();
  isInMemory = true;
  console.log('[DB] PostgreSQL schema successfully initialized in in-memory PostgreSQL engine.');
  return pool;
}

async function initDb() {
  if (pool) return pool;

  const isTestMode = process.env.NODE_ENV === 'test';
  const isExplicitInMemory = process.env.USE_IN_MEMORY_DB === 'true';

  if (isExplicitInMemory) {
    return initPgMemDb(isTestMode);
  }

  // Attempt real PostgreSQL connection
  try {
    const realPool = new Pool({
      host: config.db.host,
      port: config.db.port,
      database: config.db.database,
      user: config.db.user,
      password: config.db.password,
      connectionTimeoutMillis: 2000,
    });

    const client = await realPool.connect();
    client.release();
    console.log(`[DB] Connected to PostgreSQL on ${config.db.host}:${config.db.port}/${config.db.database}`);
    pool = realPool;
    return pool;
  } catch (err) {
    if (!isTestMode) {
      console.error(`\n❌ [Database Connection Failure]`);
      console.error(`Could not connect to PostgreSQL database '${config.db.database}' at ${config.db.host}:${config.db.port}`);
      console.error(`Error: ${err.message}`);
      console.error(`\nTo resolve this:`);
      console.error(`1. Ensure PostgreSQL service is installed and running on port ${config.db.port}.`);
      console.error(`2. Ensure database '${config.db.database}' exists: createdb -U ${config.db.user} ${config.db.database}`);
      console.error(`3. Apply schema migrations: npm run db:init`);
      console.error(`4. Update credentials in backend/.env if needed.`);
      console.error(`(Optional: Set USE_IN_MEMORY_DB=true in backend/.env to run in temporary preview mode without PostgreSQL)\n`);
      throw new Error(`Database connection failed: Could not connect to PostgreSQL at ${config.db.host}:${config.db.port}/${config.db.database}`);
    }

    return initPgMemDb(isTestMode);
  }
}

// Helper query function
async function query(text, params) {
  if (!pool) {
    await initDb();
  }
  return pool.query(text, params);
}

// Helper get client for atomic transactions
async function getClient() {
  if (!pool) {
    await initDb();
  }
  return pool.connect();
}

module.exports = {
  initDb,
  query,
  getClient,
  getPool: () => pool,
  isInMemory: () => isInMemory,
};
