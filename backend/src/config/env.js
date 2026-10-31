const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

const config = {
  port: process.env.PORT || 5000,
  nodeEnv: process.env.NODE_ENV || 'development',
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
  
  db: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    database: process.env.DB_NAME || 'subnex_db',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
  },
  
  jwt: {
    secret: process.env.JWT_SECRET || 'subnex_jwt_default_secret_key_change_in_production_2026',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },
  
  email: {
    host: process.env.SMTP_HOST || 'smtp.mailtrap.io',
    port: parseInt(process.env.SMTP_PORT || '2525', 10),
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
    from: process.env.EMAIL_FROM || '"SUBNEX Support" <noreply@subnex.io>',
  },
  
  billing: {
    cronSchedule: process.env.BILLING_CRON_SCHEDULE || '0 0 * * *',
    retryLimit: parseInt(process.env.PAYMENT_RETRY_LIMIT || '3', 10),
    defaultCurrency: process.env.DEFAULT_CURRENCY || 'USD',
  }
};

module.exports = config;

