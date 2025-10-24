import { getPool } from '../config/db.js';

export const User = {
  async findByUsername(username) {
    const pool = getPool();
    const [rows] = await pool.query('SELECT * FROM users WHERE username = ?', [username]);
    return rows[0];
  },

  async findById(id) {
    const pool = getPool();
    const [rows] = await pool.query('SELECT * FROM users WHERE id = ?', [id]);
    return rows[0];
  },

  async create({ username, email, password }) {
    const pool = getPool();
    const [result] = await pool.query(
      'INSERT INTO users (username, email, password) VALUES (?, ?, ?)',
      [username, email, password]
    );
    return { id: result.insertId, username, email };
  }
};
