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

async function initializeDatabase() {
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

  return pool;
}

function getPool() {
  if (!pool) {
    throw new Error('Database not initialized. Call initializeDatabase() first.');
  }
  return pool;
}

export { initializeDatabase, getPool };
