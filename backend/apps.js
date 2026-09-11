const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const crypto = require('crypto');
const path = require('path');
const registerRoutes = require('./route');
const identificarTenant = require('./middleware/tenant');

/**
 * Creates and configures the Express application.
 * @returns {Object} The configured Express application.
 */
const app = express();

// Configuración de Seguridad y Cabeceras
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
        imgSrc: ["'self'", "data:", "https:"],
        fontSrc: ["'self'"],
        mediaSrc: ["'self'"],
        connectSrc: [
          "'self'",
          "http://localhost:3000",
          "http://*.localhost:3000",
          "http://localhost:5173",
          "ws://localhost:5173",
          "ws://*.localhost:5173"
        ],
        frameAncestors: ["'none'"],
        baseUri: ["'self'"],
        formAction: ["'self'"]
      }
    }
  })
);

app.use((req, res, next) => {
  res.setHeader(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=(), payment=()'
  );
  next();
});

// Compresión de respuestas
app.use(
  compression({
    filter: (req, res) => {
      if (req.headers['x-no-compression']) return false;
      return compression.filter(req, res);
    },
    threshold: 1024
  })
);

// Desactivar caché en la API
app.use('/api', (req, res, next) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  next();
});

// Habilitar CORS y parseo de JSON
app.use(cors());
app.use(express.json());

// Logging de peticiones con ID único
app.use((req, res, next) => {
  const startedAt = Date.now();
  req.requestId = crypto.randomUUID();

  res.on('finish', () => {
    const durationMs = Date.now() - startedAt;
    let logLevel = 'info';

    if (res.statusCode >= 500) {
      logLevel = 'error';
    } else if (res.statusCode >= 400) {
      logLevel = 'warn';
    }

    console.log(
      JSON.stringify({
        level: logLevel,
        requestId: req.requestId,
        tenant: req.tenant ? req.tenant.subdominio : 'main',
        method: req.method,
        path: req.originalUrl,
        status: res.statusCode,
        durationMs
      })
    );
  });

  next();
});

// Middleware Multi-Tenant (detecta el subdominio antes de llegar a las rutas)
app.use(identificarTenant);

// Registrar Rutas de la API
registerRoutes(app);

// Servidor de archivos estáticos (Frontend/Assets)
const staticPath = path.join(__dirname, 'public');

app.use(
  express.static(staticPath, {
    maxAge: '30d',
    immutable: true,
    setHeaders: (res, filePath) => {
      if (filePath.endsWith('.html')) {
        res.setHeader('Cache-Control', 'no-cache, must-revalidate');
      }
    }
  })
);

module.exports = app;
