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

const calendarDays = document.querySelectorAll(".calendar-day");

const btnSiguiente1 = document.getElementById("btnSiguiente1");

const btnAtras2 = document.getElementById("btnAnterior2");

const btnSiguiente2 = document.getElementById("btnSiguiente2");

const btnAtras3 = document.getElementById("btnAnterior3");

const btnSiguiente3 = document.getElementById("btnSiguiente3");

const btnAtras4 = document.getElementById("btnAnterior4");

const btnSiguiente4 = document.getElementById("btnSiguiente4");

const btnAnterior5 = document.getElementById("btnAnterior5");

const btnSiguiente5 = document.getElementById("btnSiguiente5");

const serviceCards = document.querySelectorAll(".modal-service-card");

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

calendarDays.forEach(day => {

    day.addEventListener("click", () => {

        if (day.classList.contains("other-month")) {
            return;
        }

        calendarDays.forEach(d => {
            d.classList.remove("selected");
        });

        day.classList.add("selected");

    });

});

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

});

btnSiguiente2.addEventListener("click", () => {

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

        radio.checked = true;

        // Actualizar visualmente las tarjetas
        serviceCards.forEach(c => {
            c.classList.remove("selected");
        });

        card.classList.add("selected");
    });
});