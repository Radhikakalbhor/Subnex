const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
const config = require('../config/env');

async function runMigrations() {
  console.log(`Connecting to PostgreSQL at ${config.db.host}:${config.db.port}/${config.db.database}...`);
  const pool = new Pool({
    host: config.db.host,
    port: config.db.port,
    database: config.db.database,
    user: config.db.user,
    password: config.db.password,
  });

  const schemaPath = path.resolve(__dirname, '../models/schema.sql');
  const ddlSql = fs.readFileSync(schemaPath, 'utf8');

  try {
    const client = await pool.connect();
    console.log('Applying schema migrations...');
    await client.query(ddlSql);
    client.release();
    console.log('✅ Schema migration executed successfully.');
  } catch (err) {
    console.error('❌ Migration failed:', err.message);
  } finally {
    await pool.end();
  }
}

if (require.main === module) {
  runMigrations();
}

module.exports = { runMigrations };

