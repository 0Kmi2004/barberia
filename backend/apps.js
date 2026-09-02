const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const registerRoutes = require('./route');

/**
 * Creates and configures the Express application.
 * @returns {Object} The configured Express application.
 */
const app = express();

// 1. Configuración de Helmet (Cabeceras de seguridad)
app.use(
  helmet({
    frameguard: { action: 'deny' },
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
    xssFilter: false,
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:"],
        fontSrc: ["'self'"],
        mediaSrc: ["'self'"],
        connectSrc: ["'self'", "http://localhost:3000", "http://localhost:5173", "ws://localhost:5173"],
        frameAncestors: ["'none'"],
        baseUri: ["'self'"],
        formAction: ["'self'"]
      }
    }
  })
);

// 2. Middleware para Permissions-Policy (deshabilita APIs no utilizadas)
app.use((req, res, next) => {
  res.setHeader(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=(), payment=()'
  );
  next();
});

// 3. Compresión Gzip para respuestas
app.use(
  compression({
    filter: (req, res) => {
      if (req.headers['x-no-compression']) return false;
      return compression.filter(req, res);
    },
    threshold: 1024 // Comprime únicamente respuestas mayores a 1 KB
  })
);

// 4. Deshabilitar la caché exclusivamente para rutas de la API
app.use('/api', (req, res, next) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  next();
});

// 5. Middlewares base (CORS y Parseo de JSON)
app.use(cors());
app.use(express.json());

// 6. Middleware de Observabilidad (Logs estructurados)
app.use((req, res, next) => {
  const startedAt = Date.now();

  res.on('finish', () => {
    const durationMs = Date.now() - startedAt;
    console.log(
      JSON.stringify({
        level: 'info',
        method: req.method,
        path: req.originalUrl,
        status: res.statusCode,
        durationMs
      })
    );
  });

  next();
});

// 7. Registrar rutas de la aplicación
registerRoutes(app);

// Export standard Express app configured
module.exports = app;
