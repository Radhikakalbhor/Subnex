const app = require('./app');
const config = require('./config/env');
const { initDb, query } = require('./config/db');
const { initBillingCron } = require('./services/cronService');
const bcrypt = require('bcrypt');

async function ensureDefaultAdmin() {
  try {
    const adminEmail = process.env.DEFAULT_ADMIN_EMAIL || 'admin@subnex.io';
    const adminPassword = process.env.DEFAULT_ADMIN_PASSWORD || 'Admin@Subnex2026!';
    
    const existing = await query('SELECT id FROM users WHERE email = $1', [adminEmail]);
    if (existing.rows.length === 0) {
      const hash = await bcrypt.hash(adminPassword, 10);
      await query(
        `INSERT INTO users (email, password_hash, full_name, role, is_active)
         VALUES ($1, $2, 'SUBNEX System Admin', 'admin', TRUE)`,
        [adminEmail, hash]
      );
      console.log(`[Bootstrap] Default admin user initialized: ${adminEmail}`);
    }
  } catch (err) {
    console.warn('[Bootstrap] Notice while checking admin user:', err.message);
  }
}

async function startServer() {
  try {
    await initDb();
    await ensureDefaultAdmin();

    const server = app.listen(config.port, () => {
      console.log(`=======================================================`);
      console.log(`  SUBNEX API Server running on port ${config.port}`);
      console.log(`  Environment: ${config.nodeEnv}`);
      console.log(`  Base API URL: http://localhost:${config.port}/api/v1`);
      console.log(`=======================================================`);
    });

    if (config.nodeEnv !== 'test') {
      initBillingCron();
    }

    return server;
  } catch (err) {
    console.error('[Server Error] Failed to start server:', err);
    process.exit(1);
  }
}

if (require.main === module) {
  startServer();
}

module.exports = { startServer, ensureDefaultAdmin };

