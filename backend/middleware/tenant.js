const db = require('../config/database');

async function identificarTenant(req, res, next) {
  const tenantHeader = req.headers['x-tenant'];
  // Captura el tenant si viene por query string (ej: ?tenant=demo) o por body
  const tenantQuery = req.query?.tenant || req.body?.tenant;

  const host = req.headers.host || '';
  const hostSinPuerto = host.split(':')[0];
  const partes = hostSinPuerto.split('.');

  let subdominio = null;

  // 1. Priorizar query param (necesario para EventSource / SSE)
  if (tenantQuery && tenantQuery !== 'null' && tenantQuery !== 'undefined') {
    subdominio = tenantQuery.toLowerCase();
  }
  // 2. Revisar header x-tenant
  else if (tenantHeader && tenantHeader !== 'null' && tenantHeader !== 'undefined') {
    subdominio = tenantHeader.toLowerCase();
  }
  // 3. Revisar subdominio del host (asegurando que no sea IP ni localhost)
  else if (partes.length > 1 && partes[0] !== 'www') {
    const esIP = /^\d+\.\d+\.\d+\.\d+$/.test(hostSinPuerto) || hostSinPuerto === 'localhost';
    if (!esIP) {
      subdominio = partes[0].toLowerCase();
    }
  }

  // Si no se detectó un subdominio válido, usar 'demo' por defecto
  if (!subdominio || subdominio === 'localhost' || subdominio === 'api' || /^\d+\.\d+\.\d+\.\d+$/.test(subdominio)) {
    subdominio = 'demo';
  }

  try {
    const [filas] = await db.query(
      'SELECT id, subdominio, nombre, logo_url, color_primario, activa FROM barberias WHERE subdominio = ? AND activa = TRUE',
      [subdominio]
    );

    if (filas.length === 0) {
      return res.status(404).json({ ok: false, error: `Barbería '${subdominio}' no encontrada o inactiva.` });
    }

    req.tenant = filas[0];
    next();
  } catch (error) {
    console.error('Error al identificar tenant:', error);
    return res.status(500).json({ ok: false, error: 'Error interno al identificar el comercio.' });
  }
}

module.exports = identificarTenant;
