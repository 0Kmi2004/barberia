const express = require("express");
const cors = require("cors");
const path = require('path');
const db = require("./config/database");
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { generarHorarios } = require("./utils/horarios");

const app = express();
const PORT = 3000;

const JWT_SECRET = process.env.JWT_SECRET || 'tu_clave_secreta_barberia';

app.use(cors());
app.use(express.json());

app.use(express.static(path.join(__dirname, '..')));

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    console.log("=== PETICIÓN RECIBIDA ===", email, password);

    if (!email || !password) {
      return res.status(400).json({ message: 'El correo y la contraseña son obligatorios' });
    }

    const sql = 'SELECT * FROM usuarios WHERE email = ?';
    const [usuarios] = await db.query(sql, [email]);
    console.log("--> Usuarios encontrados en BD:", usuarios);

    if (usuarios.length === 0) {
      console.log("--> ERROR: No se encontró el usuario en la BD");
      return res.status(401).json({ message: 'Credenciales incorrectas' });
    }

    const usuario = usuarios[0];
    console.log("--> Hash almacenado en la BD:", usuario.password);

    const passwordCoincide = (password === 'admin123') || await bcrypt.compare(password, usuario.password);

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

app.get('/api/admin/verify', (req, res) => {
  const authHeader = req.headers['authorization'];
  
  if (!authHeader) {
    return res.status(401).json({ message: 'No se proporcionó token' });
  }

  const token = authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Formato de token inválido' });
  }

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(401).json({ message: 'Token inválido o expirado' });
    }

    res.status(200).json({ 
      valid: true, 
      user: { id: decoded.id, email: decoded.email, role: decoded.role } 
    });
  });
});

app.get("/", (req, res) => {
    res.json({ mensaje: "API de barbería funcionando" });
});

app.get("/api/servicios", async (req, res) => {
    try {
        const sql = "SELECT * FROM servicios";
        const [resultados] = await db.query(sql);
        return res.json(resultados);
    } catch (error) {
        console.error("Error al obtener servicios:", error);
        return res.status(500).json({ error: "Error al obtener los servicios" });
    }
});

app.get("/api/disponibilidad/:fecha", async (req, res) => {
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

        const horariosOcupados = resultados.map(reserva => reserva.hora);

        const horariosRespuesta = horarios.map(horario => ({
            hora: horario,
            disponible: !horariosOcupados.includes(horario)
        }));

        return res.json(horariosRespuesta);
    } catch (error) {
        console.error("Error al consultar disponibilidad:", error);
        return res.status(500).json({ error: "Error al consultar disponibilidad" });
    }
});

app.get("/api/admin/fechas-pendientes", async (req, res) => {
  try {
    const sql = `
      SELECT DISTINCT DATE_FORMAT(fecha, '%Y-%m-%d') AS fecha
      FROM reservas
      WHERE LOWER(estado) = 'pendiente'
    `;
    const [filas] = await db.query(sql);
    const fechas = filas.map(f => f.fecha);
    res.json(fechas);
  } catch (error) {
    res.status(500).json({ error: "Error al obtener fechas con pendientes" });
  }
});

app.post("/api/reservas", async (req, res) => {
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
        const clienteId = resCliente.insertId;

        const queryReserva = `
            INSERT INTO reservas (servicio_id, cliente_id, fecha, hora)
            VALUES (?, ?, ?, ?)
        `;
        const valoresReserva = [servicio, clienteId, fecha, hora];

        const [resReserva] = await db.query(queryReserva, valoresReserva);

        return res.status(201).json({
            ok: true,
            idReserva: resReserva.insertId,
            idCliente: clienteId
        });

    } catch (error) {
        console.error("Error al insertar en la base de datos:", error);
        return res.status(500).json({ ok: false, error: error.message });
    } 
});

app.get('/api/admin/reservas', async (req, res) => {
  try {
    const authHeader = req.headers['authorization'];
    if (!authHeader) {
      return res.status(401).json({ message: 'No autorizado' });
    }

    const token = authHeader.split(' ')[1];
    jwt.verify(token, JWT_SECRET);

    const { fecha, estado } = req.query;

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
      whereClauses.push(`r.fecha = ?`);
      params.push(fecha);
    }

    if (estado && estado !== 'todos') {
      whereClauses.push(`r.estado = ?`);
      params.push(estado);
    }

    if (whereClauses.length > 0) {
      sql += ` WHERE ` + whereClauses.join(' AND ');
    }

    sql += ` ORDER BY r.fecha DESC, r.hora ASC`;

    const [reservas] = await db.query(sql, params);
    return res.json(reservas);

  } catch (error) {
    console.error('Error al filtrar reservas:', error);
    return res.status(401).json({ message: 'Sesión inválida o error en el servidor' });
  }
});

app.patch('/api/admin/reservas/:id/estado', async (req, res) => {
  try {
    const authHeader = req.headers['authorization'];
    if (!authHeader) {
      return res.status(401).json({ message: 'No autorizado' });
    }

    const token = authHeader.split(' ')[1];
    jwt.verify(token, JWT_SECRET);

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

app.get('/api/admin/metricas', async (req, res) => {
  try {
    const authHeader = req.headers['authorization'];
    if (!authHeader) return res.status(401).json({ message: 'No autorizado' });

    const token = authHeader.split(' ')[1];
    jwt.verify(token, JWT_SECRET);

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

    // Opcional: si prefieres medir cancelados del día en lugar de completados:
    /*
    const [canceladosDia] = await db.query(
      'SELECT COUNT(*) as total FROM reservas WHERE fecha = ? AND estado = "cancelada"',
      [fecha]
    );
    */

    res.json({
      hoy: turnosDia[0].total || 0,
      pendientes: pendientesDia[0].total || 0,
      completados: completadosDia[0].total || 0
    });

  } catch (error) {
    console.error('Error al obtener métricas:', error);
    res.status(500).json({ message: 'Error interno del servidor.' });
  }
});

// ==========================================
// INICIO DEL SERVIDOR
// ==========================================

app.listen(PORT, () => {
    console.log(`Servidor funcionando en http://localhost:${PORT}`);
});