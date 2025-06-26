const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Routes
app.get('/', (req, res) => {
  res.json({ message: 'Express test API is running' });
});

// User routes
app.get('/api/users', (req, res) => {
  res.json([
    { id: 1, name: 'User 1' },
    { id: 2, name: 'User 2' },
    { id: 3, name: 'User 3' }
  ]);
});

app.post('/api/users', (req, res) => {
  const { name } = req.body;
  if (!name) {
    return res.status(400).json({ error: 'Name is required' });
  }
  
  // In a real app, we would add to database here
  res.status(201).json({ id: 4, name });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});