const db = require('./config/database');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { generarHorarios } = require('./utils/horarios');

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  throw new Error('JWT_SECRET debe estar configurado');
}

/**
 * función transversal que alimenta los logs de Node.js y, por ende, los registros de PM2 en tu VPS de Hostinger.
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
 * verifica el rol del administrador y tenant.
 */
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

function registerRoutes(app) {

  /**
   * consulta la configuracion estetica de la barbería.
   */
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

  /**
   * se coneta con la tabla usuarios para validar contraseña y generar un token JWT para el usuario.
   */
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

  /**
   * valida el token JWT con el middleware requireAdmin
   */
  app.get('/api/admin/verify', requireAdmin, (req, res) => {
    res.status(200).json({
      valid: true,
      user: { id: req.user.id, email: req.user.email, role: req.user.role, barberia_id: req.user.barberia_id }
    });
  });

  /**
   * confirma el backend este online
   */
  app.get('/health', (req, res) => {
    res.json({ ok: true });
  });

  /**
   * filtra los servicios segun el tenant
   */
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

  /**
   * calcula qué bloques horarios están libres u ocupados en el día seleccionado.
   */
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

      // 1. Obtener el total de barberos activos del tenant actual
      const [rowsBarberos] = await db.query(
        'SELECT COUNT(*) AS total_barberos FROM barberos WHERE barberia_id = ? AND activo = 1',
        [req.tenant.id]
      );
      const totalBarberos = rowsBarberos[0].total_barberos;

      // Si por alguna razón no hay barberos configurados, establecemos un mínimo de 1 para evitar errores de división o lógica
      const capacidadMax = totalBarberos > 0 ? totalBarberos : 1;

      // 2. Contar cuántos turnos ocupados existen agrupados por hora para esa fecha
      const sql = `
        SELECT TIME_FORMAT(hora, '%H:%i') AS hora_str, COUNT(*) AS total_ocupados
        FROM reservas
        WHERE fecha = ? AND barberia_id = ? AND estado != 'cancelada'
        GROUP BY hora
      `;

      const [resultados] = await db.query(sql, [fecha, req.tenant.id]);

      // Creamos un mapa rápido para consultar el conteo por cada hora (ej: { '15:00': 2 })
      const mapaOcupados = {};
      resultados.forEach((row) => {
        mapaOcupados[row.hora_str] = row.total_ocupados;
      });

      // 3. Mapear los horarios evaluando si la cantidad de ocupados es menor a la capacidad máxima
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

  /**
   * consulta las fechas que tienen reservas pendientes para el administrador.
   */
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

  /**
   * crea la reserva registrando los datos en las tablas clientes y reservas.
   */
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

      // 1. Obtener la capacidad máxima basada en los barberos activos
      const [rowsBarberos] = await conexion.query(
        'SELECT COUNT(*) AS total_barberos FROM barberos WHERE barberia_id = ? AND activo = 1',
        [req.tenant.id]
      );
      const totalBarberos = rowsBarberos[0].total_barberos;
      const capacidadMax = totalBarberos > 0 ? totalBarberos : 1;

      // 2. Contar los turnos ocupados bloqueando las filas concurrentes con FOR UPDATE
      const [rowsTurnos] = await conexion.query(
        `SELECT COUNT(*) AS ocupados FROM reservas
         WHERE barberia_id = ? AND fecha = ? AND hora = ? AND estado != 'cancelada'
         FOR UPDATE`,
        [req.tenant.id, fecha, hora]
      );
      const turnosOcupados = rowsTurnos[0].ocupados;

      // 3. Validar si se superó la capacidad de barberos disponibles
      if (turnosOcupados >= capacidadMax) {
        await conexion.rollback();
        return res.status(400).json({
          ok: false,
          error: 'Lo sentimos, este horario acaba de completarse. Por favor, selecciona otro.'
        });
      }

      // 4. Registrar o guardar el cliente
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

      // 5. Registrar la reserva con barbero_id en NULL (para que el admin lo asigne luego)
      const queryReserva = `
        INSERT INTO reservas (barberia_id, servicio_id, cliente_id, fecha, hora, estado, barbero_id)
        VALUES (?, ?, ?, ?, ?, 'pendiente', NULL)
      `;
      const [resReserva] = await conexion.query(queryReserva, [
        req.tenant.id,
        servicio,
        resCliente.insertId,
        fecha,
        hora
      ]);

      await conexion.commit();

      logEvent('info', 'RESERVA_CREATED_WITH_CAPACITY', {
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
      await conexion.rollback();
      logEvent('error', 'CREATE_RESERVA_ERROR', { error: error.message, tenantId: req.tenant?.id });
      return res.status(500).json({ ok: false, error: 'Error al procesar la reserva.' });
    } finally {
      // Garantiza que la conexión siempre se devuelva al pool, ocurra un error o éxito
      conexion.release();
    }
  });

  /**
   * hace consultas relacionales para filtrar las reservas según la fecha, el estado y el orden de presentación para el administrador.
   */
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

      // Buscador inteligente en tiempo real para Cliente, Teléfono, Servicio o Barbero
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

  /**
   * cambia el estado de la reserva.
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

  /**
   * calcula las métricas para el administrador.
   */
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

  /**
   * asigna barbero a una reserva en el panel.
   */
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

  /**
   * carga los barberos activos en el desplegable.
   */
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
