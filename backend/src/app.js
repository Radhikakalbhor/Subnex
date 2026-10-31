const express = require('express');
const cors = require('cors');
const apiRoutes = require('./routes');
const { errorHandler, notFoundHandler } = require('./middleware/errorMiddleware');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging in development
if (process.env.NODE_ENV !== 'test') {
  app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
    next();
  });
}

// Mount API routes
app.use('/api/v1', apiRoutes);

// Root route
app.get('/', (req, res) => {
  res.json({
    message: 'SUBNEX API is online.',
    tagline: 'One Platform. Every Subscription. Complete Control.',
    documentation: '/api/v1/health',
  });
});

// 404 Handler
app.use(notFoundHandler);

// Global Error Handler
app.use(errorHandler);

module.exports = app;

