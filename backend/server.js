const express = require("express");
const cors = require("cors");
const db = require("./config/database");

const { generarHorarios } = require("./utils/horarios");

const app = express();

app.use(cors());

const PORT = 3000;

// Permite recibir datos en formato JSON
app.use(express.json());

// Ruta principal
app.get("/", (req, res) => {
    res.json({
        mensaje: "API de barbería funcionando"
    });
});

app.get("/api/servicios", (req, res) => {

    const sql = "SELECT * FROM servicios";

    db.query(sql, (error, resultados) => {

        if (error) {
            console.error("Error al obtener servicios:", error);

            return res.status(500).json({
                error: "Error al obtener los servicios"
            });
        }

        res.json(resultados);
    });
});

app.get("/api/disponibilidad/:fecha", (req, res) => {

    const fecha = req.params.fecha;

    const horarios = generarHorarios(fecha);

    // Si no hay horarios, la barbería está cerrada
    if (horarios.length === 0) {
        return res.json([]);
    }

    const sql = `
        SELECT TIME_FORMAT(hora, '%H:%i') AS hora
        FROM reservas
        WHERE fecha = ?
    `;

    db.query(sql, [fecha], (error, resultados) => {

        if (error) {
            console.error("Error al consultar reservas:", error);

            return res.status(500).json({
                error: "Error al consultar disponibilidad"
            });
        }

        const horariosOcupados = resultados.map(
            reserva => reserva.hora
        );

        const horariosDisponibles = horarios.filter(
            horario => !horariosOcupados.includes(horario)
        );

        res.json(horariosDisponibles);
    });
});

// Iniciar servidor
app.listen(PORT, () => {
    console.log(`Servidor funcionando en http://localhost:${PORT}`);
});


app.post("/api/reservas", async (req, res) => {
  try {
    const { servicio, fecha, hora, cliente } = req.body;

    // 1. Insertar el cliente en la tabla 'clientes'
    const queryCliente = `
      INSERT INTO clientes (nombre, telefono, email, observaciones)
      VALUES (?, ?, ?, ?)
    `;
    const valoresCliente = [
      cliente.nombre,
      cliente.telefono,
      cliente.email || null,
      cliente.notas || null
    ];

    const [resCliente] = await db.query(queryCliente, valoresCliente);
    const clienteId = resCliente.insertId; // ID autogenerado del cliente

    // 2. Insertar la reserva vinculando el cliente_id y servicio_id
    const queryReserva = `
      INSERT INTO reservas (servicio_id, cliente_id, fecha, hora)
      VALUES (?, ?, ?, ?)
    `;
    const valoresReserva = [
      servicio,  // ID del servicio
      clienteId, // ID obtenido del paso anterior
      fecha,
      hora
    ];

    const [resReserva] = await db.query(queryReserva, valoresReserva);

    console.log("Reserva creada con éxito. ID Reserva:", resReserva.insertId);

    return res.status(201).json({ 
      ok: true, 
      idReserva: resReserva.insertId,
      idCliente: clienteId 
    });

  } catch (error) {
    console.error("Error al insertar en la base de datos:", error);
    return res.status(500).json({ ok: false, error: "Error interno del servidor" });
  }
});