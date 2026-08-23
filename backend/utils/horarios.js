const horariosAtencion = {
    0: null, // Domingo
    1: { inicio: "09:00", fin: "19:00" }, // Lunes
    2: { inicio: "09:00", fin: "19:00" }, // Martes
    3: { inicio: "09:00", fin: "19:00" }, // Miércoles
    4: { inicio: "09:00", fin: "19:00" }, // Jueves
    5: { inicio: "09:00", fin: "19:00" }, // Viernes
    6: { inicio: "09:00", fin: "14:00" }  // Sábado
};


function generarHorarios(fecha) {

    

    const diaSemana = new Date(fecha + "T00:00:00").getDay();

    const horario = horariosAtencion[diaSemana];

    if (!horario) {
        return [];
    }

    const horarios = [];

    let [horaInicio, minutoInicio] = horario.inicio.split(":").map(Number);
    const [horaFin, minutoFin] = horario.fin.split(":").map(Number);

    let minutosActuales = horaInicio * 60 + minutoInicio;
    const minutosFinales = horaFin * 60 + minutoFin;

    while (minutosActuales < minutosFinales) {

        const hora = Math.floor(minutosActuales / 60);
        const minutos = minutosActuales % 60;

        const horaFormateada = String(hora).padStart(2, "0");
        const minutosFormateados = String(minutos).padStart(2, "0");

        horarios.push(`${horaFormateada}:${minutosFormateados}`);

        minutosActuales += 45;
    }

    return horarios;
}

module.exports = {
    generarHorarios
};