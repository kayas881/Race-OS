const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const database = require('./config/database');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Trust proxy configuration for development environments (Codespaces, etc.)
if (process.env.NODE_ENV === 'development' || process.env.CODESPACES) {
  app.set('trust proxy', 1);
}

// CORS Configuration for Codespaces
const corsOptions = {
  origin: [
    'http://localhost:3000',
    'http://localhost:3001', 
    'https://humble-space-waddle-q7qrj65r6p6h4qpg-3000.app.github.dev',
    process.env.FRONTEND_URL
  ].filter(Boolean), // Remove any undefined values
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['X-Total-Count']
};

app.use(cors(corsOptions));

// Middleware
app.use(
  helmet({
    crossOriginOpenerPolicy: { policy: "same-origin-allow-popups" },
  })
);
// Rate limiting with improved configuration
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: {
    error: 'Too many requests from this IP, please try again later.',
    retryAfter: '15 minutes'
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  // Skip rate limiting in development if needed
  skip: (req) => {
    return process.env.NODE_ENV === 'development' && req.ip === '127.0.0.1';
  }
});
app.use(limiter);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Database connection
database.connect().catch(err => {
  console.error('Failed to connect to database:', err);
  process.exit(1);
});

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/accounts', require('./routes/accounts'));
app.use('/api/transactions', require('./routes/transactions'));
app.use('/api/categories', require('./routes/categories'));
app.use('/api/tax', require('./routes/tax'));
app.use('/api/dashboard', require('./routes/dashboard'));
app.use('/api/integrations', require('./routes/integrations'));
app.use('/api/test-integrations', require('./routes/test-integrations'));
app.use('/api/test', require('./routes/test'));
app.use('/api/invoices', require('./routes/invoices'));
app.use('/api/clients', require('./routes/clients'));
app.use('/api/branding', require('./routes/branding'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/reports', require('./routes/reports'));
app.use('/api/demo', require('./routes/demo'));

// Serve uploaded files
app.use('/uploads', express.static('uploads'));

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    error: 'Something went wrong!',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
  });
});

// Health check
app.get('/health', (req, res) => {
  const dbStatus = database.getConnectionStatus();
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    database: dbStatus
  });
});

// Database status endpoint
app.get('/api/status', (req, res) => {
  const dbStatus = database.getConnectionStatus();
  res.json({
    application: 'Race-OS API',
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    database: dbStatus,
    features: {
      multiCountryTax: true,
      supportedCountries: ['US', 'IN'],
      supportedCurrencies: ['USD', 'INR'],
      builtInTaxCalculations: true,
      externalApiDependencies: false
    }
  });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Race-OS Backend running on port ${PORT}`);
  
  // Start notification scheduler
  if (process.env.NODE_ENV !== 'test') {
    const notificationScheduler = require('./services/notificationScheduler');
    notificationScheduler.start();
  }
});

module.exports = app;
