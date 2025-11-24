import express from 'express';
import { createUser, getAllUsers } from './users.js';

const app = express();
const PORT = 3000;

app.use(express.json());

// Health check
app.get('/', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'User Management API',
    version: '1.0.0'
  });
});

// Get all users
app.get('/users', (req, res) => {
  const users = getAllUsers();
  res.json({ users, count: users.length });
});

// Register new user
app.post('/users', async (req, res) => {
  const { name, email } = req.body;
  
  // Basic validation
  if (!name || !email) {
    return res.status(400).json({ 
      error: 'Name and email are required' 
    });
  }
  
  if (!email.includes('@')) {
    return res.status(400).json({ 
      error: 'Invalid email format' 
    });
  }
  
  try {
    const user = await createUser({ name, email });
    res.status(201).json({ 
      message: 'User created successfully',
      user 
    });
  } catch (error) {
    res.status(400).json({ 
      error: error.message 
    });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log('Try: POST /users with {"name": "Alice", "email": "alice@example.com"}');
});
