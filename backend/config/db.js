import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const {
  DB_HOST = 'localhost',
  DB_USER = 'root',
  DB_PASSWORD = '123456',
  DB_NAME = 'trading_journal'
} = process.env;

let pool;

async function initializeDatabase() {
  const connection = await mysql.createConnection({
    host: DB_HOST,
    user: DB_USER,
    password: DB_PASSWORD
  });

  await connection.query(`CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\``);
  await connection.end();

  pool = mysql.createPool({
    host: DB_HOST,
    user: DB_USER,
    password: DB_PASSWORD,
    database: DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
  });

  await createTables();
  await seedData();

  return pool;
}

async function createTables() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id INT AUTO_INCREMENT PRIMARY KEY,
      username VARCHAR(50) NOT NULL UNIQUE,
      email VARCHAR(100),
      password VARCHAR(255) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB;
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS trades (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      symbol VARCHAR(20),
      trade_type ENUM('buy','sell'),
      entry DECIMAL(10,2),
      exit DECIMAL(10,2),
      result DECIMAL(10,2),
      close_date DATE,
      strategy VARCHAR(100),
      notes TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB;
  `);
}

async function seedData() {
  const [users] = await pool.query('SELECT COUNT(*) as count FROM users');
  if (users[0].count === 0) {
    const bcrypt = await import('bcrypt');
    const passwordHash = await bcrypt.default.hash('password123', 10);
    const [userResult] = await pool.query(
      'INSERT INTO users (username, email, password) VALUES (?, ?, ?)',
      ['demo_trader', 'demo@tradeify.com', passwordHash]
    );

    const demoUserId = userResult.insertId;

    const sampleTrades = [
      ['AAPL', 'buy', 140.25, 145.10, 485.00, '2024-07-01', 'Breakout', 'Strong earnings beat, breakout above resistance.'],
      ['TSLA', 'sell', 725.00, 690.50, 690.00, '2024-07-03', 'Mean Reversion', 'Shorted after parabolic move, target hit.'],
      ['NVDA', 'buy', 405.40, 415.75, 520.00, '2024-07-05', 'Trend Following', 'Riding AI momentum with tight stop.'],
      ['AMZN', 'buy', 118.20, 120.00, 180.00, '2024-07-07', 'Breakout', 'Prime day catalyst, strong volume.'],
      ['MSFT', 'sell', 310.00, 300.40, 960.00, '2024-07-10', 'Pullback Short', 'Bearish divergence on RSI.'],
      ['SPY', 'buy', 420.00, 430.20, 1020.00, '2024-07-12', 'Swing Trade', 'Broad market breakout.'],
      ['QQQ', 'buy', 350.00, 365.00, 1500.00, '2024-07-15', 'Momentum', 'Tech leading market higher.'],
      ['AMD', 'sell', 105.50, 101.25, 425.00, '2024-07-18', 'Reversal', 'Failed breakout, high volume reversal.'],
      ['GOOGL', 'buy', 125.00, 132.50, 750.00, '2024-07-20', 'Earnings Play', 'Beat expectations, gap and go.'],
      ['META', 'sell', 290.00, 275.00, 1500.00, '2024-07-22', 'Gap Fade', 'Faded gap after weak guidance.']
    ];

    const tradeInsertQuery = `
      INSERT INTO trades (user_id, symbol, trade_type, entry, exit, result, close_date, strategy, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    for (const trade of sampleTrades) {
      await pool.query(tradeInsertQuery, [demoUserId, ...trade]);
    }
  }
}

function getPool() {
  if (!pool) {
    throw new Error('Database not initialized. Call initializeDatabase() first.');
  }
  return pool;
}

export { initializeDatabase, getPool };
