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

/**
 * Middleware para requerir que el usuario sea administrador.
 */
function requireAdmin(req, res, next) {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) {
    return res.status(401).json({ message: 'No autorizado' });
  }

  try {
    const user = jwt.verify(token, JWT_SECRET);
    if (user.role !== 'admin') {
      logEvent('warn', 'AUTH_FORBIDDEN_ACCESS', { userId: user.id, path: req.originalUrl });
      return res.status(403).json({ message: 'Permisos insuficientes' });
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
  /**
   * Handles user login requests.
   */
  app.post('/api/auth/login', async (req, res) => {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({ message: 'El correo y la contraseña son obligatorios' });
      }

      const sql = 'SELECT * FROM usuarios WHERE email = ?';
      const [usuarios] = await db.query(sql, [email]);

      if (usuarios.length === 0) {
        logEvent('warn', 'AUTH_LOGIN_FAILED', { reason: 'USER_NOT_FOUND' });
        return res.status(401).json({ message: 'Credenciales incorrectas' });
      }

      const usuario = usuarios[0];
      const passwordCoincide = await bcrypt.compare(password, usuario.password);

      if (!passwordCoincide) {
        logEvent('warn', 'AUTH_LOGIN_FAILED', { userId: usuario.id, reason: 'INVALID_PASSWORD' });
        return res.status(401).json({ message: 'Credenciales incorrectas' });
      }

      const token = jwt.sign(
        {
          id: usuario.id,
          email: usuario.email,
          role: usuario.role
        },
        JWT_SECRET,
        { expiresIn: '8h' }
      );

      // Evento de login sin registrar contraseñas, hashes ni JWT
      logEvent('info', 'AUTH_LOGIN_SUCCESS', { userId: usuario.id, role: usuario.role });

      return res.status(200).json({
        ok: true,
        token,
        message: 'Inicio de sesión exitoso'
      });
    } catch (error) {
      logEvent('error', 'AUTH_LOGIN_ERROR', { error: error.message });
      return res.status(500).json({ message: 'Error interno del servidor' });
    }
  });

  /**
   * Handles requests to verify if the user is an admin.
   */
  app.get('/api/admin/verify', requireAdmin, (req, res) => {
    res.status(200).json({
      valid: true,
      user: { id: req.user.id, email: req.user.email, role: req.user.role }
    });
  });

  /**
   * Handles health check requests.
   */
  app.get('/health', (req, res) => {
    res.json({ ok: true });
  });

  /**
   * Handles requests to retrieve all available services.
   */
  app.get('/api/servicios', async (req, res) => {
    try {
      const [resultados] = await db.query('SELECT * FROM servicios');
      return res.json(resultados);
    } catch (error) {
      logEvent('error', 'FETCH_SERVICIOS_ERROR', { error: error.message });
      return res.status(500).json({ error: 'Error al obtener los servicios' });
    }
  });

  /**
   * Handles requests to check availability for a specific date.
   */
  app.get('/api/disponibilidad/:fecha', async (req, res) => {
    try {
      const fecha = req.params.fecha;
      const horarios = generarHorarios(fecha);

      if (!horarios || horarios.length === 0) {
        return res.json([]);
      }

      const sql = `
        SELECT TIME_FORMAT(hora, '%H:%i') AS hora
        FROM reservas
        WHERE fecha = ? AND estado != 'cancelada'
      `;

      const [resultados] = await db.query(sql, [fecha]);
      const horariosOcupados = resultados.map((reserva) => reserva.hora);
      const horariosRespuesta = horarios.map((horario) => ({
        hora: horario,
        disponible: !horariosOcupados.includes(horario)
      }));

      return res.json(horariosRespuesta);
    } catch (error) {
      logEvent('error', 'DISPONIBILIDAD_ERROR', { error: error.message });
      return res.status(500).json({ error: 'Error al consultar disponibilidad' });
    }
  });

  /**
   * Handles requests to retrieve distinct dates with pending reservations.
   */
  app.get('/api/admin/fechas-pendientes', requireAdmin, async (req, res) => {
    try {
      const sql = `
        SELECT DISTINCT DATE_FORMAT(fecha, '%Y-%m-%d') AS fecha
        FROM reservas
        WHERE LOWER(estado) = 'pendiente'
      `;
      const [filas] = await db.query(sql);
      return res.json(filas.map((fila) => fila.fecha));
    } catch (error) {
      logEvent('error', 'FECHAS_PENDIENTES_ERROR', { error: error.message });
      return res.status(500).json({ error: 'Error al obtener fechas con pendientes' });
    }
  });

  /**
   * Handles requests to create a new reservation.
   */
  app.post('/api/reservas', async (req, res) => {
    try {
      const { servicio, fecha, hora, cliente } = req.body;

      const queryCliente = `
        INSERT INTO clientes (nombre, telefono, email, observaciones)
        VALUES (?, ?, ?, ?)
      `;
      const valoresCliente = [
        cliente?.nombre || null,
        cliente?.telefono || null,
        cliente?.email || null,
        cliente?.notas || cliente?.observaciones || null
      ];

      const [resCliente] = await db.query(queryCliente, valoresCliente);

      const queryReserva = `
        INSERT INTO reservas (servicio_id, cliente_id, fecha, hora)
        VALUES (?, ?, ?, ?)
      `;
      const [resReserva] = await db.query(queryReserva, [
        servicio,
        resCliente.insertId,
        fecha,
        hora
      ]);

      // Log que cumple con la regla de registrar sólo IDs (Sin datos personales)
      logEvent('info', 'RESERVA_CREATED', {
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
      logEvent('error', 'CREATE_RESERVA_ERROR', { error: error.message });
      return res.status(500).json({ ok: false, error: 'Error al procesar la reserva.' });
    }
  });

  /**
   * Handles requests to retrieve all reservations for admin.
   */
  app.get('/api/admin/reservas', requireAdmin, async (req, res) => {
    try {
      const { fecha, estado, orden = 'DESC' } = req.query;
      const direccion = orden.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

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
      `;

      const whereClauses = [];
      const params = [];

      if (fecha) {
        whereClauses.push('r.fecha = ?');
        params.push(fecha);
      }
      if (estado && estado !== 'todos') {
        whereClauses.push('r.estado = ?');
        params.push(estado);
      }
      if (whereClauses.length > 0) {
        sql += ` WHERE ${whereClauses.join(' AND ')}`;
      }

      sql += ` ORDER BY r.fecha ${direccion}, r.hora ${direccion}`;

      const [reservas] = await db.query(sql, params);
      return res.json(reservas);
    } catch (error) {
      logEvent('error', 'FETCH_RESERVAS_ADMIN_ERROR', { error: error.message });
      return res.status(500).json({ message: 'Error al consultar las reservas.' });
    }
  });

  /**
   * Handles requests to update the status of a reservation.
   */
  app.patch('/api/admin/reservas/:id/estado', requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const { estado } = req.body;
      const estadosPermitidos = ['pendiente', 'confirmada', 'completada', 'cancelada'];

      if (!estadosPermitidos.includes(estado)) {
        return res.status(400).json({ message: 'Estado no válido.' });
      }

      const [result] = await db.query(
        'UPDATE reservas SET estado = ? WHERE id = ?',
        [estado, id]
      );

      if (result.affectedRows === 0) {
        return res.status(404).json({ message: 'Reserva no encontrada.' });
      }

      // Log seguro referenciando únicamente el ID de la reserva
      logEvent('info', 'RESERVA_STATUS_UPDATED', { reservaId: Number(id), newStatus: estado });

      return res.json({ message: `Turno marcado como ${estado} con éxito.` });
    } catch (error) {
      logEvent('error', 'UPDATE_RESERVA_STATUS_ERROR', { reservaId: req.params.id, error: error.message });
      return res.status(500).json({ message: 'Error interno en el servidor.' });
    }
  });

  /**
   * Handles requests to retrieve admin metrics.
   */
  app.get('/api/admin/metricas', requireAdmin, async (req, res) => {
    try {
      const fechaParam = req.query.fecha;
      const esTodas = !fechaParam || fechaParam === 'todas';

      let sqlHoy = 'SELECT COUNT(*) as total FROM reservas WHERE estado != "cancelada"';
      let sqlPendientes = 'SELECT COUNT(*) as total FROM reservas WHERE estado = "pendiente"';
      let sqlCompletados = 'SELECT COUNT(*) as total FROM reservas WHERE estado = "completada"';

      const params = [];

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
      logEvent('error', 'FETCH_METRICAS_ERROR', { error: error.message });
      return res.status(500).json({ message: 'Error interno del servidor.' });
    }
  });
}

module.exports = registerRoutes;
