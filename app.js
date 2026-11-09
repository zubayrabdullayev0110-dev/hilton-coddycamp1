// Express ilovasi (lokal server va Netlify Function uchun umumiy)
require('dotenv').config();
const path = require('path');
const express = require('express');
const apiRouter = require('./src/routes/api');

const app = express();
app.disable('x-powered-by');
app.use(express.json({ limit: '50kb' }));
app.use(express.static(path.join(__dirname, 'public'), { maxAge: '1h' }));

// Netlify'da so'rov /.netlify/functions/api/... ko'rinishida ham kelishi mumkin
app.use(['/api', '/.netlify/functions/api'], apiRouter);
app.use(['/api', '/.netlify/functions/api'], (req, res) => res.status(404).json({ error: 'NOT_FOUND' }));

app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'SERVER_ERROR' });
});

module.exports = app;
