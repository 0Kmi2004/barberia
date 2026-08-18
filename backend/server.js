const express = require("express");

const db = require("./config/database");

const { generarHorarios } = require("./utils/horarios");

const app = express();

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

// Iniciar servidor
app.listen(PORT, () => {
    console.log(`Servidor funcionando en http://localhost:${PORT}`);
});