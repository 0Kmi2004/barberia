const db = require('../config/database');

/**
 * Middleware para identificar la barbería (tenant) a partir del subdominio o la cabecera x-tenant.
 */
async function identificarTenant(req, res, next) {
  // 1. Prioridad: Capturar la cabecera x-tenant si el frontend la envió explícitamente
  const tenantHeader = req.headers['x-tenant'];

  // 2. Si no hay header, capturar el Host del cliente/navegador (ej: 'demo.localhost:5174' o 'elgalpon.mibarbe.com')
  const host = req.headers.host || '';
  const hostSinPuerto = host.split(':')[0];
  const partes = hostSinPuerto.split('.');

  let subdominio = null;

  if (tenantHeader && tenantHeader !== 'null' && tenantHeader !== 'undefined') {
    subdominio = tenantHeader.toLowerCase();
  } else if (partes.length > 1 && partes[0] !== 'www') {
    // Soporta tanto 'demo.localhost' como 'demo.mibarbe.com'
    if (partes[0] !== 'localhost') {
      subdominio = partes[0].toLowerCase();
    }
  }

  // Si no se logra determinar un subdominio válido, asignar 'demo' por defecto en desarrollo
  if (!subdominio || subdominio === 'localhost' || subdominio === 'api') {
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

    // Guardamos los datos de la barbería en la petición
    req.tenant = filas[0];
    next();
  } catch (error) {
    console.error('Error al identificar tenant:', error);
    return res.status(500).json({ ok: false, error: 'Error interno al identificar el comercio.' });
  }
}

module.exports = identificarTenant;
