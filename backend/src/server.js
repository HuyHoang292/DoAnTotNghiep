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

// 2. Register Routes
app.use('/api/auth', authRoutes);
app.use('/api/citizen', citizenRoutes);
app.use('/api/officer', officerRoutes);

// 3. Health Check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date() });
});

// 4. Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Backend Server đang chạy tại cổng: ${PORT}`);
});