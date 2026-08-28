window.lucide?.createIcons();

/* =================================
   MODALES - variables
================================= */
const modal = document.getElementById("modalReserva");
const abrir = document.getElementById("btnReservar");
const abrir2 = document.getElementById("btnReservar2");
const cerrar = document.getElementById("btnCerrar");
const cerrar2 = document.getElementById("btnAnterior6");

const stepper = document.getElementById("stepper");
const confirmHeader = document.getElementById("confirmation");
const confirmTwoHeader = document.getElementById("confirmation-two");
const steps = document.querySelectorAll(".step");

const paso1 = document.querySelector('.step-content[data-step="1"]');
const paso2 = document.querySelector('.step-content[data-step="2"]');
const paso3 = document.querySelector('.step-content[data-step="3"]');
const paso4 = document.querySelector('.step-content[data-step="4"]');
const paso5 = document.querySelector('.step-content[data-step="5"]');
const paso6 = document.querySelector('.step-content[data-step="6"]');

let fechaSeleccionada = null;
let horaSeleccionada = null;
let servicioSeleccionado = null;
let servicioNombre = null;
let servicioPrecio = null;

function resetWizard() {

    paso1.classList.add("active");
    paso2.classList.remove("active");
    paso3.classList.remove("active");
    paso4.classList.remove("active");
    paso5.classList.remove("active");
    paso6.classList.remove("active");

    steps[0].classList.add("active");
    steps[1].classList.remove("active");
    steps[2].classList.remove("active");
    steps[3].classList.remove("active");

    stepper.classList.remove("hidden");

    servicioSeleccionado = null;
    serviceCards.forEach(card => {

        card.classList.remove("selected");

        const radio = card.querySelector('input[type="radio"]');

        if (radio) {
            radio.checked = false;
        }

    });

    fechaSeleccionada = null;
    horaSeleccionada = null;

    document.querySelectorAll(".calendar-day").forEach(day => {
        day.classList.remove("selected");
    });

    if (timeGrid) {
        timeGrid.innerHTML = "";
    }
}
function abrirModal() {
    if (!modal.classList.contains("active")) {
        resetWizard();
    }

    modal.classList.add("active");
    confirmHeader.classList.add("hidden");
    confirmTwoHeader.classList.add("hidden");
}
/* =================================
   modales - clciks
================================= */
abrir.addEventListener("click", abrirModal);
abrir2.addEventListener("click", abrirModal);
cerrar.addEventListener("click", () => {
    modal.classList.remove("active");
    stepper.classList.remove("hidden");
    confirmHeader.classList.add("hidden");
    confirmTwoHeader.classList.add("hidden");

    resetWizard();
});
cerrar2.addEventListener("click", () => {
    modal.classList.remove("active");
    stepper.classList.remove("hidden");
    confirmHeader.classList.add("hidden");
    confirmTwoHeader.classList.add("hidden");

    resetWizard();
});
modal.addEventListener("click", (e) => {

    if (e.target === modal) {

        modal.classList.remove("active");

        stepper.classList.remove("hidden");
        confirmHeader.classList.add("hidden");
        confirmTwoHeader.classList.add("hidden");

        resetWizard();
    }

});


/* =================================
   SERVICIO - variables
================================= */
const serviceCards = document.querySelectorAll(".modal-service-card");
function restaurarServicioSeleccionado() {
    if (!servicioSeleccionado) {
        return;
    }
    serviceCards.forEach(card => {
        const radio = card.querySelector('input[type="radio"]');
        if (radio.value === servicioSeleccionado) {
            radio.checked = true;
            card.classList.add("selected");
        } else {
            radio.checked = false;
            card.classList.remove("selected");
        }
    });
}
/* =================================
   servicio - clicks
================================= */
serviceCards.forEach(card => {
    card.addEventListener("click", () => {
        const radio = card.querySelector('input[type="radio"]');
        radio.checked = true;
        servicioSeleccionado = radio.value;
        const elementoNombre = card.querySelector(".service-title") || card.querySelector("h4") || card.querySelector("label");
        servicioNombre = elementoNombre ? elementoNombre.textContent.trim() : `Servicio #${radio.value}`;
        serviceCards.forEach(c => {
            c.classList.remove("selected");
        });
        card.classList.add("selected");
        const elementoPrecio = card.querySelector(".service-price");
        servicioPrecio = elementoPrecio ? elementoPrecio.textContent.trim() : null;
    });
});


/* =================================
   CALENDARIO - variables
================================= */
const calendarDaysContainer = document.getElementById("calendarDays");
const calendarTitle = document.getElementById("calendarTitle");
const btnMesAnterior = document.getElementById("btnMesAnterior");
const btnMesSiguiente = document.getElementById("btnMesSiguiente");
const mesMinimo = 7; // Agosto
const mesMaximo = 11; // Diciembre
let mesActual = 7;
let anioActual = 2026;

function generarCalendario() {
    calendarDaysContainer.innerHTML = "";
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    const primerDia = new Date(anioActual, mesActual, 1);
    const ultimoDia = new Date(anioActual, mesActual + 1, 0);
    const cantidadDias = ultimoDia.getDate();

    let diaSemanaInicio = primerDia.getDay();
    let offset = diaSemanaInicio === 0 ? 0 : diaSemanaInicio - 1;

    const ultimoDiaMesAnterior = new Date(anioActual, mesActual, 0).getDate();
    let diasAgregados = 0;
    let diaMesAnterior = ultimoDiaMesAnterior;
    const botonesAnteriores = [];

    while (diasAgregados < offset) {
        const fechaPrev = new Date(anioActual, mesActual - 1, diaMesAnterior);
        if (fechaPrev.getDay() !== 0) {
            const button = document.createElement("button");
            button.type = "button";
            button.classList.add("calendar-day", "other-month");
            button.textContent = diaMesAnterior;
            botonesAnteriores.unshift(button);
            diasAgregados++;
        }
        diaMesAnterior--;
    }
    botonesAnteriores.forEach(btn => calendarDaysContainer.appendChild(btn));

    for (let dia = 1; dia <= cantidadDias; dia++) {
        const fechaObj = new Date(anioActual, mesActual, dia);

        if (fechaObj.getDay() === 0) continue;

        const button = document.createElement("button");
        button.type = "button";
        button.classList.add("calendar-day");
        button.textContent = dia;

        const mesFormateado = String(mesActual + 1).padStart(2, "0");
        const diaFormateado = String(dia).padStart(2, "0");
        const fechaString = `${anioActual}-${mesFormateado}-${diaFormateado}`;

        button.dataset.fecha = fechaString;

        fechaObj.setHours(0, 0, 0, 0);
        if (fechaObj < hoy) {
            button.disabled = true;
            button.classList.add("other-month");
        }

        if (fechaSeleccionada && fechaSeleccionada === fechaString) {
            button.classList.add("selected");
        }

        calendarDaysContainer.appendChild(button);
    }

    actualizarTituloCalendario();
    controlarBotonesMes();
    agregarEventosDias();
}
function actualizarTituloCalendario() {

    const fecha = new Date(anioActual, mesActual);

    const nombreMes = fecha.toLocaleDateString("es-AR", {
        month: "long"
    });

    const nombreMesCapitalizado =
        nombreMes.charAt(0).toUpperCase() + nombreMes.slice(1);

    calendarTitle.textContent =
        `${nombreMesCapitalizado} ${anioActual}`;
}
function controlarBotonesMes() {

    btnMesAnterior.disabled =
        mesActual === mesMinimo;

    btnMesSiguiente.disabled =
        mesActual === mesMaximo;
}
function agregarEventosDias() {
    const calendarDays = calendarDaysContainer.querySelectorAll(".calendar-day:not(.other-month)");

    calendarDays.forEach(day => {
        day.addEventListener("click", async () => {
            calendarDaysContainer.querySelectorAll(".calendar-day").forEach(d => {
                d.classList.remove("selected");
            });

            day.classList.add("selected");

            fechaSeleccionada = day.dataset.fecha;

            await cargarHorarios(fechaSeleccionada);
        });
    });
}
function marcarFechaSeleccionada() {
    if (!fechaSeleccionada) return;

    const botonGuardado = calendarDaysContainer.querySelector(
        `.calendar-day[data-fecha="${fechaSeleccionada}"]`
    );

    if (botonGuardado) {
        calendarDaysContainer.querySelectorAll(".calendar-day").forEach(b => {
            b.classList.remove("selected");
        });
        botonGuardado.classList.add("selected");
    }
}
/* =================================
   calendario - clicks
================================= */
btnMesSiguiente.addEventListener("click", () => {
    if (mesActual < mesMaximo) {
        mesActual++;
        generarCalendario();
    }

});
btnMesAnterior.addEventListener("click", () => {
    if (mesActual > mesMinimo) {
        mesActual--;
        generarCalendario();
    }
});
generarCalendario();


/* =================================
   HORARIOS - variables
================================= */
const timeGrid = document.getElementById("timeGrid");
const selectedDateHeader = document.getElementById("textoFechaElegida");
async function cargarHorarios(fecha) {
    try {
        const respuesta = await fetch(
            `/api/disponibilidad/${fecha}`
        );
        if (!respuesta.ok) {
            throw new Error("No se pudo obtener la disponibilidad");
        }
        const horarios = await respuesta.json();
        timeGrid.innerHTML = "";

        const ahora = new Date();
        const hoyString = `${ahora.getFullYear()}-${String(ahora.getMonth() + 1).padStart(2, '0')}-${String(ahora.getDate()).padStart(2, '0')}`;
        const esHoy = (fecha === hoyString);
        const minutosActuales = ahora.getHours() * 60 + ahora.getMinutes();

        horarios.forEach(slot => {
            const button = document.createElement("button");
            button.type = "button";
            button.classList.add("time-option");

            const esObjeto = typeof slot === "object" && slot !== null;
            const horaTexto = esObjeto ? slot.hora : slot;
            let estaDisponible = esObjeto ? slot.disponible : true;

            if (esHoy && estaDisponible) {
                const [h, m] = horaTexto.split(":").map(Number);
                const minutosSlot = h * 60 + m;
                if (minutosSlot <= minutosActuales) {
                    estaDisponible = false;
                }
            }

            button.textContent = horaTexto;

            if (!estaDisponible) {
                button.disabled = true;
                button.classList.add("occupied");
            } else {
                if (horaSeleccionada && horaTexto === horaSeleccionada) {
                    button.classList.add("selected");
                }

                button.addEventListener("click", () => {
                    document.querySelectorAll(".time-option").forEach(b => {
                        b.classList.remove("selected");
                    });
                    button.classList.add("selected");
                    horaSeleccionada = horaTexto;
                });
            }

            timeGrid.appendChild(button);
        });
    } catch (error) {
        alert("Error al cargar horarios: " + error.message);
    }
}
function actualizarTextoFechaPaso3() {
    if (!fechaSeleccionada || !selectedDateHeader) return;

    const [anio, mes, dia] = fechaSeleccionada.split("-").map(Number);
    const fechaObj = new Date(anio, mes - 1, dia);

    const fechaTexto = fechaObj.toLocaleDateString("es-AR", {
        weekday: "long",
        day: "numeric",
        month: "long"
    });

    const fechaCapitalizada = fechaTexto.charAt(0).toUpperCase() + fechaTexto.slice(1);

    selectedDateHeader.textContent = fechaCapitalizada;
}


/* =================================
   FORMULARIO - variables
================================= */
const btnConfirmarReserva = document.getElementById("btnConfirmarReserva");
let datosCliente = {
    nombre: "",
    email: "",
    telefono: "",
    notas: ""
};
const inputNombre = document.getElementById("nombre");
const inputEmail = document.getElementById("email");
const inputTelefono = document.getElementById("telefono");
const inputNotas = document.getElementById("notas");

function validarFormulario() {
    const nombreValido = inputNombre.value.trim() !== "";
    const emailValido = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(inputEmail.value.trim());
    const telefonoValido = inputTelefono.value.trim().length >= 8;

    if (!nombreValido) {
        alert("Por favor, ingresá tu nombre completo.");
        inputNombre.focus();
        return false;
    }
    if (!emailValido) {
        alert("Por favor, ingresá un correo electrónico válido.");
        inputEmail.focus();
        return false;
    }
    if (!telefonoValido) {
        alert("Por favor, ingresá un número de teléfono válido (mínimo 8 dígitos).");
        inputTelefono.focus();
        return false;
    }

    return true;
}
/* =================================
   formulario - clicks
================================= */
btnConfirmarReserva.addEventListener("click", async () => {
    const reservaData = {
        servicio: servicioSeleccionado,
        fecha: fechaSeleccionada,
        hora: horaSeleccionada,
        cliente: datosCliente
    };

    try {
        btnConfirmarReserva.disabled = true;
        btnConfirmarReserva.textContent = "Guardando...";

        const respuesta = await fetch("/api/reservas", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(reservaData)
        });

        if (respuesta.ok) {
            paso5.classList.remove("active");
            paso6.classList.add("active");

            if (stepper) stepper.classList.add("hidden");
        } else {
            alert("No se pudo confirmar la reserva. Por favor reintentá.");
        }
    } catch (error) {
        alert("Ocurrió un error al conectar con el servidor.");
    } finally {
        btnConfirmarReserva.disabled = false;
        btnConfirmarReserva.textContent = "Confirmar Reserva";
    }
    confirmHeader.classList.add("hidden");

    confirmTwoHeader.classList.remove("hidden");
});


/* =================================
   CONFIRMACIÓN - variables
================================= */
function mostrarResumenReserva() {
    const elServicio = document.getElementById("resumenServicio");
    if (elServicio) elServicio.textContent = servicioNombre || "No seleccionado";
    const exServicio = document.getElementById("exitoServicio");
    if (exServicio) exServicio.textContent = servicioNombre || "No seleccionado";

    const elPrecio = document.getElementById("resumenPrecio");
    if (elPrecio) elPrecio.textContent = servicioPrecio || "-";
    const exPrecio = document.getElementById("exitoPrecio");
    if (exPrecio) exPrecio.textContent = servicioPrecio || "-";

    const elFecha = document.getElementById("resumenFecha");
    if (elFecha && fechaSeleccionada) {
        const [anio, mes, dia] = fechaSeleccionada.split("-").map(Number);
        const fechaObj = new Date(anio, mes - 1, dia);
        const fechaTexto = fechaObj.toLocaleDateString("es-AR", {
            day: "numeric",
            month: "long"
        });
        elFecha.textContent = fechaTexto;
    }
    const exFecha = document.getElementById("exitoFecha");
    if (exFecha && fechaSeleccionada) {
        const [anio, mes, dia] = fechaSeleccionada.split("-").map(Number);
        const fechaObj = new Date(anio, mes - 1, dia);
        const fechaTexto = fechaObj.toLocaleDateString("es-AR", {
            day: "numeric",
            month: "long"
        });
        exFecha.textContent = fechaTexto;
    }

    const elHora = document.getElementById("resumenHora");
    if (elHora) elHora.textContent = horaSeleccionada ? `${horaSeleccionada}hs` : "No seleccionada";
    const exHora = document.getElementById("exitoHora");
    if (exHora) exHora.textContent = horaSeleccionada ? `${horaSeleccionada}hs` : "No seleccionada";

    const elNombre = document.getElementById("resumenNombre");
    if (elNombre) elNombre.textContent = datosCliente.nombre || "-";

    const elTelefono = document.getElementById("resumenTelefono");
    if (elTelefono) elTelefono.textContent = datosCliente.telefono || "-";

    const elEmail = document.getElementById("resumenEmail");
    const rowEmail = document.getElementById("rowResumenEmail");

    if (datosCliente.email) {
        if (elEmail) elEmail.textContent = datosCliente.email;
        if (rowEmail) rowEmail.style.display = "flex";
    } else {
        if (rowEmail) rowEmail.style.display = "none";
    }

    const elObs = document.getElementById("resumenNotas");
    const rowObs = document.getElementById("rowResumenObs");

    if (datosCliente.notas) {
        if (elObs) elObs.textContent = datosCliente.notas;
        if (rowObs) rowObs.style.display = "flex";
    } else {
        if (rowObs) rowObs.style.display = "none";
    }
}


/* =================================
   BOTONES - variables
================================= */
const btnSiguiente1 = document.getElementById("btnSiguiente1");
const btnAtras2 = document.getElementById("btnAnterior2");
const btnSiguiente2 = document.getElementById("btnSiguiente2");
const btnAtras3 = document.getElementById("btnAnterior3");
const btnSiguiente3 = document.getElementById("btnSiguiente3");
const btnAtras4 = document.getElementById("btnAnterior4");
const btnSiguiente4 = document.getElementById("btnSiguiente4");
const btnAnterior5 = document.getElementById("btnAnterior5");
/* =================================
   botones - clicks
================================= */
btnSiguiente1.addEventListener("click", () => {

    if (!servicioSeleccionado) {
    alert("Seleccioná un servicio.");
    return;
    }

    paso1.classList.remove("active");

    paso2.classList.add("active");

    steps[0].classList.remove("active");
    steps[1].classList.add("active");

});
btnAtras2.addEventListener("click", () => {

    paso2.classList.remove("active");
    paso1.classList.add("active");

    steps[1].classList.remove("active");
    steps[0].classList.add("active");

    restaurarServicioSeleccionado();

});
btnSiguiente2.addEventListener("click", () => {
    if (!fechaSeleccionada) {
        alert("Seleccioná una fecha.");
        return;
    }

    paso2.classList.remove("active");
    paso3.classList.add("active");

    steps[1].classList.remove("active");
    steps[2].classList.add("active");

    actualizarTextoFechaPaso3();
});
btnAtras3.addEventListener("click", () => {
    paso3.classList.remove("active");
    paso2.classList.add("active");

    steps[2].classList.remove("active");
    steps[1].classList.add("active");

    if (fechaSeleccionada) {
        const partes = fechaSeleccionada.split("-");
        anioActual = parseInt(partes[0], 10);
        mesActual = parseInt(partes[1], 10) - 1;
    }

    generarCalendario();
});
btnSiguiente3.addEventListener("click", () => {

    if (!horaSeleccionada) {
        alert("Seleccioná un horario.");
        return;
    }

    paso3.classList.remove("active");

    paso4.classList.add("active");

    steps[2].classList.remove("active");
    steps[3].classList.add("active");

});
btnAtras4.addEventListener("click", () => {

    errorNombre.textContent = "";
    errorTelefono.textContent = "";
    errorEmail.textContent = "";

    paso4.classList.remove("active");
    paso3.classList.add("active");

    steps[3].classList.remove("active");
    steps[2].classList.add("active");

    if (fechaSeleccionada) {
        cargarHorarios(fechaSeleccionada);
    }
    actualizarTextoFechaPaso3();
});
btnSiguiente4.addEventListener("click", () => {
    if (!validarFormulario()) return;

    datosCliente = {
        nombre: inputNombre.value.trim(),
        email: inputEmail.value.trim(),
        telefono: inputTelefono.value.trim(),
        notas: inputNotas.value.trim()
    };

    mostrarResumenReserva();

    paso4.classList.remove("active");
    paso5.classList.add("active");


    if (stepper) {
        stepper.classList.add("hidden");
    }

    if (confirmHeader) {
        confirmHeader.classList.remove("hidden");
    }
});
btnAnterior5.addEventListener("click", () => {

    paso5.classList.remove("active");

    paso4.classList.add("active");

    steps[3].classList.add("active");

    if (confirmHeader) {

        confirmHeader.classList.add("hidden");
    }

    if (stepper) {
        stepper.classList.remove("hidden");
    }

    if (datosCliente.nombre) inputNombre.value = datosCliente.nombre;
    if (datosCliente.email) inputEmail.value = datosCliente.email;
    if (datosCliente.telefono) inputTelefono.value = datosCliente.telefono;
    if (datosCliente.notas) inputNotas.value = datosCliente.notas;

});
