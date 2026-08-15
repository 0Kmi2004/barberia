const modal = document.getElementById("modalReserva");

const abrir = document.getElementById("btnReservar");

const cerrar = document.getElementById("btnCerrar");

const paso1 = document.querySelector('.step-content[data-step="1"]');
const paso2 = document.querySelector('.step-content[data-step="2"]');
const paso3 = document.querySelector('.step-content[data-step="3"]');
const paso4 = document.querySelector('.step-content[data-step="4"]');

const steps = document.querySelectorAll(".step");

const calendarDays = document.querySelectorAll(".calendar-day");

const btnSiguiente1 = document.getElementById("btnSiguiente1");

const btnAtras2 = document.getElementById("btnAnterior2");

const btnSiguiente2 = document.getElementById("btnSiguiente2");

const btnAtras3 = document.getElementById("btnAnterior3");

const btnSiguiente3 = document.getElementById("btnSiguiente3");

const btnAtras4 = document.getElementById("btnAnterior4");

function resetWizard() {

    paso1.classList.add("active");

    paso2.classList.remove("active");

    paso3.classList.remove("active");

    paso4.classList.remove("active");

    steps[0].classList.add("active");
    steps[1].classList.remove("active");
    steps[2].classList.remove("active");
    steps[3].classList.remove("active");
}

abrir.addEventListener("click", () => {
    modal.classList.add("active");
    resetWizard();
});

cerrar.addEventListener("click", () => {
    modal.classList.remove("active");
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