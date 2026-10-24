const path = require('path');
const dotenv = require('dotenv');

dotenv.config();
dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const mysql = require('mysql2/promise');

const isCloudHost = process.env.DB_HOST && !process.env.DB_HOST.includes('localhost') && !process.env.DB_HOST.includes('127.0.0.1');
const useSSL = process.env.DB_SSL === 'true' || isCloudHost;

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME || 'barberia',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  decimalNumbers: true,
  supportBigNumbers: true,
  ssl: useSSL ? { rejectUnauthorized: false } : false
});

pool.getConnection()
  .then((connection) => {
    console.log(
      JSON.stringify({
        level: 'info',
        event: 'DATABASE_CONNECTED',
        timestamp: new Date().toISOString(),
        message: 'Conexión a la base de datos MySQL establecida correctamente.',
        database: process.env.DB_NAME || 'barberia'
      })
    );
    connection.release();
  })
  .catch((error) => {
    console.error(
      JSON.stringify({
        level: 'error',
        event: 'DATABASE_CONNECTION_ERROR',
        timestamp: new Date().toISOString(),
        message: 'Fallo al conectar con la base de datos MySQL.',
        error: error.message
      })
    );
  });

module.exports = pool;
