import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

const {
  DB_HOST = 'localhost',
  DB_USER = 'root',
  DB_PASSWORD = 'asd123',
  DB_NAME = 'trading_journal'
} = process.env;

let pool;

async function ensureDatabaseExists() {
  const connection = await mysql.createConnection({
    host: DB_HOST,
    user: DB_USER,
    password: DB_PASSWORD
  });

  try {
    await connection.query(`CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\``);
  } finally {
    await connection.end();
  }
}

async function initializeDatabase() {
  await ensureDatabaseExists();

  pool = mysql.createPool({
    host: DB_HOST,
    user: DB_USER,
    password: DB_PASSWORD,
    database: DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
  });

  // Simple connectivity check so startup fails fast if credentials are wrong.
  await pool.query('SELECT 1');

  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id INT AUTO_INCREMENT PRIMARY KEY,
      username VARCHAR(255) NOT NULL UNIQUE,
      email VARCHAR(255),
      password VARCHAR(255) NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS trades (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      symbol VARCHAR(50) NOT NULL,
      trade_type VARCHAR(20) NOT NULL,
      entry DECIMAL(15, 4) NOT NULL,
      exit DECIMAL(15, 4) NOT NULL,
      result DECIMAL(15, 2) NOT NULL,
      close_date DATE,
      strategy VARCHAR(255),
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT fk_trades_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  return pool;
}

function getPool() {
  if (!pool) {
    throw new Error('Database not initialized. Call initializeDatabase() first.');
  }
  return pool;
}

export { initializeDatabase, getPool };
