import { getConnection } from '../config/db.js';

export const Trade = {
  async findAllByUser(userId) {
    const db = getConnection();
    const [rows] = await db.query('SELECT * FROM trades WHERE user_id = ? ORDER BY close_date DESC', [userId]);
    return rows;
  },

  async create(trade) {
    const db = getConnection();
    const [result] = await db.query(
      `INSERT INTO trades (user_id, symbol, trade_type, \`entry\`, \`exit\`, \`result\`, close_date, strategy, notes)
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
    const db = getConnection();
    await db.query(
      `UPDATE trades
       SET symbol = ?, trade_type = ?, \`entry\` = ?, \`exit\` = ?, \`result\` = ?, close_date = ?, strategy = ?, notes = ?
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
    const db = getConnection();
    await db.query('DELETE FROM trades WHERE id = ? AND user_id = ?', [id, userId]);
  }
};
