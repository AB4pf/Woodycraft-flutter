// Woodycraft admin API: Express + MySQL, secured with bcrypt and JWT
require('dotenv').config();

const express = require('express');
const mysql = require('mysql');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET;
const TOKEN_LIFETIME = '1h';

if (!JWT_SECRET) {
  console.error('JWT_SECRET is missing. Copy .env.example to .env and set it.');
  process.exit(1);
}

// Database connection settings come from .env, never from the code
const db = mysql.createConnection({
  host: process.env.DB_HOST || '127.0.0.1',
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'woodycraftv2',
});

const app = express();
app.use(express.json());

// Sends a generic 500 without leaking database details to the client
function serverError(res, err) {
  console.error('Database error:', err.code || err.message);
  return res.status(500).json({ message: 'Server error' });
}

// Checks the "Authorization: Bearer <token>" header on protected routes
function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');

  if (scheme !== 'Bearer' || !token) {
    return res.status(401).json({ message: 'Missing token' });
  }

  try {
    req.user = jwt.verify(token, JWT_SECRET);
    return next();
  } catch (err) {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
}

// Login: compares the password with the bcrypt hash stored in the users table
app.post('/login', (req, res) => {
  const { email, password } = req.body || {};

  if (typeof email !== 'string' || typeof password !== 'string' || !email || !password) {
    return res.status(400).json({ message: 'Email and password are required' });
  }

  db.query('SELECT id, email, password FROM users WHERE email = ? LIMIT 1', [email], async (err, results) => {
    if (err) return serverError(res, err);

    const user = results[0];
    // Same message whether the email or the password is wrong, so attackers cannot list accounts
    const valid = user ? await bcrypt.compare(password, user.password) : false;

    if (!valid) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const token = jwt.sign({ sub: user.id, email: user.email }, JWT_SECRET, { expiresIn: TOKEN_LIFETIME });
    return res.json({ message: 'Login successful', token });
  });
});

// Every route below needs a valid token
app.use('/products', requireAuth);

// All products
app.get('/products', (req, res) => {
  db.query('SELECT * FROM products', (err, results) => {
    if (err) return serverError(res, err);
    return res.json(results);
  });
});

// Products with the highest stock
app.get('/products/stocks/haut', (req, res) => {
  db.query(
    'SELECT name, image, price, quantity FROM products WHERE quantity = (SELECT MAX(quantity) FROM products)',
    (err, results) => {
      if (err) return serverError(res, err);
      return res.json(results);
    }
  );
});

// Products with the lowest stock
app.get('/products/stocks/bas', (req, res) => {
  db.query(
    'SELECT name, image, price, quantity FROM products WHERE quantity = (SELECT MIN(quantity) FROM products)',
    (err, results) => {
      if (err) return serverError(res, err);
      return res.json(results);
    }
  );
});

// Update a product's name and price
app.put('/products/modifier/:id', (req, res) => {
  const id = Number(req.params.id);
  const { name, price } = req.body || {};

  if (!Number.isInteger(id) || typeof name !== 'string' || !name.trim() || !(Number(price) >= 0)) {
    return res.status(400).json({ message: 'Valid id, name, and price are required' });
  }

  db.query('UPDATE products SET name = ?, price = ? WHERE id = ?', [name.trim(), Number(price), id], (err, results) => {
    if (err) return serverError(res, err);
    if (results.affectedRows === 0) return res.status(404).json({ message: 'Product not found' });
    return res.json({ message: `Product ${id} updated` });
  });
});

// Delete a product
app.delete('/products/delete/:id', (req, res) => {
  const id = Number(req.params.id);

  if (!Number.isInteger(id)) {
    return res.status(400).json({ message: 'Valid id is required' });
  }

  db.query('DELETE FROM products WHERE id = ?', [id], (err, results) => {
    if (err) return serverError(res, err);
    if (results.affectedRows === 0) return res.status(404).json({ message: 'Product not found' });
    return res.json({ message: `Product ${id} deleted` });
  });
});

// Create a product
app.post('/products/create', (req, res) => {
  const { categories_id, name, description, image, price, quantity } = req.body || {};

  if (typeof name !== 'string' || !name.trim() || !(Number(price) >= 0) || !Number.isInteger(Number(quantity))) {
    return res.status(400).json({ message: 'Valid name, price, and quantity are required' });
  }

  db.query(
    'INSERT INTO products (categories_id, name, description, image, price, quantity) VALUES (?, ?, ?, ?, ?, ?)',
    [categories_id, name.trim(), description || '', image || '', Number(price), Number(quantity)],
    (err) => {
      if (err) return serverError(res, err);
      return res.status(201).json({ message: 'Product created' });
    }
  );
});

// Start the server only after the database is reachable
db.connect((err) => {
  if (err) {
    console.error('Could not connect to MySQL:', err.code || err.message);
    process.exit(1);
  }
  console.log('Connected to MySQL');
  app.listen(PORT, () => console.log(`API running on http://localhost:${PORT}`));
});

module.exports = { app, requireAuth };
