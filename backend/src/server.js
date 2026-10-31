const app = require('./app');
const config = require('./config/env');
const { initDb, query } = require('./config/db');
const { initBillingCron } = require('./services/cronService');
const bcrypt = require('bcrypt');

async function ensureDefaultSeedUsers() {
  try {
    const defaultUsers = [
      {
        email: process.env.DEFAULT_ADMIN_EMAIL || 'admin@subnex.io',
        password: process.env.DEFAULT_ADMIN_PASSWORD || 'Admin@Subnex2026!',
        full_name: 'SUBNEX System Admin',
        role: 'admin',
        company_name: 'SUBNEX HQ'
      },
      {
        email: 'staff@subnex.io',
        password: 'Staff@Subnex2026!',
        full_name: 'Sarah Connor (Billing Ops)',
        role: 'staff',
        company_name: 'SUBNEX Operations'
      },
      {
        email: 'customer@subnex.io',
        password: 'Customer@Subnex2026!',
        full_name: 'Acme Corp (Demo Customer)',
        role: 'customer',
        company_name: 'Acme Corporation'
      }
    ];

    for (const u of defaultUsers) {
      const existing = await query('SELECT id FROM users WHERE email = $1', [u.email]);
      if (existing.rows.length === 0) {
        const hash = await bcrypt.hash(u.password, 10);
        await query(
          `INSERT INTO users (email, password_hash, full_name, role, company_name, is_active)
           VALUES ($1, $2, $3, $4, $5, TRUE)`,
          [u.email, hash, u.full_name, u.role, u.company_name]
        );
        console.log(`[Bootstrap] Default ${u.role} user initialized: ${u.email}`);
      }
    }
  } catch (err) {
    console.warn('[Bootstrap] Notice while seeding default demo users:', err.message);
  }
}

async function startServer() {
  try {
    await initDb();
    await ensureDefaultSeedUsers();

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

module.exports = {
  startServer,
  ensureDefaultAdmin: ensureDefaultSeedUsers,
  ensureDefaultSeedUsers
};
