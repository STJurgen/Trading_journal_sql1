import { getPool } from '../config/db.js';

export const Trade = {
  async findAllByUser(userId) {
    const pool = getPool();
    const [rows] = await pool.query('SELECT * FROM trades WHERE user_id = ? ORDER BY close_date DESC', [userId]);
    return rows;
  },

  async create(trade) {
    const pool = getPool();
    const [result] = await pool.query(
      `INSERT INTO trades (user_id, symbol, trade_type, entry, exit, result, close_date, strategy, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)` ,
      [
        trade.user_id,
        trade.symbol,
        trade.trade_type,
        trade.entry,
        trade.exit,
        trade.result,
        trade.close_date,
        trade.strategy,
        trade.notes
      ]
    );
    return { id: result.insertId, ...trade };
  },

  async update(id, userId, trade) {
    const pool = getPool();
    await pool.query(
      `UPDATE trades SET symbol = ?, trade_type = ?, entry = ?, exit = ?, result = ?, close_date = ?, strategy = ?, notes = ?
       WHERE id = ? AND user_id = ?`,
      [
        trade.symbol,
        trade.trade_type,
        trade.entry,
        trade.exit,
        trade.result,
        trade.close_date,
        trade.strategy,
        trade.notes,
        id,
        userId
      ]
    );
    return { id, user_id: userId, ...trade };
  },

  async remove(id, userId) {
    const pool = getPool();
    await pool.query('DELETE FROM trades WHERE id = ? AND user_id = ?', [id, userId]);
  }
};
