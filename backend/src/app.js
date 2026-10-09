const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');

// Route imports
const authRoutes = require('./routes/authRoutes');
const produceRoutes = require('./routes/produceRoutes');
const centreRoutes = require('./routes/centreRoutes');
const slotRoutes = require('./routes/slotRoutes');
const bookingRoutes = require('./routes/bookingRoutes');
const queueRoutes = require('./routes/queueRoutes');
const qualityRoutes = require('./routes/qualityRoutes');
const procurementRoutes = require('./routes/procurementRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const adminRoutes = require('./routes/adminRoutes');
const aiRoutes = require('./routes/aiRoutes');

const app = express();

// Security and utility middleware
app.use(cors({
  origin: true,
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    system: 'KisanSetu - Smart Agricultural Procurement Management System',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// API Routes mounting
app.use('/api/auth', authRoutes);
app.use('/api/produce', produceRoutes);
app.use('/api/centres', centreRoutes);
app.use('/api/slots', slotRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/queue', queueRoutes);
app.use('/api/quality', qualityRoutes);
app.use('/api/procurement', procurementRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/ai', aiRoutes);

// Fallthrough 404 & Centralized Error Handler
app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
