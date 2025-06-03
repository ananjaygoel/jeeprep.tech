require('dotenv').config();
const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const sqlite3 = require('sqlite3').verbose();
const app = express();
const PORT = process.env.PORT || 4000;
const JWT_SECRET = process.env.JWT_SECRET || 'supersecretkey';

app.use(cors());
app.use(express.json());

// SQLite setup
const db = new sqlite3.Database('./jeeprep.sqlite', (err) => {
  if (err) return console.error('DB open error:', err.message);
  console.log('Connected to SQLite database.');
});

db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL
  )`);
  db.run(`CREATE TABLE IF NOT EXISTS questions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    subject TEXT,
    chapter TEXT,
    year INTEGER,
    question_text TEXT,
    options TEXT,
    correct_ans TEXT,
    explanation TEXT,
    explanation_url TEXT,
    question_type TEXT,
    difficulty TEXT
  )`);
  db.run(`CREATE TABLE IF NOT EXISTS attempts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    question_id INTEGER,
    selected_answer TEXT,
    is_correct INTEGER,
    time_taken INTEGER,
    attempted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id),
    FOREIGN KEY(question_id) REFERENCES questions(id)
  )`);
});

// Helper: generate JWT
function generateToken(user) {
  return jwt.sign({ id: user.id, email: user.email, name: user.name }, JWT_SECRET, { expiresIn: '7d' });
}

// Auth: Register
app.post('/api/register', (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) return res.status(400).json({ error: 'All fields required.' });
  db.get('SELECT * FROM users WHERE email = ?', [email], (err, user) => {
    if (user) return res.status(409).json({ error: 'Email already registered.' });
    const hash = bcrypt.hashSync(password, 10);
    db.run('INSERT INTO users (name, email, password) VALUES (?, ?, ?)', [name, email, hash], function(err) {
      if (err) return res.status(500).json({ error: 'Registration failed.' });
      const newUser = { id: this.lastID, name, email };
      res.json({ user: newUser, token: generateToken(newUser) });
    });
  });
});

// Auth: Login
app.post('/api/login', (req, res) => {
  const { email, password } = req.body;
  db.get('SELECT * FROM users WHERE email = ?', [email], (err, user) => {
    if (!user) return res.status(401).json({ error: 'Invalid credentials.' });
    if (!bcrypt.compareSync(password, user.password)) return res.status(401).json({ error: 'Invalid credentials.' });
    res.json({ user: { id: user.id, name: user.name, email: user.email }, token: generateToken(user) });
  });
});

// Middleware: verify JWT
function authMiddleware(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token provided.' });
  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Invalid token.' });
    req.user = user;
    next();
  });
}

// Example protected route
app.get('/api/me', authMiddleware, (req, res) => {
  db.get('SELECT id, name, email FROM users WHERE id = ?', [req.user.id], (err, user) => {
    if (!user) return res.status(404).json({ error: 'User not found.' });
    res.json({ user });
  });
});

// TODO: Add endpoints for questions and attempts (CRUD)

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
