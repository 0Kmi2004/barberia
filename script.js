const modal = document.getElementById("modalReserva");

const abrir = document.getElementById("btnReservar");

const abrir2 = document.getElementById("btnReservar2");

const cerrar = document.getElementById("btnCerrar");

abrir.addEventListener("click", () => {
    modal.classList.add("active");
});

abrir2.addEventListener("click", () => {
    modal.classList.add("active");
});


cerrar.addEventListener("click", () => {
    modal.classList.remove("active");
});

modal.addEventListener("click",(e)=>{

    if(e.target===modal){

        modal.classList.remove("active");

    }

});