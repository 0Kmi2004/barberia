require('dotenv').config({ path: '../.env' });
const app = require('./apps');
const db = require('./config/database');

const PORT = Number(process.env.PORT) || 3000;

let server;

async function startServer() {
  try {
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

process.on('SIGINT', () => handleShutdown('SIGINT'));
process.on('SIGTERM', () => handleShutdown('SIGTERM'));

startServer();
