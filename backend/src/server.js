require('dotenv').config();
const { trustSystemCa } = require('./utils/trustSystemCa');
trustSystemCa();
const express = require('express');
const cors = require('cors');

// Import routes
const authRoutes = require('./routes/authRoutes');
const citizenRoutes = require('./routes/citizenRoutes');
const officerRoutes = require('./routes/officerRoutes');

const app = express();

// 1. Middlewares
app.use(cors({ origin: '*' }));
app.use(express.json({ limit: '12mb' }));

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// 2. Register Routes
app.use('/api/auth', authRoutes);
app.use('/api/citizen', citizenRoutes);
app.use('/api/officer', officerRoutes);

// 3. Health Check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date() });
});

// 4. 404 Handler
app.use((req, res) => {
  console.log(`404 - Route not found: ${req.method} ${req.path}`);
  res.status(404).json({ 
    message: 'Route not found',
    path: req.path,
    method: req.method
  });
});

// 5. Error Handler
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({ 
    message: err.message || 'Internal Server Error',
    error: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
});

// 6. Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`✅ Backend Server đang chạy tại: http://localhost:${PORT}`);
  console.log(`✅ Health check: http://localhost:${PORT}/health`);
  console.log(`✅ API base: http://localhost:${PORT}/api`);
});