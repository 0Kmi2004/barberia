require('dotenv').config({ path: '../.env' });
const app = require('./apps');
const db = require('./config/database');

const PORT = Number(process.env.PORT) || 3000;

/**
 * Inicia el servidor de Express y maneja el ciclo de vida de la aplicación.
 */
let server;

async function startServer() {
  try {
    // 1. Validar conexión a la Base de Datos antes de levantar el puerto
    const connection = await db.getConnection();
    connection.release();

    console.log(
      JSON.stringify({
        level: 'info',
        event: 'DATABASE_CONNECTED',
        timestamp: new Date().toISOString(),
        message: 'Conexión a MySQL establecida correctamente.'
      })
    );

    // 2. Levantar el servidor Express
    server = app.listen(PORT, () => {
      console.log(
        JSON.stringify({
          level: 'info',
          event: 'SERVER_STARTED',
          timestamp: new Date().toISOString(),
          port: PORT,
          environment: process.env.NODE_ENV || 'development'
        })
      );
    });
  } catch (error) {
    console.error(
      JSON.stringify({
        level: 'error',
        event: 'SERVER_BOOT_ERROR',
        timestamp: new Date().toISOString(),
        error: error.message
      })
    );
    process.exit(1);
  }
}

/**
 * Cierre controlado de la aplicación (Graceful Shutdown)
 * Cierra HTTP listener y el pool de MySQL antes de finalizar el proceso.
 */
const handleShutdown = (signal) => {
  console.log(
    JSON.stringify({
      level: 'info',
      event: 'SERVER_STOPPING',
      timestamp: new Date().toISOString(),
      signal
    })
  );

  if (server) {
    server.close(async () => {
      try {
        // Cerrar conexiones activas a la base de datos
        if (db.end) {
          await db.end();
        }
        console.log(
          JSON.stringify({
            level: 'info',
            event: 'SERVER_STOPPED',
            timestamp: new Date().toISOString(),
            message: 'Servidor y base de datos detenidos de forma limpia.'
          })
        );
        process.exit(0);
      } catch (err) {
        console.error(
          JSON.stringify({
            level: 'error',
            event: 'SHUTDOWN_ERROR',
            timestamp: new Date().toISOString(),
            error: err.message
          })
        );
        process.exit(1);
      }
    });
  } else {
    process.exit(0);
  }
};

// Escuchar señales de apagado del sistema o hosting (Render / Railway / Docker / PM2)
process.on('SIGINT', () => handleShutdown('SIGINT'));
process.on('SIGTERM', () => handleShutdown('SIGTERM'));

startServer();
