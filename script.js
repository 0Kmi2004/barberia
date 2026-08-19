lucide.createIcons();

const modal = document.getElementById("modalReserva");

const abrir = document.getElementById("btnReservar");
const abrir2 = document.getElementById("btnReservar2");
const cerrar = document.getElementById("btnCerrar");
const cerrar2 = document.getElementById("btnAnterior6");

const stepper = document.getElementById("stepper");
const confirmHeader = document.getElementById("confirmation");
const confirmTwoHeader = document.getElementById("confirmation-two");

const paso1 = document.querySelector('.step-content[data-step="1"]');
const paso2 = document.querySelector('.step-content[data-step="2"]');
const paso3 = document.querySelector('.step-content[data-step="3"]');
const paso4 = document.querySelector('.step-content[data-step="4"]');
const paso5 = document.querySelector('.step-content[data-step="5"]');
const paso6 = document.querySelector('.step-content[data-step="6"]');

const steps = document.querySelectorAll(".step");

const serviceCards = document.querySelectorAll(".modal-service-card");


const calendarDaysContainer = document.getElementById("calendarDays");
const calendarTitle = document.getElementById("calendarTitle");
const btnMesAnterior = document.getElementById("btnMesAnterior");
const btnMesSiguiente = document.getElementById("btnMesSiguiente");

let mesActual = 7; // Agosto = 7
let anioActual = 2026;

const mesMinimo = 7; // Agosto
const mesMaximo = 11; // Diciembre


const btnSiguiente1 = document.getElementById("btnSiguiente1");
const btnAtras2 = document.getElementById("btnAnterior2");
const btnSiguiente2 = document.getElementById("btnSiguiente2");
const btnAtras3 = document.getElementById("btnAnterior3");
const btnSiguiente3 = document.getElementById("btnSiguiente3");
const btnAtras4 = document.getElementById("btnAnterior4");
const btnSiguiente4 = document.getElementById("btnSiguiente4");
const btnAnterior5 = document.getElementById("btnAnterior5");
const btnSiguiente5 = document.getElementById("btnSiguiente5");

const timeGrid = document.getElementById("timeGrid");

let fechaSeleccionada = null;
let horaSeleccionada = null;
let servicioSeleccionado = null;

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
    modal.classList.add("active");
    stepper.classList.remove("hidden");
    confirmHeader.classList.add("hidden");
    confirmTwoHeader.classList.add("hidden");
    
    resetWizard();
}

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

modal.addEventListener("click",(e)=>{

    if(e.target===modal){

        modal.classList.remove("active");
        resetWizard();
    }

});


function generarCalendario() {

    calendarDaysContainer.innerHTML = "";

    const primerDia = new Date(anioActual, mesActual, 1);
    const ultimoDia = new Date(anioActual, mesActual + 1, 0);
    const cantidadDias = ultimoDia.getDate();

    let primerDiaSemana = primerDia.getDay();

    primerDiaSemana = primerDiaSemana === 0 ? 6 : primerDiaSemana - 1;

    const ultimoDiaMesAnterior = new Date(
        anioActual,
        mesActual,
        0
    ).getDate();

    for (let i = primerDiaSemana - 1; i >= 0; i--) {
        const button = document.createElement("button");
        button.type = "button";
        button.classList.add(
            "calendar-day",
            "other-month"
        );
        button.textContent = ultimoDiaMesAnterior - i;
        calendarDaysContainer.appendChild(button);
    }

    for (let dia = 1; dia <= cantidadDias; dia++) {
        const button = document.createElement("button");
        button.type = "button";
        button.classList.add("calendar-day");
        button.textContent = dia;
        const mesFormateado = String(mesActual + 1).padStart(2, "0");
        const diaFormateado = String(dia).padStart(2, "0");
        button.dataset.fecha =
            `${anioActual}-${mesFormateado}-${diaFormateado}`;
        if (button.dataset.fecha === fechaSeleccionada) {
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
function controlarBotonesMes() {

    btnMesAnterior.disabled =
        mesActual === mesMinimo;

    btnMesSiguiente.disabled =
        mesActual === mesMaximo;
}
function agregarEventosDias() {

    const calendarDays =
        document.querySelectorAll(".calendar-day");
    calendarDays.forEach(day => {
        day.addEventListener("click", async () => {
            if (day.classList.contains("other-month")) {
                return;
            }
            calendarDays.forEach(d => {
                d.classList.remove("selected");
            });
            day.classList.add("selected");
            fechaSeleccionada =
                day.dataset.fecha;
            console.log(
                "Fecha seleccionada:",
                fechaSeleccionada
            );
            await cargarHorarios(fechaSeleccionada);
        });
    });
}

generarCalendario();


btnSiguiente1.addEventListener("click", () => {

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

});
btnAtras3.addEventListener("click", () => {

    paso3.classList.remove("active");

    paso2.classList.add("active");

    steps[2].classList.remove("active");
    steps[1].classList.add("active");
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
btnAnterior4.addEventListener("click", () => {

    paso4.classList.remove("active");

    paso3.classList.add("active");

    steps[3].classList.remove("active");
    steps[2].classList.add("active");

});
btnSiguiente4.addEventListener("click", () => {

    paso4.classList.remove("active");

    paso5.classList.add("active");

    steps[3].classList.remove("active");

    stepper.classList.add("hidden");

    confirmHeader.classList.remove("hidden");

});
btnAnterior5.addEventListener("click", () => {

    paso5.classList.remove("active");

    paso4.classList.add("active");

    steps[3].classList.add("active");

    stepper.classList.remove("hidden");

    confirmHeader.classList.add("hidden");

});
btnSiguiente5.addEventListener("click", () => {

    paso5.classList.remove("active");

    paso6.classList.add("active");

    confirmHeader.classList.add("hidden");

    confirmTwoHeader.classList.remove("hidden");
});

serviceCards.forEach(card => {

    card.addEventListener("click", () => {

        const radio = card.querySelector('input[type="radio"]');

        // Seleccionar radio
        radio.checked = true;

        // Guardar servicio seleccionado
        servicioSeleccionado = radio.value;

        // Quitar selección visual anterior
        serviceCards.forEach(c => {
            c.classList.remove("selected");
        });

        // Marcar tarjeta actual
        card.classList.add("selected");

        console.log("Servicio seleccionado:", servicioSeleccionado);

    });

});


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


async function cargarHorarios(fecha) {

    try {

        const respuesta = await fetch(
            `http://localhost:3000/api/disponibilidad/${fecha}`
        );

        if (!respuesta.ok) {
            throw new Error("No se pudo obtener la disponibilidad");
        }

        const horarios = await respuesta.json();

        console.log("Horarios disponibles:", horarios);

        timeGrid.innerHTML = "";

        horarios.forEach(hora => {

            const button = document.createElement("button");

            button.type = "button";
            button.classList.add("time-option");
            button.textContent = hora;

            button.addEventListener("click", () => {

                document.querySelectorAll(".time-option").forEach(b => {
                    b.classList.remove("selected");
                });

                button.classList.add("selected");

                horaSeleccionada = hora;

                console.log("Hora seleccionada:", horaSeleccionada);

    });

   timeGrid.appendChild(button);

    });

    } catch (error) {

        console.error("Error al cargar horarios:", error);

    }

}