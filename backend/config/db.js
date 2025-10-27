import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

const {
  DB_HOST = 'localhost',
  DB_USER = 'root',
  DB_PASSWORD = 'asd123',
  DB_NAME = 'trading_journal',
  DB_PORT,
  DB_SOCKET_PATH,
  DB_INIT_RETRIES,
  DB_INIT_RETRY_DELAY_MS
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
  const config = buildConnectionConfig({ includeDatabase: false });
  const adminConnection = await mysql.createConnection(config);

  try {
    await adminConnection.query(`CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\``);
  } catch (error) {
    if (error.code === 'ER_DBACCESS_DENIED_ERROR' || error.code === 'ER_ACCESS_DENIED_ERROR') {
      console.warn(
        `Skipping automatic database creation for "${DB_NAME}" because the MySQL user ` +
          'does not have sufficient privileges. Ensure the database exists before starting the API.'
      );
    } else {
      throw error;
    }
  } finally {
    await adminConnection.end();
  }
}

function isRetryableError(error) {
  if (!error || typeof error !== 'object') {
    return false;
  }

  const retryableCodes = new Set([
    'ECONNREFUSED',
    'ER_CON_COUNT_ERROR',
    'PROTOCOL_CONNECTION_LOST',
    'ENOTFOUND',
    'EAI_AGAIN'
  ]);

  return retryableCodes.has(error.code);
}

function getRetryConfig() {
  const retries = Number.isFinite(Number(DB_INIT_RETRIES)) ? Number(DB_INIT_RETRIES) : 5;
  const retryDelayMs = Number.isFinite(Number(DB_INIT_RETRY_DELAY_MS))
    ? Number(DB_INIT_RETRY_DELAY_MS)
    : 2000;

  return {
    retries: Math.max(0, retries),
    retryDelayMs: Math.max(0, retryDelayMs)
  };
}

async function sleep(delay) {
  return new Promise((resolve) => setTimeout(resolve, delay));
}

async function attemptInitialization() {
  await ensureDatabaseExists();

  const dbConnection = await mysql.createConnection(buildConnectionConfig({ includeDatabase: true }));

  try {
    // Simple connectivity check so startup fails fast if credentials are wrong.
    await dbConnection.query('SELECT 1');

    await dbConnection.query(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(255) NOT NULL UNIQUE,
        email VARCHAR(255),
        password VARCHAR(255) NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await dbConnection.query(`
      CREATE TABLE IF NOT EXISTS trades (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        symbol VARCHAR(50) NOT NULL,
        trade_type VARCHAR(20) NOT NULL,
        \`entry\` DECIMAL(15, 4) NOT NULL,
        \`exit\` DECIMAL(15, 4) NOT NULL,
        \`result\` DECIMAL(15, 2) NOT NULL,
        close_date DATE,
        open_date DATE,
        strategy VARCHAR(255),
        notes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT fk_trades_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    return dbConnection;
  } catch (error) {
    await dbConnection.end().catch(() => {});
    throw error;
  }
}

async function initializeDatabase() {
  if (connection) {
    return connection;
  }

  const { retries, retryDelayMs } = getRetryConfig();
  const maxAttempts = retries + 1;
  let lastError;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      connection = await attemptInitialization();
      return connection;
    } catch (error) {
      lastError = error;

      const shouldRetry = attempt < maxAttempts && isRetryableError(error);

      if (!shouldRetry) {
        break;
      }

      const errorDetails = [error.code, error.message].filter(Boolean).join(': ') || `${error}`;
      console.warn(
        `Database initialization failed (attempt ${attempt} of ${maxAttempts}). ` +
          `Retrying in ${retryDelayMs}ms... Error: ${errorDetails}`
      );
      await sleep(retryDelayMs);
    }
  }

  if (lastError) {
    throw lastError;
  }

  throw new Error('Failed to initialize database for an unknown reason.');
}

function getConnection() {
  if (!connection) {
    throw new Error('Database not initialized. Call initializeDatabase() first.');
  }
  return connection;
}

export { initializeDatabase, getConnection };
