require('dotenv').config();
const express = require('express');
const cors = require('cors');

// Import routes
const authRoutes = require('./routes/authRoutes');

const app = express();

// 1. Middlewares
app.use(cors({ origin: '*' }));
app.use(express.json());

// 2. Register Routes
app.use('/api/auth', authRoutes);

// 3. Health Check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date() });
});

// 4. Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Backend Server đang chạy tại cổng: ${PORT}`);
});