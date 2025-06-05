require('dotenv').config();
const express = require('express');
const app = express();
const routes = require('./routes/route'); 

// Middleware untuk mengizinkan semua origin (tanpa cors package)
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*'); // Semua domain boleh akses
  res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') {
    // Untuk preflight requests
    return res.sendStatus(200);
  }
  next();
});

app.use(express.json());
app.use('/api', routes);

app.get('/', (req, res) => {
    res.send('Welcome to the API root! Actual endpoints are likely under /api');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}, API base path /api`);
});
