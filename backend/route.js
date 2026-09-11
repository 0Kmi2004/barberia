const db = require('./config/database');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { generarHorarios } = require('./utils/horarios');

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  throw new Error('JWT_SECRET debe estar configurado');
}

/**
 * Helper para emitir logs en formato JSON estructurado respetando las reglas de observabilidad.
 * @param {string} level - 'info' | 'warn' | 'error'
 * @param {string} event - Nombre corto del evento
 * @param {Object} details - Datos adjuntos (excluye deliberadamente PII, tokens y contraseñas)
 */
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
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) {
    return res.status(401).json({ message: 'No autorizado' });
  }

  if (!req.tenant?.id) {
    return res.status(400).json({ message: 'Tenant no especificado' });
  }

  try {
    const user = jwt.verify(token, JWT_SECRET);

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

/**
 * Registers the application routes.
 * @param {*} app - The Express application instance.
 */
function registerRoutes(app) {

  app.get('/api/barberia/configuracion', async (req, res) => {
    try {
      if (!req.tenant?.id) {
        return res.status(400).json({ error: 'Tenant no especificado' });
      }

      const [barberias] = await db.query(
        'SELECT * FROM barberias WHERE id = ? LIMIT 1',
        [req.tenant.id]
      );

      const b = barberias[0] || {};

      console.log('📋 Datos leídos de Aiven para tenant:', req.tenant.id, b);

      let servicios = [];
      try {
        const [rows] = await db.query(
          'SELECT id, nombre, descripcion, precio, activo FROM servicios WHERE barberia_id = ? AND activo = TRUE',
          [req.tenant.id]
        );
        servicios = rows;
      } catch (_e) {
        servicios = [];
      }

      return res.json({
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

      });

    } catch (error) {
      console.error('Error en /api/barberia/configuracion:', error);
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

      const sql = `
        SELECT TIME_FORMAT(hora, '%H:%i') AS hora
        FROM reservas
        WHERE fecha = ? AND barberia_id = ? AND estado != 'cancelada'
      `;

      const [resultados] = await db.query(sql, [fecha, req.tenant.id]);
      const horariosOcupados = resultados.map((reserva) => reserva.hora);
      const horariosRespuesta = horarios.map((horario) => ({
        hora: horario,
        disponible: !horariosOcupados.includes(horario)
      }));

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
    try {
      if (!req.tenant?.id) {
        return res.status(400).json({ error: 'Tenant no especificado' });
      }

      const { servicio, fecha, hora, cliente } = req.body;

      const queryCliente = `
        INSERT INTO clientes (barberia_id, nombre, telefono, email, observaciones)
        VALUES (?, ?, ?, ?, ?)
      `;
      const valoresCliente = [
        req.tenant.id,
        cliente?.nombre || null,
        cliente?.telefono || null,
        cliente?.email || null,
        cliente?.notas || cliente?.observaciones || null
      ];

      const [resCliente] = await db.query(queryCliente, valoresCliente);

      const queryReserva = `
        INSERT INTO reservas (barberia_id, servicio_id, cliente_id, fecha, hora)
        VALUES (?, ?, ?, ?, ?)
      `;
      const [resReserva] = await db.query(queryReserva, [
        req.tenant.id,
        servicio,
        resCliente.insertId,
        fecha,
        hora
      ]);

      logEvent('info', 'RESERVA_CREATED', {
        tenantId: req.tenant.id,
        reservaId: resReserva.insertId,
        clienteId: resCliente.insertId,
        servicioId: servicio
      });

      return res.status(201).json({
        ok: true,
        idReserva: resReserva.insertId,
        idCliente: resCliente.insertId
      });
    } catch (error) {
      logEvent('error', 'CREATE_RESERVA_ERROR', { error: error.message, tenantId: req.tenant?.id });
      return res.status(500).json({ ok: false, error: 'Error al procesar la reserva.' });
    }
  });

  app.get('/api/admin/reservas', requireAdmin, async (req, res) => {
    try {
      const { fecha, estado, orden = 'DESC' } = req.query;

      const orderDir = String(orden).toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

      let sql = `
        SELECT
          r.id AS reserva_id,
          r.fecha,
          TIME_FORMAT(r.hora, '%H:%i') AS hora,
          r.estado,
          c.nombre AS cliente_nombre,
          c.telefono AS cliente_telefono,
          s.nombre AS servicio_nombre,
          s.precio AS servicio_precio
        FROM reservas r
        INNER JOIN clientes c ON r.cliente_id = c.id
        INNER JOIN servicios s ON r.servicio_id = s.id
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

}

module.exports = registerRoutes;
