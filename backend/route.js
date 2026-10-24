const db = require('./config/database');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const { generarHorarios } = require('./utils/horarios');
const { enviarConfirmacionTurno } = require('./utils/mailer');
const { registrarCliente, removerCliente } = require('./utils/sseService');
const { notificarAdmin } = require('./utils/sseService');

const identificarTenant = require('./middleware/tenant');

const fs = require('fs');
const path = require('path');

const NodeCache = require('node-cache');
const configCache = new NodeCache({ stdTTL: 60, checkperiod: 120 });

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  throw new Error('JWT_SECRET debe estar configurado');
}

function logEvent(level, event, details = {}) {
  console.log(
    JSON.stringify({
      level,
      event,
      timestamp: new Date().toISOString(),
      ...details
    })
  );
}

function requireAdmin(req, res, next) {
  const authHeader = req.headers.authorization;
  let token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token && req.query && req.query.token) {
    token = req.query.token;
  }

  if (!token) {
    return res.status(401).json({ message: 'No autorizado' });
  }

  if (!req.tenant?.id) {
    return res.status(400).json({ message: 'Tenant no especificado' });
  }

  try {
    const secret = process.env.JWT_SECRET || 'tu_secreto_jwt_por_defecto';
    const user = jwt.verify(token, secret);

    if (user.role !== 'admin') {
      logEvent('warn', 'AUTH_FORBIDDEN_ACCESS', { userId: user.id, path: req.originalUrl });
      return res.status(403).json({ message: 'Permisos insuficientes' });
    }

    if (Number(user.barberia_id) !== Number(req.tenant.id)) {
      logEvent('warn', 'AUTH_CROSS_TENANT_VIOLATION', {
        userId: user.id,
        userTenantId: user.barberia_id,
        requestTenantId: req.tenant.id,
        path: req.originalUrl
      });
      return res.status(403).json({ message: 'No tiene acceso a la barbería especificada.' });
    }

    req.user = user;
    return next();
  } catch (_error) {
    return res.status(401).json({ message: 'Token inválido o expirado' });
  }
}

module.exports = requireAdmin;

function registerRoutes(app) {

  app.get('/demo', async (req, res) => {
    try {
      const tenantId = req.tenant?.id;

      const [barberias] = await db.query('SELECT * FROM barberias WHERE id = ? LIMIT 1', [tenantId]);
      const b = barberias[0] || {};

      let servicios = [];
      try {
        const [rows] = await db.query('SELECT id, nombre, descripcion, precio, activo FROM servicios WHERE barberia_id = ? AND activo = TRUE', [tenantId]);
        servicios = rows;
      } catch (_e) {
        servicios = [];
      }

      const config = {
        id: b.id,
        subdominio: b.subdominio,
        nombre: b.nombre,
        logo_url: b.logo_url,
        color_primario: b.color_primario,
        activa: b.activa,
        'l-barberiaNombre': b.nombre,
        'l-logoUrl': b.logo_url,
        'l-heroTitle': b.hero_titulo,
        'l-heroSubtitle': b.hero_subtitulo,
        'l-heroText' : b.hero_texto_rating,
        'l-heroVideoText': b.hero_video_texto,
        'l-heroVideo': b.hero_video_url,
        'l-sobretituloAbout': b.about_sobretitulo,
        'l-tituloAbout': b.about_titulo,
        'l-textAbout': b.about_texto_1,
        'l-textAbout2': b.about_texto_2,
        'l-subtextAbout': b.about_cita,
        'l-aboutImg': b.about_imagen_url,
        'l-sobretituloServicios': b.servicios_sobretitulo,
        'l-tituloServicios': b.servicios_titulo,
        'l-textServicios': b.servicios_texto,
        'l-textCta': b.cta_titulo,
        'l-serviciosTable': servicios,
      };

      const indexPath = path.join(__dirname, '../web/dist/index.html');
      let htmlContent = fs.readFileSync(indexPath, 'utf8');

      const initialScript = `<script>window.__INITIAL_CONFIG__ = ${JSON.stringify(config)};</script>`;
      htmlContent = htmlContent.replace('</head>', `${initialScript}</head>`);

      if (config.nombre) {
        htmlContent = htmlContent.replace(
          '<title>Tuerto Chávez Barbería | Cortes de Pelo y Barba</title>',
          `<title>${config.nombre} | Turnos Online</title>`
        );
      }

      return res.send(htmlContent);
    } catch (error) {
      return res.status(500).send('Error al cargar la página');
    }
  });

  app.get('/api/barberia/configuracion', async (req, res) => {
    try {
      if (!req.tenant?.id) {
        return res.status(400).json({ error: 'Tenant no especificado' });
      }

      const cacheKey = `config_${req.tenant.id}`;

      if (configCache.has(cacheKey)) {
        return res.json(configCache.get(cacheKey));
      }

      const [barberiasResult, serviciosResult] = await Promise.all([
        db.query('SELECT * FROM barberias WHERE id = ? LIMIT 1', [req.tenant.id]),
        db.query('SELECT id, nombre, descripcion, precio, activo FROM servicios WHERE barberia_id = ? AND activo = TRUE', [req.tenant.id])
          .catch(() => [[]])
      ]);

      const b = barberiasResult[0][0] || {};
      const servicios = serviciosResult[0] || [];

      const responseData = {
        id: b.id,
        subdominio: b.subdominio,
        nombre: b.nombre,
        logo_url: b.logo_url,
        color_primario: b.color_primario,
        activa: b.activa,

        'l-barberiaNombre': b.nombre,
        'l-logoUrl': b.logo_url,

        'l-heroTitle': b.hero_titulo,
        'l-heroSubtitle': b.hero_subtitulo,
        'l-heroText' : b.hero_texto_rating,
        'l-heroVideoText': b.hero_video_texto,
        'l-heroVideo': b.hero_video_url,

        'l-sobretituloAbout': b.about_sobretitulo,
        'l-tituloAbout': b.about_titulo,
        'l-textAbout': b.about_texto_1,
        'l-textAbout2': b.about_texto_2,
        'l-subtextAbout': b.about_cita,
        'l-aboutImg': b.about_imagen_url,

        'l-sobretituloServicios': b.servicios_sobretitulo,
        'l-tituloServicios': b.servicios_titulo,
        'l-textServicios': b.servicios_texto,

        'l-textCta': b.cta_titulo,
        'l-serviciosTable': servicios,
      };

      configCache.set(cacheKey, responseData);

      return res.json(responseData);

    } catch (error) {
      logEvent('error', 'FETCH_CONFIGURACION_ERROR', { error: error.message, tenantId: req.tenant?.id });
      return res.status(500).json({ error: 'Error al obtener la configuración de la barbería' });
    }
  });

  app.post('/api/auth/login', async (req, res) => {
    try {
      if (!req.tenant?.id) {
        return res.status(400).json({ message: 'Dominio o subdominio no válido' });
      }

      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({ message: 'El correo y la contraseña son obligatorios' });
      }

      const sql = 'SELECT * FROM usuarios WHERE email = ? AND barberia_id = ?';
      const [usuarios] = await db.query(sql, [email, req.tenant.id]);

      if (usuarios.length === 0) {
        logEvent('warn', 'AUTH_LOGIN_FAILED', { reason: 'USER_NOT_FOUND', tenantId: req.tenant.id });
        return res.status(401).json({ message: 'Credenciales incorrectas' });
      }

      const usuario = usuarios[0];
      const passwordCoincide = await bcrypt.compare(password, usuario.password);

      if (!passwordCoincide) {
        logEvent('warn', 'AUTH_LOGIN_FAILED', { userId: usuario.id, tenantId: req.tenant.id, reason: 'INVALID_PASSWORD' });
        return res.status(401).json({ message: 'Credenciales incorrectas' });
      }

      const token = jwt.sign(
        {
          id: usuario.id,
          email: usuario.email,
          role: usuario.role,
          barberia_id: usuario.barberia_id
        },
        JWT_SECRET,
        { expiresIn: '8h' }
      );

      logEvent('info', 'AUTH_LOGIN_SUCCESS', { userId: usuario.id, role: usuario.role, tenantId: req.tenant.id });

      return res.status(200).json({
        ok: true,
        token,
        message: 'Inicio de sesión exitoso'
      });
    } catch (error) {
      logEvent('error', 'AUTH_LOGIN_ERROR', { error: error.message, tenantId: req.tenant?.id });
      return res.status(500).json({ message: 'Error interno del servidor' });
    }
  });

  app.get('/api/admin/verify', requireAdmin, (req, res) => {
    res.status(200).json({
      valid: true,
      user: { id: req.user.id, email: req.user.email, role: req.user.role, barberia_id: req.user.barberia_id }
    });
  });

  app.get('/api/admin/events', identificarTenant, requireAdmin, (req, res) => {
    if (!req.tenant?.id) {
      return res.status(400).json({ error: 'Tenant no especificado para SSE' });
    }

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');

    if (typeof res.flushHeaders === 'function') {
      res.flushHeaders();
    }

    const tenantId = req.tenant.id;

    registrarCliente(tenantId, res);

    req.on('close', () => {
      removerCliente(tenantId, res);
      res.end();
    });
  });

  app.get('/health', (req, res) => {
    res.json({ ok: true });
  });

  app.get('/api/servicios', async (req, res) => {
    try {
      if (!req.tenant?.id) {
        return res.status(400).json({ error: 'Tenant no especificado' });
      }

      const [resultados] = await db.query(
        'SELECT id, nombre, descripcion, precio, activo FROM servicios WHERE barberia_id = ? AND activo = TRUE',
        [req.tenant.id]
      );
      return res.json(resultados);
    } catch (error) {
      logEvent('error', 'FETCH_SERVICIOS_ERROR', { error: error.message, tenantId: req.tenant?.id });
      return res.status(500).json({ error: 'Error al obtener los servicios' });
    }
  });

  app.get('/api/disponibilidad/:fecha', async (req, res) => {
    try {
      if (!req.tenant?.id) {
        return res.status(400).json({ error: 'Tenant no especificado' });
      }

      const fecha = req.params.fecha;
      const horarios = generarHorarios(fecha);

      if (!horarios || horarios.length === 0) {
        return res.json([]);
      }

      const [rowsBarberos] = await db.query(
        'SELECT COUNT(*) AS total_barberos FROM barberos WHERE barberia_id = ? AND activo = 1',
        [req.tenant.id]
      );
      const totalBarberos = rowsBarberos[0].total_barberos;

      const capacidadMax = totalBarberos > 0 ? totalBarberos : 1;

      const sql = `
        SELECT TIME_FORMAT(hora, '%H:%i') AS hora_str, COUNT(*) AS total_ocupados
        FROM reservas
        WHERE fecha = ? AND barberia_id = ? AND estado != 'cancelada'
        GROUP BY hora
      `;

      const [resultados] = await db.query(sql, [fecha, req.tenant.id]);

      const mapaOcupados = {};
      resultados.forEach((row) => {
        mapaOcupados[row.hora_str] = row.total_ocupados;
      });

      const horariosRespuesta = horarios.map((horario) => {
        const ocupadosEnEstaHora = mapaOcupados[horario] || 0;

        return {
          hora: horario,
          disponible: ocupadosEnEstaHora < capacidadMax
        };
      });

      return res.json(horariosRespuesta);
    } catch (error) {
      logEvent('error', 'DISPONIBILIDAD_ERROR', { error: error.message, tenantId: req.tenant?.id });
      return res.status(500).json({ error: 'Error al consultar disponibilidad' });
    }
  });

  app.get('/api/admin/fechas-pendientes', requireAdmin, async (req, res) => {
    try {
      const sql = `
        SELECT DISTINCT DATE_FORMAT(fecha, '%Y-%m-%d') AS fecha
        FROM reservas
        WHERE LOWER(estado) = 'pendiente' AND barberia_id = ?
      `;
      const [filas] = await db.query(sql, [req.tenant.id]);
      return res.json(filas.map((fila) => fila.fecha));
    } catch (error) {
      logEvent('error', 'FECHAS_PENDIENTES_ERROR', { error: error.message, tenantId: req.tenant?.id });
      return res.status(500).json({ error: 'Error al obtener fechas con pendientes' });
    }
  });

  app.post('/api/reservas', async (req, res) => {
    if (!req.tenant?.id) {
      return res.status(400).json({ error: 'Tenant no especificado' });
    }

    const { servicio, fecha, hora, cliente } = req.body;

    if (!servicio || !fecha || !hora || !cliente) {
      return res.status(400).json({ error: 'Faltan datos obligatorios para la reserva.' });
    }

    const conexion = await db.getConnection();

    try {
      await conexion.beginTransaction();

      const [rowsBarberos] = await conexion.query(
        'SELECT COUNT(*) AS total_barberos FROM barberos WHERE barberia_id = ? AND activo = 1',
        [req.tenant.id]
      );
      const totalBarberos = rowsBarberos[0].total_barberos;
      const capacidadMax = totalBarberos > 0 ? totalBarberos : 1;

      const [rowsTurnos] = await conexion.query(
        `SELECT COUNT(*) AS ocupados FROM reservas
        WHERE barberia_id = ? AND fecha = ? AND hora = ? AND estado != 'cancelada'
        FOR UPDATE`,
        [req.tenant.id, fecha, hora]
      );
      const turnosOcupados = rowsTurnos[0].ocupados;

      if (turnosOcupados >= capacidadMax) {
        await conexion.rollback();
        return res.status(400).json({
          ok: false,
          error: 'Lo sentimos, este horario acaba de completarse. Por favor, selecciona otro.'
        });
      }

      const queryCliente = `
        INSERT INTO clientes (barberia_id, nombre, telefono, email, observaciones)
        VALUES (?, ?, ?, ?, ?)
      `;
      const valoresCliente = [
        req.tenant.id,
        cliente.nombre || null,
        cliente.telefono || null,
        cliente.email || null,
        cliente.notas || cliente.observaciones || null
      ];

      const [resCliente] = await conexion.query(queryCliente, valoresCliente);

      const tokenCancelacion = crypto.randomBytes(32).toString('hex');

      const queryReserva = `
        INSERT INTO reservas (barberia_id, servicio_id, cliente_id, fecha, hora, estado, barbero_id, token_cancelacion)
        VALUES (?, ?, ?, ?, ?, 'pendiente', NULL, ?)
      `;
      const [resReserva] = await conexion.query(queryReserva, [
        req.tenant.id,
        servicio,
        resCliente.insertId,
        fecha,
        hora,
        tokenCancelacion
      ]);

      await conexion.commit();

      logEvent('info', 'RESERVA_CREATED_WITH_CAPACITY', {
        tenantId: req.tenant.id,
        reservaId: resReserva.insertId,
        clienteId: resCliente.insertId,
        servicioId: servicio
      });

      if (typeof notificarAdmin === 'function') {
        notificarAdmin(req.tenant.id, 'ACTUALIZAR_GRILLA', {
          reservaId: resReserva.insertId,
          accion: 'NUEVA_RESERVA'
        });
      }

      res.status(201).json({
        ok: true,
        idReserva: resReserva.insertId,
        idCliente: resCliente.insertId
      });

      if (cliente.email) {
        (async () => {
          try {
            const [rowsServicio] = await db.query('SELECT nombre FROM servicios WHERE id = ?', [servicio]);
            const nombreServicio = rowsServicio[0]?.nombre || 'Servicio de Barbería';

            await enviarConfirmacionTurno({
              emailCliente: cliente.email,
              nombreCliente: cliente.nombre || 'Cliente',
              fecha,
              hora,
              servicio: nombreServicio,
              barbero: 'Asignado en el local',
              tokenCancelacion,
              subdominio: req.tenant?.subdominio
            });
          } catch (emailError) {
            logEvent('error', 'SEND_CONFIRMATION_EMAIL_ERROR', {
              error: emailError.message,
              reservaId: resReserva.insertId
            });
          }
        })();
      }

    } catch (error) {
      await conexion.rollback();
      logEvent('error', 'CREATE_RESERVA_ERROR', { error: error.message, tenantId: req.tenant?.id });
      return res.status(500).json({ ok: false, error: 'Error al procesar la reserva.' });
    } finally {
      conexion.release();
    }
  });

  app.get('/api/turnos/cancelar', async (req, res) => {
    const { token } = req.query;
    const dominioBase = process.env.BASE_DOMAIN || 'barberiapp.ar';
    const protocol = req.secure || req.headers['x-forwarded-proto'] === 'https' ? 'https' : 'http';

    const fallbackUrl = `${protocol}://demo.${dominioBase}/demo`;

    if (!token) {
      return res.status(400).send(`
        <!DOCTYPE html>
        <html lang="es">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Enlace Inválido</title>
            <style>
                body { background-color: #0f0f0f; color: #f1f1f1; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; padding: 20px; box-sizing: border-box; }
                .card { background-color: #1a1a1a; border: 1px solid #2a2a2a; padding: 40px 30px; border-radius: 12px; text-align: center; width: 100%; max-width: 450px; box-shadow: 0 10px 30px rgba(0,0,0,0.7); display: flex; justify-content: center; align-items: center; flex-direction: column; }
                h2 { color: #ffffff; margin-bottom: 15px; font-size: 24px; }
                p { color: #b0b0b0; font-size: 15px; line-height: 1.6; margin-bottom: 30px; }
                .btn { background-color: #d4af37; color: #111111; padding: 14px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 15px; display: inline-block; transition: background-color 0.2s, transform 0.1s; box-shadow: 0 4px 12px rgba(212, 175, 55, 0.3); }
                .btn:hover { background-color: #e6c553; transform: translateY(-1px); }
                .warning-circle { width: 62px; height: 62px; border-radius: 50%; background: linear-gradient(145deg, #e53e3e, #c53030); border: 2px solid #fc8181; display: flex; justify-content: center; align-items: center; box-shadow: 0 0 0 3px rgba(229, 62, 62, 0.12), 0 8px 20px rgba(0, 0, 0, 0.3); margin-bottom: 20px; }
                .warning-circle svg { width: 32px; height: 32px; stroke: white; stroke-width: 3; fill: none; stroke-linecap: round; stroke-linejoin: round; }
            </style>
        </head>
        <body>
            <div class="card">
                <div class="warning-circle">
                    <svg viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                </div>
                <h2>Enlace inválido</h2>
                <p>El enlace de cancelación proporcionado no es válido.</p>
                <a href="${fallbackUrl}" class="btn">Volver al inicio</a>
            </div>
        </body>
        </html>
      `);
    }

    try {

      const [turnos] = await db.query(
        `SELECT r.*, b.subdominio
         FROM reservas r
         INNER JOIN barberias b ON r.barberia_id = b.id
         WHERE r.token_cancelacion = ?`,
        [token]
      );

      if (turnos.length === 0) {
        return res.status(404).send(`
          <!DOCTYPE html>
          <html lang="es">
          <head>
              <meta charset="UTF-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <title>Turno No Encontrado</title>
              <style>
                  body { background-color: #0f0f0f; color: #f1f1f1; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; padding: 20px; box-sizing: border-box; }
                  .card { background-color: #1a1a1a; border: 1px solid #2a2a2a; padding: 40px 30px; border-radius: 12px; text-align: center; width: 100%; max-width: 450px; box-shadow: 0 10px 30px rgba(0,0,0,0.7); display: flex; justify-content: center; align-items: center; flex-direction: column; }
                  h2 { color: #ffffff; margin-bottom: 15px; font-size: 24px; }
                  p { color: #b0b0b0; font-size: 15px; line-height: 1.6; margin-bottom: 30px; }
                  .btn { background-color: #d4af37; color: #111111; padding: 14px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 15px; display: inline-block; transition: background-color 0.2s, transform 0.1s; box-shadow: 0 4px 12px rgba(212, 175, 55, 0.3); }
                  .btn:hover { background-color: #e6c553; transform: translateY(-1px); }
                  .warning-circle { width: 62px; height: 62px; border-radius: 50%; background: linear-gradient(145deg, #e53e3e, #c53030); border: 2px solid #fc8181; display: flex; justify-content: center; align-items: center; box-shadow: 0 0 0 3px rgba(229, 62, 62, 0.12), 0 8px 20px rgba(0, 0, 0, 0.3); margin-bottom: 20px; }
                  .warning-circle svg { width: 32px; height: 32px; stroke: white; stroke-width: 3; fill: none; stroke-linecap: round; stroke-linejoin: round; }
              </style>
          </head>
          <body>
              <div class="card">
                  <div class="warning-circle">
                      <svg viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                  </div>
                  <h2>Turno no encontrado</h2>
                  <p>No pudimos encontrar una reserva asociada a este enlace.</p>
                  <button onclick="window.close()" class="btn">Cerrar</button>
              </div>
          </body>
          </html>
        `);
      }

      const turno = turnos[0];

      const urlInicio = `${protocol}://${turno.subdominio}.${dominioBase}/demo`;

      if (turno.estado === 'cancelada') {
        return res.send(`
          <!DOCTYPE html>
          <html lang="es">
          <head>
              <meta charset="UTF-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <title>Turno Ya Cancelado</title>
              <style>
                  body { background-color: #0f0f0f; color: #f1f1f1; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; padding: 20px; box-sizing: border-box; }
                  .card { background-color: #1a1a1a; border: 1px solid #2a2a2a; padding: 40px 30px; border-radius: 12px; text-align: center; width: 100%; max-width: 450px; box-shadow: 0 10px 30px rgba(0,0,0,0.7); display: flex; justify-content: center; align-items: center; flex-direction: column; }
                  h2 { color: #ffffff; margin-bottom: 15px; font-size: 24px; }
                  p { color: #b0b0b0; font-size: 15px; line-height: 1.6; margin-bottom: 30px; }
                  .btn { background-color: #d4af37; color: #111111; padding: 14px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 15px; display: inline-block; transition: background-color 0.2s, transform 0.1s; box-shadow: 0 4px 12px rgba(212, 175, 55, 0.3); }
                  .btn:hover { background-color: #e6c553; transform: translateY(-1px); }
                  .info-circle { width: 62px; height: 62px; border-radius: 50%; background: linear-gradient(145deg, #3182ce, #2b6cb0); border: 2px solid #63b3ed; display: flex; justify-content: center; align-items: center; box-shadow: 0 0 0 3px rgba(49, 130, 206, 0.12), 0 8px 20px rgba(0, 0, 0, 0.3); margin-bottom: 20px; }
                  .info-circle svg { width: 32px; height: 32px; stroke: white; stroke-width: 2.5; fill: none; stroke-linecap: round; stroke-linejoin: round; }
              </style>
          </head>
          <body>
              <div class="card">
                  <div class="info-circle">
                      <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
                  </div>
                  <h2>Reserva liberada</h2>
                  <p>Este turno ya se encontraba cancelado anteriormente.</p>
                  <a href="${urlInicio}" class="btn">Agendar otro turno</a>
              </div>
          </body>
          </html>
        `);
      }

      const fechaTurno = new Date(`${turno.fecha} ${turno.hora}`);
      const ahora = new Date();
      let diferenciaHoras = (fechaTurno - ahora) / (1000 * 60 * 60);


      if (diferenciaHoras < 3) {
        return res.send(`
          <!DOCTYPE html>
          <html lang="es">
          <head>
              <meta charset="UTF-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <title>No es posible cancelar</title>
              <style>
                  body { background-color: #0f0f0f; color: #f1f1f1; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; padding: 20px; box-sizing: border-box; }
                  .card { background-color: #1a1a1a; border: 1px solid #2a2a2a; padding: 40px 30px; border-radius: 12px; text-align: center; width: 100%; max-width: 450px; box-shadow: 0 10px 30px rgba(0,0,0,0.7); display: flex; justify-content: center; align-items: center; flex-direction: column; }
                  h2 { color: #ffffff; margin-bottom: 15px; font-size: 24px; }
                  p { color: #b0b0b0; font-size: 15px; line-height: 1.6; margin-bottom: 30px; }
                  .btn { background-color: #d4af37; color: #111111; padding: 14px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 15px; display: inline-block; transition: background-color 0.2s, transform 0.1s; box-shadow: 0 4px 12px rgba(212, 175, 55, 0.3); }
                  .btn:hover { background-color: #e6c553; transform: translateY(-1px); }
                  .warning-circle { width: 62px; height: 62px; border-radius: 50%; background: linear-gradient(145deg, #e53e3e, #c53030); border: 2px solid #fc8181; display: flex; justify-content: center; align-items: center; box-shadow: 0 0 0 3px rgba(229, 62, 62, 0.12), 0 8px 20px rgba(0, 0, 0, 0.3); margin-bottom: 20px; }
                  .warning-circle svg { width: 32px; height: 32px; stroke: white; stroke-width: 3; fill: none; stroke-linecap: round; stroke-linejoin: round; }
              </style>
          </head>
          <body>
              <div class="card">
                  <div class="warning-circle">
                      <svg viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                  </div>
                  <h2>Límite de tiempo excedido</h2>
                  <p>No es posible cancelar el turno con menos de 3 horas de anticipación. Por favor, comunícate directamente con la barbería.</p>
                  <a href="${urlInicio}" class="btn">Volver al inicio</a>
              </div>
          </body>
          </html>
        `);
      }

      await db.query('UPDATE reservas SET estado = ? WHERE token_cancelacion = ?', ['cancelada', token]);

      return res.send(`
        <!DOCTYPE html>
        <html lang="es">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Turno Cancelado con Éxito</title>
            <style>
                body { background-color: #0f0f0f; color: #f1f1f1; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; padding: 20px; box-sizing: border-box; }
                .card { background-color: #1a1a1a; border: 1px solid #2a2a2a; padding: 40px 30px; border-radius: 12px; text-align: center; width: 100%; max-width: 450px; box-shadow: 0 10px 30px rgba(0,0,0,0.7); display: flex; justify-content: center; align-items: center; flex-direction: column; }
                h2 { color: #ffffff; margin-bottom: 15px; font-size: 24px; }
                p { color: #b0b0b0; font-size: 15px; line-height: 1.6; margin-bottom: 30px; }
                .btn { background-color: #d4af37; color: #111111; padding: 14px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 15px; display: inline-block; transition: background-color 0.2s, transform 0.1s; box-shadow: 0 4px 12px rgba(212, 175, 55, 0.3); }
                .btn:hover { background-color: #e6c553; transform: translateY(-1px); }
                .success-circle { width: 62px; height: 62px; border-radius: 50%; background: linear-gradient(145deg, #dcae4d, #b98222); border: 2px solid #f0c86c; display: flex; justify-content: center; align-items: center; box-shadow: 0 0 0 3px rgba(218, 169, 72, 0.12), 0 8px 20px rgba(0, 0, 0, 0.3); margin-bottom: 20px; animation: successPop 0.5s ease-out; }
                .success-circle svg { width: 34px; height: 34px; stroke: white; stroke-width: 3; fill: none; stroke-linecap: round; stroke-linejoin: round; }
            </style>
        </head>
        <body>
            <div class="card">
                <div class="success-circle">
                    <svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"></polyline></svg>
                </div>
                <h2>¡Turno cancelado con éxito!</h2>
                <p>El horario ha sido liberado. ¡ Esperamos verte pronto !</p>
                <a href="${urlInicio}" class="btn">Agendar otro turno</a>
            </div>
        </body>
        </html>
      `);
    } catch (error) {
      logEvent('error', 'CANCELAR_TURNO_ERROR', { error: error.message });
      return res.status(500).send(`
        <!DOCTYPE html>
        <html lang="es">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Error del Servidor</title>
            <style>
                body { background-color: #0f0f0f; color: #f1f1f1; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; padding: 20px; box-sizing: border-box; }
                .card { background-color: #1a1a1a; border: 1px solid #2a2a2a; padding: 40px 30px; border-radius: 12px; text-align: center; width: 100%; max-width: 450px; box-shadow: 0 10px 30px rgba(0,0,0,0.7); display: flex; justify-content: center; align-items: center; flex-direction: column; }
                h2 { color: #ffffff; margin-bottom: 15px; font-size: 24px; }
                p { color: #b0b0b0; font-size: 15px; line-height: 1.6; margin-bottom: 30px; }
                .btn { background-color: #d4af37; color: #111111; padding: 14px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 15px; display: inline-block; transition: background-color 0.2s, transform 0.1s; box-shadow: 0 4px 12px rgba(212, 175, 55, 0.3); }
                .btn:hover { background-color: #e6c553; transform: translateY(-1px); }
                .warning-circle { width: 62px; height: 62px; border-radius: 50%; background: linear-gradient(145deg, #e53e3e, #c53030); border: 2px solid #fc8181; display: flex; justify-content: center; align-items: center; box-shadow: 0 0 0 3px rgba(229, 62, 62, 0.12), 0 8px 20px rgba(0, 0, 0, 0.3); margin-bottom: 20px; }
                .warning-circle svg { width: 32px; height: 32px; stroke: white; stroke-width: 3; fill: none; stroke-linecap: round; stroke-linejoin: round; }
            </style>
        </head>
        <body>
            <div class="card">
                <div class="warning-circle">
                    <svg viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                </div>
                <h2>Ocurrió un error</h2>
                <p>Ocurrió un error al procesar la cancelación. Por favor, intenta nuevamente más tarde.</p>
                <button onclick="window.close()" class="btn">Cerrar</button>
            </div>
        </body>
        </html>
      `);
    }
  });

  app.get('/api/admin/reservas', requireAdmin, async (req, res) => {
    try {
      const { fecha, estado, query, orden = 'DESC' } = req.query;

      const orderDir = String(orden).toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

      let sql = `
        SELECT
          r.id AS reserva_id,
          r.fecha,
          TIME_FORMAT(r.hora, '%H:%i') AS hora,
          r.estado,
          r.barbero_id,
          c.nombre AS cliente_nombre,
          c.telefono AS cliente_telefono,
          s.nombre AS servicio_nombre,
          s.precio AS servicio_precio,
          b.nombre AS barbero_nombre
        FROM reservas r
        INNER JOIN clientes c ON r.cliente_id = c.id
        INNER JOIN servicios s ON r.servicio_id = s.id
        LEFT JOIN barberos b ON r.barbero_id = b.id
        WHERE r.barberia_id = ?
      `;

      const params = [req.tenant.id];

      if (fecha) {
        sql += ' AND r.fecha = ?';
        params.push(fecha);
      }

      if (estado && estado !== 'todos') {
        sql += ' AND r.estado = ?';
        params.push(estado);
      }

      if (query && query.trim() !== '') {
        sql += ` AND (
          c.nombre LIKE ? OR
          c.telefono LIKE ? OR
          s.nombre LIKE ? OR
          b.nombre LIKE ?
        )`;
        const searchTerm = `%${query.trim()}%`;
        params.push(searchTerm, searchTerm, searchTerm, searchTerm);
      }

      sql += ` ORDER BY r.fecha ${orderDir}, r.hora ${orderDir}`;

      const [reservas] = await db.query(sql, params);
      return res.json(reservas);

    } catch (error) {
      logEvent('error', 'FETCH_RESERVAS_ADMIN_ERROR', { error: error.message, tenantId: req.tenant?.id });
      return res.status(500).json({ message: 'Error al consultar las reservas.' });
    }
  });

  app.patch('/api/admin/reservas/:id/estado', requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const { estado } = req.body;
      const estadosPermitidos = ['pendiente', 'confirmada', 'completada', 'cancelada'];

      if (!estadosPermitidos.includes(estado)) {
        return res.status(400).json({ message: 'Estado no válido.' });
      }

      const [result] = await db.query(
        'UPDATE reservas SET estado = ? WHERE id = ? AND barberia_id = ?',
        [estado, id, req.tenant.id]
      );

      if (result.affectedRows === 0) {
        return res.status(404).json({ message: 'Reserva no encontrada.' });
      }

      logEvent('info', 'RESERVA_STATUS_UPDATED', {
        tenantId: req.tenant.id,
        reservaId: Number(id),
        newStatus: estado
      });

      notificarAdmin(req.tenant.id, 'ACTUALIZAR_GRILLA', {
        reservaId: Number(id),
        nuevoEstado: estado
      });

      return res.json({ message: `Turno marcado como ${estado} con éxito.` });
    } catch (error) {
      logEvent('error', 'UPDATE_RESERVA_STATUS_ERROR', {
        tenantId: req.tenant?.id,
        reservaId: req.params.id,
        error: error.message
      });
      return res.status(500).json({ message: 'Error interno en el servidor.' });
    }
  });

  app.get('/api/admin/metricas', requireAdmin, async (req, res) => {
    try {
      const fechaParam = req.query.fecha;
      const esTodas = !fechaParam || fechaParam === 'todas';

      let sqlHoy = "SELECT COUNT(*) as total FROM reservas WHERE barberia_id = ? AND estado != 'cancelada'";
      let sqlPendientes = "SELECT COUNT(*) as total FROM reservas WHERE barberia_id = ? AND estado = 'pendiente'";
      let sqlCompletados = "SELECT COUNT(*) as total FROM reservas WHERE barberia_id = ? AND estado = 'completada'";

      const params = [req.tenant.id];

      if (!esTodas) {
        sqlHoy += ' AND fecha = ?';
        sqlPendientes += ' AND fecha = ?';
        sqlCompletados += ' AND fecha = ?';
        params.push(fechaParam);
      }

      const [turnosDia] = await db.query(sqlHoy, params);
      const [pendientesDia] = await db.query(sqlPendientes, params);
      const [completadosDia] = await db.query(sqlCompletados, params);

      return res.json({
        hoy: turnosDia[0]?.total || 0,
        pendientes: pendientesDia[0]?.total || 0,
        completados: completadosDia[0]?.total || 0
      });
    } catch (error) {
      logEvent('error', 'FETCH_METRICAS_ERROR', { error: error.message, tenantId: req.tenant?.id });
      return res.status(500).json({ message: 'Error interno del servidor.' });
    }
  });

  app.patch('/api/admin/reservas/:id/barbero', requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const { barbero_id } = req.body;

      const [result] = await db.query(
        'UPDATE reservas SET barbero_id = ? WHERE id = ? AND barberia_id = ?',
        [barbero_id || null, id, req.tenant.id]
      );

      if (result.affectedRows === 0) {
        return res.status(404).json({ message: 'Reserva no encontrada.' });
      }

      return res.json({ ok: true, message: 'Barbero asignado con éxito.' });
    } catch (error) {
      logEvent('error', 'ASSIGN_BARBERO_ERROR', { error: error.message, tenantId: req.tenant?.id });
      return res.status(500).json({ message: 'Error al asignar el barbero.' });
    }
  });

  app.get('/api/admin/barberos', requireAdmin, async (req, res) => {
    try {
      const [barberos] = await db.query(
        'SELECT id, nombre FROM barberos WHERE barberia_id = ? AND activo = 1',
        [req.tenant.id]
      );
      return res.json(barberos);
    } catch (error) {
      logEvent('error', 'FETCH_BARBEROS_ERROR', { error: error.message, tenantId: req.tenant?.id });
      return res.status(500).json({ message: 'Error al obtener los barberos.' });
    }
  });

}

module.exports = registerRoutes;
