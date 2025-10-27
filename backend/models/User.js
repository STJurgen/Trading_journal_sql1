import { getConnection } from '../config/db.js';

export const User = {
  async findByUsername(username) {
    const db = getConnection();
    const [rows] = await db.query('SELECT * FROM users WHERE username = ?', [username]);
    return rows[0];
  },

  async findByEmail(email) {
    const db = getConnection();
    const [rows] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
    return rows[0];
  },

  async findById(id) {
    const db = getConnection();
    const [rows] = await db.query('SELECT * FROM users WHERE id = ?', [id]);
    return rows[0];
  },

  async create({ username, email, password, account_balance = 0 }) {
    const db = getConnection();
    const [result] = await db.query(
      'INSERT INTO users (username, email, password, account_balance) VALUES (?, ?, ?, ?)',
      [username, email, password, account_balance]
    );
    return { id: result.insertId, username, email, account_balance };
  }
};
