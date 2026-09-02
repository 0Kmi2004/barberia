require('dotenv').config({ path: '../.env' });
const app = require('./apps');
const helmet = require('helmet');

const PORT = Number(process.env.PORT) || 3000;

// 1. Configuración de Headers de Seguridad
app.use(
  helmet({
    frameguard: { action: 'deny' },
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
    xssFilter: false,
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "https://unpkg.com"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://cdnjs.cloudflare.com"],
        imgSrc: ["'self'", "data:"],
        fontSrc: ["'self'", "https://cdnjs.cloudflare.com"],
        mediaSrc: ["'self'"],
        connectSrc: ["'self'"],
        frameAncestors: ["'none'"],
        baseUri: ["'self'"],
        formAction: ["'self'"]
      }
    }
  })
);

// 2. Middleware personalizado para Permissions-Policy
app.use((req, res, next) => {
  res.setHeader(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=(), payment=()'
  );
  next();
});

/**
 * Starts the Express server on the specified port.
 */
//
app.listen(PORT, () => {
  console.log(`Servidor funcionando en http://localhost:${PORT}`);
});
