const cors = require('cors');
const express = require('express');

const app = express();
const origins = (process.env.CORS_ORIGIN || 'http://localhost:5173')
  .split(',').map(origin => origin.trim()).filter(Boolean);

app.disable('x-powered-by');
app.use(cors({ origin: origins }));
app.use(express.json({ limit: '64kb' }));
app.get('/health', (_req, res) => res.json({ status: 'ok' }));
app.use('/api/auth', require('./auth').router);
app.use('/api/outlets', require('./outlets'));
app.use((_req, res) => res.status(404).json({ message: 'Route not found' }));
app.use((error, _req, res, next) => {
  if (res.headersSent) return next(error);
  if (error.status >= 400 && error.status < 500) {
    return res.status(error.status).json({ message: 'Invalid request' });
  }
  console.error('SaaS API error:', error.name);
  return res.status(500).json({ message: 'Server error' });
});

module.exports = app;
