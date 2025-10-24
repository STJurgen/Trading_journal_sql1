import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

const {
  DB_HOST = 'localhost',
  DB_USER = 'root',
  DB_PASSWORD = 'asd123',
  DB_NAME = 'trading_journal',
  DB_PORT,
  DB_SOCKET_PATH
} = process.env;

let connection;

function buildConnectionConfig({ includeDatabase } = { includeDatabase: true }) {
  const config = {
    user: DB_USER,
    password: DB_PASSWORD
  };

  if (DB_SOCKET_PATH) {
    config.socketPath = DB_SOCKET_PATH;
  } else {
    config.host = DB_HOST;
    config.port = DB_PORT ? Number(DB_PORT) : 3306;
  }

  if (includeDatabase) {
    config.database = DB_NAME;
  }

  return config;
}

async function ensureDatabaseExists() {
  const connection = await mysql.createConnection(buildConnectionConfig({ includeDatabase: false }));

  try {
    await connection.query(`CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\``);
  } finally {
    await connection.end();
  }
}

async function initializeDatabase() {
  await ensureDatabaseExists();

  if (!connection) {
    connection = await mysql.createConnection(buildConnectionConfig({ includeDatabase: true }));
  }

  // Simple connectivity check so startup fails fast if credentials are wrong.
  await connection.query('SELECT 1');

  await connection.query(`
    CREATE TABLE IF NOT EXISTS users (
      id INT AUTO_INCREMENT PRIMARY KEY,
      username VARCHAR(255) NOT NULL UNIQUE,
      email VARCHAR(255),
      password VARCHAR(255) NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await connection.query(`
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

  return connection;
}

function getConnection() {
  if (!connection) {
    throw new Error('Database not initialized. Call initializeDatabase() first.');
  }
  return connection;
}

export { initializeDatabase, getConnection };
