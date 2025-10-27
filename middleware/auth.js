const jwt = require('jsonwebtoken');
const db = require('../db');
const dotenv = require('dotenv');
dotenv.config();

const authMiddleware = async (req, res, next) => {
  const auth = req.header('Authorization');
  if (!auth) return res.status(401).json({ error: 'Missing Authorization header' });
  const token = auth.replace('Bearer ', '');
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    // fetch user
    const result = await db.query('SELECT id, name, email FROM users WHERE id=$1', [payload.id]);
    if (result.rows.length === 0) return res.status(401).json({ error: 'Invalid token user' });
    req.user = result.rows[0];
    next();
  } catch (e) {
    return res.status(401).json({ error: 'Invalid token' });
  }
};

module.exports = authMiddleware;
