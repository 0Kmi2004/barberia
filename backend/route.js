const db = require('./config/database');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { generarHorarios } = require('./utils/horarios');

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  throw new Error('JWT_SECRET debe estar configurado');
}

/**
 * Middleware para requerir que el usuario sea administrador.
 * @param {*} req
 * @param {*} res
 * @param {*} next
 * @returns
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
console.log('🔥 SERVIDOR INICIADO EN EL PUERTO 3000 🔥');
function registerRoutes(app) {
  /**
   * Handles user login requests.
   * Validates the provided email and password, and returns a JWT token if successful.
   * @param {*} req - The request object containing email and password in the body.
   * @param {*} res - The response object used to send back the result.
   * @returns {void}
   */
  app.post('/api/auth/login', async (req, res) => {
    try {
      const { email, password } = req.body;
      console.log('📌 Intento de login con:', { email, password });
      if (!email || !password) {
        return res.status(400).json({ message: 'El correo y la contraseña son obligatorios' });
      }

      const sql = 'SELECT * FROM usuarios WHERE email = ?';
      const [usuarios] = await db.query(sql, [email]);
      console.log('📌 Usuarios encontrados en BD:', usuarios.length);
      if (usuarios.length === 0) {
        return res.status(401).json({ message: 'Credenciales incorrectas' });
      }

      const usuario = usuarios[0];
      const passwordCoincide = await bcrypt.compare(password, usuario.password);

      if (!passwordCoincide) {
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

      return res.status(200).json({
        ok: true,
        token,
        message: 'Inicio de sesión exitoso'
      });
    } catch (error) {
      console.error('Error al procesar el login:', error);
      return res.status(500).json({ message: 'Error interno del servidor' });
    }
  });
  /**
   * Handles requests to verify if the user is an admin.
   * Requires a valid JWT token in the Authorization header.
   * @param {*} req - The request object containing the Authorization header.
   * @param {*} res - The response object used to send back the result.
   * @returns {void}
   */
  app.get('/api/admin/verify', requireAdmin, (req, res) => {
    res.status(200).json({
      valid: true,
      user: { id: req.user.id, email: req.user.email, role: req.user.role }
    });
  });

  /**
   * Handles health check requests.
   * Returns a simple JSON response indicating the server is running.
   * @param {*} req - The request object.
   * @param {*} res - The response object used to send back the result.
   * @returns {void}
   */
  app.get('/health', (req, res) => {
    res.json({ ok: true });
  });

  /**
   * Handles requests to retrieve all available services.
   * Queries the database for all services and returns them in JSON format.
   * @param {*} req - The request object.
   * @param {*} res - The response object used to send back the result.
   * @returns {void}
   */
  app.get('/api/servicios', async (req, res) => {
    try {
      const [resultados] = await db.query('SELECT * FROM servicios');
      return res.json(resultados);
    } catch (error) {
      console.error('Error al obtener servicios:', error);
      return res.status(500).json({ error: 'Error al obtener los servicios' });
    }
  });

  /**
   * Handles requests to check availability for a specific date.
   * Generates available time slots and checks against existing reservations.
   * @param {*} req - The request object containing the date parameter.
   * @param {*} res - The response object used to send back the result.
   * @returns {void}
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
        WHERE fecha = ?
      `;

      const [resultados] = await db.query(sql, [fecha]);
      const horariosOcupados = resultados.map((reserva) => reserva.hora);
      const horariosRespuesta = horarios.map((horario) => ({
        hora: horario,
        disponible: !horariosOcupados.includes(horario)
      }));

      return res.json(horariosRespuesta);
    } catch (error) {
      console.error('Error al consultar disponibilidad:', error);
      return res.status(500).json({ error: 'Error al consultar disponibilidad' });
    }
  });

  /**
   * Handles requests to retrieve distinct dates with pending reservations.
   * Requires the user to be an admin.
   * Queries the database for distinct dates where reservations are pending.
   * @param {*} req - The request object.
   * @param {*} res - The response object used to send back the result.
   * @returns {void}
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
      return res.status(500).json({ error: 'Error al obtener fechas con pendientes' });
    }
  });

  /**
   * Handles requests to create a new reservation.
   * Inserts a new client and reservation into the database.
   * @param {*} req - The request object containing reservation details in the body.
   * @param {*} res - The response object used to send back the result.
   * @returns {void}
   */
  app.post('/api/reservas', async (req, res) => {
    try {
      const { servicio, fecha, hora, cliente } = req.body;
      const queryCliente = `
        INSERT INTO clientes (nombre, telefono, email, observaciones)
        VALUES (?, ?, ?, ?)
      `;
      const valoresCliente = [
        cliente.nombre || null,
        cliente.telefono || null,
        cliente.email || null,
        cliente.notas || cliente.observaciones || null
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

      return res.status(201).json({
        ok: true,
        idReserva: resReserva.insertId,
        idCliente: resCliente.insertId
      });
    } catch (error) {
      console.error('Error al insertar en la base de datos:', error);
      return res.status(500).json({ ok: false, error: error.message });
    }
  });

  /**
   * Handles requests to retrieve all reservations.
   * Requires the user to be an admin.
   * @param {*} req - The request object.
   * @param {*} res - The response object used to send back the result.
   * @returns {void}
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
      console.error('Error al filtrar reservas:', error);
      return res.status(401).json({ message: 'Sesión inválida o error en el servidor' });
    }
  });

  /**
   * Handles requests to update the status of a reservation.
   * Requires the user to be an admin.
   * @param {*} req - The request object.
   * @param {*} res - The response object used to send back the result.
   * @returns {void}
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
      return res.json({ message: `Turno marcado como ${estado} con éxito.` });
    } catch (error) {
      console.error('Error al actualizar estado:', error);
      return res.status(500).json({ message: 'Error en el servidor o token inválido.' });
    }
  });

  /**
   * Handles requests to retrieve admin metrics.
   * Requires the user to be an admin.
   * @param {*} req - The request object.
   * @param {*} res - The response object used to send back the result.
   * @returns {void}
   */
  app.get('/api/admin/metricas', requireAdmin, async (req, res) => {
    try {
      const fecha = req.query.fecha || new Date().toISOString().split('T')[0];
      const [turnosDia] = await db.query(
        'SELECT COUNT(*) as total FROM reservas WHERE fecha = ? AND estado != "cancelada"',
        [fecha]
      );
      const [pendientesDia] = await db.query(
        'SELECT COUNT(*) as total FROM reservas WHERE fecha = ? AND estado = "pendiente"',
        [fecha]
      );
      const [completadosDia] = await db.query(
        'SELECT COUNT(*) as total FROM reservas WHERE fecha = ? AND estado = "completada"',
        [fecha]
      );

      return res.json({
        hoy: turnosDia[0].total || 0,
        pendientes: pendientesDia[0].total || 0,
        completados: completadosDia[0].total || 0
      });
    } catch (error) {
      console.error('Error al obtener métricas:', error);
      return res.status(500).json({ message: 'Error interno del servidor.' });
    }
  });
}

// Export the registerRoutes function for use in other modules (e.g., apps.js).
module.exports = registerRoutes;
