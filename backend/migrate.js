const fs = require('fs/promises');
const path = require('path');
const dotenv = require('dotenv');
const mysql = require('mysql2/promise');

dotenv.config({ path: path.resolve(__dirname, '.env') });
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const db = require('./config/database');

const migrationsDirectory = path.join(__dirname, 'migrations');

function statementsFrom(sql) {
  return sql
    .replace(/^\s*--.*$/gm, '')
    .split(';')
    .map((statement) => statement.trim())
    .filter(Boolean);
}

async function ensureDatabase() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD
  });

  try {
    await connection.query(
      'CREATE DATABASE IF NOT EXISTS ?? CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci',
      [process.env.DB_NAME || 'barberia']
    );
  } finally {
    await connection.end();
  }
}

async function migrate() {
  await ensureDatabase();
  const connection = await db.getConnection();

  try {
    await connection.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        filename VARCHAR(255) NOT NULL PRIMARY KEY,
        applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    const files = (await fs.readdir(migrationsDirectory))
      .filter((file) => /^\d+_.+\.sql$/.test(file))
      .sort();

    const [appliedRows] = await connection.query(
      'SELECT filename FROM schema_migrations'
    );
    const applied = new Set(appliedRows.map((row) => row.filename));

    for (const filename of files) {
      if (applied.has(filename)) continue;

      const sql = await fs.readFile(path.join(migrationsDirectory, filename), 'utf8');
      await connection.beginTransaction();
      try {
        for (const statement of statementsFrom(sql)) {
          await connection.query(statement);
        }
        await connection.query(
          'INSERT INTO schema_migrations (filename) VALUES (?)',
          [filename]
        );
        await connection.commit();
        console.log(`Applied ${filename}`);
      } catch (error) {
        await connection.rollback();
        throw new Error(`Migration ${filename} failed: ${error.message}`);
      }
    }
  } finally {
    connection.release();
  }
}

migrate()
  .then(() => {
    console.log('Migrations are up to date.');
    return db.end();
  })
  .catch(async (error) => {
    console.error(error.message);
    await db.end();
    process.exitCode = 1;
  });
