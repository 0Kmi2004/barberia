const express = require('express');
const cors = require('cors');
const registerRoutes = require('./route');

/**
 * Creates and configures the Express application.
 * @returns {Object} The configured Express application.
 */
const app = express();

/**
 * Configure middleware for the Express application.
 * - CORS: Enables Cross-Origin Resource Sharing.
 * - JSON Parsing: Parses incoming requests with JSON payloads.
 * More middleware can be added here as needed.
 */
app.use(cors());
app.use(express.json());

// Register application routes.
registerRoutes(app);

// Export the configured Express application for use in other modules (e.g., server.js).
module.exports = app;
