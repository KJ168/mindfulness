require('dotenv').config();
const express = require('express');
const serverless = require('serverless-http'); 
const cors = require('cors');
const routes = require('./routes/route');

const app = express();

app.use(cors({
  origin: ['https://mindfulness-three.vercel.app', 'http://localhost:5173'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  credentials: true
}));

app.use(express.json());
app.use('/api', routes);

app.get('/', (req, res) => {
  res.send('Welcome to the API root! Actual endpoints are likely under /api');
});

// app.listen buat railway, render, dll
// const PORT = process.env.PORT || 3000;
// app.listen(PORT, () => {
//   console.log(`Server is running on port ${PORT}, API base path /api`);
// });

// Export untuk serverless
module.exports = app;
module.exports.handler = serverless(app);
