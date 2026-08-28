const app = require('./apps');

const PORT = Number(process.env.PORT) || 3000;

/**
 * Starts the Express server on the specified port.
 * Logs a message indicating the server is running and the URL to access it.
 * @param {number} PORT - The port number on which the server will listen.
 * @returns {void}
 */
app.listen(PORT, () => {
  console.log(`Servidor funcionando en http://localhost:${PORT}`);
});
