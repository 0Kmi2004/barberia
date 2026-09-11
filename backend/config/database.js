const path = require('path');
const dotenv = require('dotenv');

// 1. Carga de variables de entorno con prioridad
dotenv.config(); // Intenta cargar el .env del directorio actual
dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const mysql = require('mysql2/promise');

// 2. Determinar si se requiere SSL (Obligatorio para Aiven Cloud)
const isCloudHost = process.env.DB_HOST && !process.env.DB_HOST.includes('localhost') && !process.env.DB_HOST.includes('127.0.0.1');
const useSSL = process.env.DB_SSL === 'true' || isCloudHost;

// 3. Crear el Pool de conexiones a MySQL
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME || 'barberia',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  decimalNumbers: true, // Devuelve valores DECIMAL/NUMERIC como números (ej: precio)
  supportBigNumbers: true,
  // Configuración SSL para proveedores Cloud como Aiven
  ssl: useSSL ? { rejectUnauthorized: false } : false
});

// 4. Verificación de conexión estructurada al arrancar la aplicación
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
