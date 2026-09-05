const path = require('path');
const dotenv = require('dotenv');

// Carga prioritariamente el archivo .env del backend y luego el de la raíz
dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME || 'barberia',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Verificación de conexión estructurada al arrancar la aplicación
pool.getConnection()
  .then((connection) => {
    console.log(
      JSON.stringify({
        level: 'info',
        event: 'DATABASE_CONNECTED',
        timestamp: new Date().toISOString(),
        message: 'Conexión a la base de datos MySQL establecida correctamente.'
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
