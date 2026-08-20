const express = require("express");
const cors = require("cors");
const db = require("./config/database");
const { generarHorarios } = require("./utils/horarios");

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

// 1. Ruta base
app.get("/", (req, res) => {
    res.json({ mensaje: "API de barbería funcionando" });
});

// 2. Obtener servicios
app.get("/api/servicios", async (req, res) => {
    try {
        const sql = "SELECT * FROM servicios";
        const [resultados] = await db.query(sql); // Con promise se desestructura [filas]
        return res.json(resultados);
    } catch (error) {
        console.error("Error al obtener servicios:", error);
        return res.status(500).json({ error: "Error al obtener los servicios" });
    }
});

// 3. Obtener disponibilidad de horarios
app.get("/api/disponibilidad/:fecha", async (req, res) => {
    try {
        const fecha = req.params.fecha;
        const horarios = generarHorarios(fecha);

        // Si no hay horarios (ej. barbería cerrada), devolver array vacío
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

        const horariosDisponibles = horarios.filter(
            horario => !horariosOcupados.includes(horario)
        );

        return res.json(horariosDisponibles);
    } catch (error) {
        console.error("Error al consultar disponibilidad:", error);
        return res.status(500).json({ error: "Error al consultar disponibilidad" });
    }
});

// 4. Crear Reserva
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

// Iniciar servidor
app.listen(PORT, () => {
    console.log(`Servidor funcionando en http://localhost:${PORT}`);
});