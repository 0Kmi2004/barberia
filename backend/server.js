require('dotenv').config({ path: '../.env' });
const app = require('./apps');

const PORT = Number(process.env.PORT) || 3000;

/**
 * Inicia el servidor de Express y maneja el ciclo de vida de la aplicación.
 */
const server = app.listen(PORT, () => {
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

/**
 * Cierre controlado de la aplicación (Graceful Shutdown)
 * Cierra las conexiones activas antes de finalizar el proceso en producción.
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

  server.close(() => {
    console.log(
      JSON.stringify({
        level: 'info',
        event: 'SERVER_STOPPED',
        timestamp: new Date().toISOString(),
        message: 'Servidor detenido de forma limpia.'
      })
    );
    process.exit(0);
  });
};

// Escuchar señales de apagado del sistema o hosting (Render / Railway / Docker)
process.on('SIGINT', () => handleShutdown('SIGINT'));
process.on('SIGTERM', () => handleShutdown('SIGTERM'));
