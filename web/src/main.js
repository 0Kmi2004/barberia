import { createIcons, Calendar, Clock, Scissors, MapPin, User, Check, CircleDollarSign } from 'lucide';
import { fetchLandingConfig, fetchDisponibilidad, crearReserva } from './api.js';

// Inicializar iconos
createIcons({
  icons: {
    Calendar,
    Clock,
    Scissors,
    MapPin,
    User,
    Check,
    CircleDollarSign
  }
});

/* =================================
   VARIABLES DE ESTADO Y NODOS DOM
================================= */
let fechaSeleccionada = null;
let horaSeleccionada = null;
let serviciosGlobal = [];
let servicioSeleccionado = null;
let servicioNombre = null;
let servicioPrecio = null;
let datosCliente = { nombre: '', email: '', telefono: '', notas: '' };

// Modales & Wizard Nodes
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

// Calendario Variables
const calendarDaysContainer = document.getElementById("calendarDays");
const calendarTitle = document.getElementById("calendarTitle");
const btnMesAnterior = document.getElementById("btnMesAnterior");
const btnMesSiguiente = document.getElementById("btnMesSiguiente");
const timeGrid = document.getElementById("timeGrid");
const selectedDateHeader = document.getElementById("textoFechaElegida");

const mesMinimo = 0;
const mesMaximo = 11;
let mesActual = new Date().getMonth();
let anioActual = new Date().getFullYear();

// Inputs Formulario
const inputNombre = document.getElementById("nombre");
const inputEmail = document.getElementById("email");
const inputTelefono = document.getElementById("telefono");
const inputNotas = document.getElementById("notas");
const btnConfirmarReserva = document.getElementById("btnConfirmarReserva");

/* =================================
   CARGA DE LANDING
================================= */
async function cargarLandingDinamica() {
  try {
    const data = await fetchLandingConfig();

    if (!data) return;

    if (data['l-barberiaNombre']) {
      document.title = `${data['l-barberiaNombre']} | Turnos Online`;
    }

    const elH1 = document.getElementById('l-barberiaNombre');
    if (elH1 && data['l-barberiaNombre']) {
      elH1.innerHTML = `${data['l-barberiaNombre']} <span class="bar-logo" style="display:block; font-size: 0.5em;">Barbería</span>`;
    }

    const elLogo = document.getElementById('l-logoUrl') || document.querySelector('header .logo img');
    if (elLogo && data['l-logoUrl']) {
      elLogo.src = data['l-logoUrl'];
      elLogo.alt = `${data['l-barberiaNombre'] || 'Barbería'} Logo`;
    }

    const elHeroTitle = document.getElementById('l-heroTitle') || document.querySelector('.hero-card h2');
    if (elHeroTitle && data['l-heroTitle']) elHeroTitle.innerHTML = data['l-heroTitle'];

    const elHeroSubtitle = document.getElementById('l-heroSubtitle') || document.querySelector('.hero-location');
    if (elHeroSubtitle && data['l-heroSubtitle']) elHeroSubtitle.innerHTML = data['l-heroSubtitle'];

    const elHeroText = document.getElementById('l-heroText') || document.querySelector('.rating p');
    if (elHeroText && data['l-heroText']) elHeroText.textContent = data['l-heroText'];

    const elVideo = document.getElementById('l-heroVideo') || document.querySelector('.hero-video video');
    if (elVideo && data['l-heroVideo']) {
      elVideo.src = data['l-heroVideo'];
      elVideo.load();
    }

    const elHeroVideoText = document.getElementById('l-heroVideoText') || document.getElementById('about-img-p');
    if (elHeroVideoText && data['l-heroVideoText']) elHeroVideoText.innerHTML = data['l-heroVideoText'];

    const elSobreAbout = document.getElementById('l-sobretituloAbout') || document.querySelector('.about-content .section-label');
    if (elSobreAbout && data['l-sobretituloAbout']) elSobreAbout.textContent = data['l-sobretituloAbout'];

    const elTituloAbout = document.getElementById('l-tituloAbout') || document.querySelector('.about-content h2');
    if (elTituloAbout && data['l-tituloAbout']) elTituloAbout.innerHTML = data['l-tituloAbout'];

    const elTextAbout = document.getElementById('l-textAbout');
    if (elTextAbout && data['l-textAbout']) elTextAbout.textContent = data['l-textAbout'];

    const elTextAbout2 = document.getElementById('l-textAbout2');
    if (elTextAbout2 && data['l-textAbout2']) elTextAbout2.textContent = data['l-textAbout2'];

    const elSubtextAbout = document.getElementById('l-subtextAbout');
    if (elSubtextAbout && data['l-subtextAbout']) elSubtextAbout.textContent = data['l-subtextAbout'];

    const elAboutImg = document.getElementById('l-aboutImg');
    if (elAboutImg && data['l-aboutImg']) {
      elAboutImg.src = data['l-aboutImg'];
    }

    const elSobreServicios = document.getElementById('l-sobretituloServicios') || document.querySelector('#servicios .section-label');
    if (elSobreServicios && data['l-sobretituloServicios']) elSobreServicios.textContent = data['l-sobretituloServicios'];

    const elTituloServicios = document.getElementById('l-tituloServicios') || document.querySelector('#servicios h2');
    if (elTituloServicios && data['l-tituloServicios']) elTituloServicios.innerHTML = data['l-tituloServicios'];

    const elTextServicios = document.getElementById('l-textServicios') || document.querySelector('.services-description');
    if (elTextServicios && data['l-textServicios']) elTextServicios.textContent = data['l-textServicios'];

    if (data['l-serviciosTable'] && Array.isArray(data['l-serviciosTable'])) {
      // Guardamos los servicios globalmente para poder consultarlos al seleccionar
      serviciosGlobal = data['l-serviciosTable'];

      renderizarGridLanding(serviciosGlobal);

      if (typeof renderizarServiciosModal === 'function') {
        renderizarServiciosModal(serviciosGlobal);
      }
    }

    const elTextCta = document.getElementById('l-textCta') || document.querySelector('#reservar h2');
    if (elTextCta && data['l-textCta']) elTextCta.innerHTML = data['l-textCta'];

  } catch (error) {
    console.error('Error cargando los datos del tenant:', error);
  }
}

document.addEventListener("change", (e) => {
  if (e.target.matches('input[name="service"]')) {
    const idSeleccionado = Number(e.target.value);
    const servicioEncontrado = serviciosGlobal.find(s => Number(s.id) === idSeleccionado);

    if (servicioEncontrado) {
      servicioSeleccionado = servicioEncontrado.id;
      servicioNombre = servicioEncontrado.nombre;

      const formatearPrecio = (valor) => {
        return new Intl.NumberFormat('es-AR', {
          style: 'currency',
          currency: 'ARS',
          maximumFractionDigits: 0
        }).format(valor);
      };

      servicioPrecio = formatearPrecio(servicioEncontrado.precio || 0);
    }
  }
});

/* =================================
   RENDERIZADO DE SERVICIOS
================================= */
function renderizarGridLanding(servicios) {
  const contenedor = document.getElementById('l-serviciosTable');
  if (!contenedor) return;

  if (!Array.isArray(servicios) || servicios.length === 0) {
    contenedor.innerHTML = '<p class="no-services">No hay servicios disponibles por el momento.</p>';
    return;
  }

  const iconos = ['✂', '★', '✦', '⚡'];

  const formatearPrecio = (valor) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      maximumFractionDigits: 0
    }).format(valor);
  };


  const htmlTarjetas = servicios.map((servicio, index) => {
    const numeroStr = String(index + 1).padStart(2, '0');
    const icono = iconos[index % iconos.length];
    const precioStr = formatearPrecio(servicio.precio || 0);

    return `
      <article class="service-card" data-id="${servicio.id}">
        <div class="service-top">
          <span class="service-number">${numeroStr}</span>
          <span class="service-icon" aria-hidden="true">${icono}</span>
        </div>
        <h3>${servicio.nombre.toUpperCase()}</h3>
        <p>${servicio.descripcion || 'Servicio profesional de barbería.'}</p>
        <div class="service-bottom">
          <span>DESDE</span>
          <strong>${precioStr}</strong>
        </div>
      </article>
    `;
  }).join('');

  contenedor.innerHTML = htmlTarjetas;
}

function renderizarServiciosModal(servicios) {
  const contenedorModal = document.querySelector('.modal-services-flex');
  if (!contenedorModal) return;

  if (!Array.isArray(servicios) || servicios.length === 0) {
    contenedorModal.innerHTML = '<p class="no-services">No hay servicios disponibles.</p>';
    return;
  }

    const opciones = servicios.filter((servicio, index) => {
    const nombreLower = servicio.nombre ? servicio.nombre.toLowerCase() : '';
    const esExperiencia = nombreLower.includes('experiencia');
    return index < 3 && !esExperiencia;
  });

  if (opciones.length === 0) {
    contenedorModal.innerHTML = '<p class="no-services">No hay servicios disponibles para reserva.</p>';
    return;
  }

  const imagenesDefault = ['/assets/corte1.webp', '/assets/corte2.webp', '/assets/corte3.webp'];

  const formatearPrecio = (valor) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      maximumFractionDigits: 0
    }).format(valor);
  };

  const htmlModalCards = opciones.map((servicio, index) => {
    const imagen = servicio.imagen_url || imagenesDefault[index % imagenesDefault.length];
    const precioStr = formatearPrecio(servicio.precio || 0);
    const servicioId = servicio.id;
    const inputId = `servicio_${servicioId}`;

    return `
      <article class="modal-service-card">
        <img src="${imagen}" alt="${servicio.nombre}" width="65" height="96" loading="lazy" decoding="async">
        <div class="modal-card-text">
          <div class="modal-subcard-text">
            <h4>${servicio.nombre}</h4>
            <p>⏱ ${servicio.duracion || '45 min'}</p>
            <strong class="service-price">${precioStr}</strong>
          </div>
          <label class="card-radio">
            <input type="radio" name="service" id="${inputId}" value="${servicioId}">
            <span class="radio-check">
              <img src="/assets/check.png" alt="" width="13" height="13" loading="lazy" decoding="async">
            </span>
          </label>
        </div>
      </article>
    `;
  }).join('');

  contenedorModal.innerHTML = htmlModalCards;
}

/* =================================
   CALENDARIO
================================= */
function generarCalendario() {
  if (!calendarDaysContainer) return;
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

    if (fechaObj.getDay() === 0) continue; // Saltear domingos

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
  if (!calendarTitle) return;
  const fecha = new Date(anioActual, mesActual);
  const nombreMes = fecha.toLocaleDateString("es-AR", { month: "long" });
  const nombreMesCapitalizado = nombreMes.charAt(0).toUpperCase() + nombreMes.slice(1);
  calendarTitle.textContent = `${nombreMesCapitalizado} ${anioActual}`;
}

function controlarBotonesMes() {
  if (btnMesAnterior) btnMesAnterior.disabled = mesActual === mesMinimo;
  if (btnMesSiguiente) btnMesSiguiente.disabled = mesActual === mesMaximo;
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

/* =================================
   HORARIOS
================================= */
async function cargarHorarios(fecha) {
  try {
    const horarios = await fetchDisponibilidad(fecha);
    if (!timeGrid) return;
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

document.addEventListener("click", (e) => {
  const card = e.target.closest(".modal-service-card");
  if (!card) return;

  // Buscar el radio button dentro de la tarjeta presionada
  const radio = card.querySelector('input[type="radio"]');
  if (radio) {
    radio.checked = true;

    // Disparar manualmente el evento 'change' para que se actualicen las variables globales
    radio.dispatchEvent(new Event('change', { bubbles: true }));

    // Actualizar las clases visuales de selección en las tarjetas
    document.querySelectorAll(".modal-service-card").forEach(c => {
      c.classList.remove("selected");
    });
    card.classList.add("selected");
  }
});

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
   MODALES Y WIZARD CONTROL
================================= */
function resetWizard() {
  if (paso1) paso1.classList.add("active");
  if (paso2) paso2.classList.remove("active");
  if (paso3) paso3.classList.remove("active");
  if (paso4) paso4.classList.remove("active");
  if (paso5) paso5.classList.remove("active");
  if (paso6) paso6.classList.remove("active");

  if (steps.length >= 4) {
    steps[0].classList.add("active");
    steps[1].classList.remove("active");
    steps[2].classList.remove("active");
    steps[3].classList.remove("active");
  }

  if (stepper) stepper.classList.remove("hidden");

  servicioSeleccionado = null;
  document.querySelectorAll(".modal-service-card").forEach(card => {
    card.classList.remove("selected");
    const radio = card.querySelector('input[type="radio"]');
    if (radio) radio.checked = false;
  });

  fechaSeleccionada = null;
  horaSeleccionada = null;

  document.querySelectorAll(".calendar-day").forEach(day => {
    day.classList.remove("selected");
  });

  if (timeGrid) timeGrid.innerHTML = "";
}

function abrirModal() {
  if (!modal) return;
  if (!modal.classList.contains("active")) {
    resetWizard();
  }

  modal.classList.add("active");
  if (confirmHeader) confirmHeader.classList.add("hidden");
  if (confirmTwoHeader) confirmTwoHeader.classList.add("hidden");
}



function restaurarServicioSeleccionado() {
  if (!servicioSeleccionado) return;
  const cards = document.querySelectorAll(".modal-service-card");
  cards.forEach(card => {
    const radio = card.querySelector('input[type="radio"]');
    if (radio && radio.value === servicioSeleccionado) {
      radio.checked = true;
      card.classList.add("selected");
    } else {
      if (radio) radio.checked = false;
      card.classList.remove("selected");
    }
  });
}

function validarFormulario() {
  if (!inputNombre || !inputEmail || !inputTelefono) return false;

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

function mostrarResumenReserva() {
  const elServicio = document.getElementById("resumenServicio");
  if (elServicio) elServicio.textContent = servicioNombre || "No seleccionado";
  const exServicio = document.getElementById("exitoServicio");
  if (exServicio) exServicio.textContent = servicioNombre || "No seleccionado";

  const elPrecio = document.getElementById("resumenPrecio");
  if (elPrecio) elPrecio.textContent = servicioPrecio || "-";
  const exPrecio = document.getElementById("exitoPrecio");
  if (exPrecio) exPrecio.textContent = servicioPrecio || "-";

  if (fechaSeleccionada) {
    const [anio, mes, dia] = fechaSeleccionada.split("-").map(Number);
    const fechaObj = new Date(anio, mes - 1, dia);
    const fechaTexto = fechaObj.toLocaleDateString("es-AR", { day: "numeric", month: "long" });

    const elFecha = document.getElementById("resumenFecha");
    if (elFecha) elFecha.textContent = fechaTexto;
    const exFecha = document.getElementById("exitoFecha");
    if (exFecha) exFecha.textContent = fechaTexto;
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
  } else if (rowEmail) {
    rowEmail.style.display = "none";
  }

  const elObs = document.getElementById("resumenNotas");
  const rowObs = document.getElementById("rowResumenObs");
  if (datosCliente.notas) {
    if (elObs) elObs.textContent = datosCliente.notas;
    if (rowObs) rowObs.style.display = "flex";
  } else if (rowObs) {
    rowObs.style.display = "none";
  }
}

/* =================================
   INICIALIZACIÓN Y LISTENERS
================================= */
document.addEventListener('DOMContentLoaded', () => {
  cargarLandingDinamica();
  generarCalendario();

  // Modal Triggers
  if (abrir) abrir.addEventListener("click", abrirModal);
  if (abrir2) abrir2.addEventListener("click", abrirModal);

  const cerrarModal = () => {
    if (modal) modal.classList.remove("active");
    if (stepper) stepper.classList.remove("hidden");
    if (confirmHeader) confirmHeader.classList.add("hidden");
    if (confirmTwoHeader) confirmTwoHeader.classList.add("hidden");
    resetWizard();
  };

  if (cerrar) cerrar.addEventListener("click", cerrarModal);
  if (cerrar2) cerrar2.addEventListener("click", cerrarModal);

  if (modal) {
    modal.addEventListener("click", (e) => {
      if (e.target === modal) cerrarModal();
    });
  }

  // Controles Calendario
  if (btnMesSiguiente) {
    btnMesSiguiente.addEventListener("click", () => {
      if (mesActual < mesMaximo) {
        mesActual++;
        generarCalendario();
      }
    });
  }

  if (btnMesAnterior) {
    btnMesAnterior.addEventListener("click", () => {
      if (mesActual > mesMinimo) {
        mesActual--;
        generarCalendario();
      }
    });
  }

  // Botones del Wizard
  const btnSiguiente1 = document.getElementById("btnSiguiente1");
  const btnAtras2 = document.getElementById("btnAnterior2");
  const btnSiguiente2 = document.getElementById("btnSiguiente2");
  const btnAtras3 = document.getElementById("btnAnterior3");
  const btnSiguiente3 = document.getElementById("btnSiguiente3");
  const btnAtras4 = document.getElementById("btnAnterior4");
  const btnSiguiente4 = document.getElementById("btnSiguiente4");
  const btnAnterior5 = document.getElementById("btnAnterior5");

btnSiguiente1.addEventListener("click", () => {
    const inputSeleccionado = document.querySelector('input[name="service"]:checked');

    if (!inputSeleccionado) {
      alert("Seleccioná un servicio.");
      return;
    }

    const servicioSeleccionadoId = inputSeleccionado.value;
    console.log("Servicio elegido ID:", servicioSeleccionadoId);

    if (paso1) paso1.classList.remove("active");
    if (paso2) paso2.classList.add("active");
    if (steps[0]) steps[0].classList.remove("active");
    if (steps[1]) steps[1].classList.add("active");
  });

  if (btnAtras2) {
    btnAtras2.addEventListener("click", () => {
      if (paso2) paso2.classList.remove("active");
      if (paso1) paso1.classList.add("active");
      if (steps[1]) steps[1].classList.remove("active");
      if (steps[0]) steps[0].classList.add("active");
      restaurarServicioSeleccionado();
    });
  }

  if (btnSiguiente2) {
    btnSiguiente2.addEventListener("click", () => {
      if (!fechaSeleccionada) {
        alert("Seleccioná una fecha.");
        return;
      }
      if (paso2) paso2.classList.remove("active");
      if (paso3) paso3.classList.add("active");
      if (steps[1]) steps[1].classList.remove("active");
      if (steps[2]) steps[2].classList.add("active");
      actualizarTextoFechaPaso3();
    });
  }

  if (btnAtras3) {
    btnAtras3.addEventListener("click", () => {
      if (paso3) paso3.classList.remove("active");
      if (paso2) paso2.classList.add("active");
      if (steps[2]) steps[2].classList.remove("active");
      if (steps[1]) steps[1].classList.add("active");

      if (fechaSeleccionada) {
        const partes = fechaSeleccionada.split("-");
        anioActual = parseInt(partes[0], 10);
        mesActual = parseInt(partes[1], 10) - 1;
      }
      generarCalendario();
    });
  }

  if (btnSiguiente3) {
    btnSiguiente3.addEventListener("click", () => {
      if (!horaSeleccionada) {
        alert("Seleccioná un horario.");
        return;
      }
      if (paso3) paso3.classList.remove("active");
      if (paso4) paso4.classList.add("active");
      if (steps[2]) steps[2].classList.remove("active");
      if (steps[3]) steps[3].classList.add("active");
    });
  }

  if (btnAtras4) {
    btnAtras4.addEventListener("click", () => {
      if (paso4) paso4.classList.remove("active");
      if (paso3) paso3.classList.add("active");
      if (steps[3]) steps[3].classList.remove("active");
      if (steps[2]) steps[2].classList.add("active");

      if (fechaSeleccionada) {
        cargarHorarios(fechaSeleccionada);
      }
      actualizarTextoFechaPaso3();
    });
  }

  if (btnSiguiente4) {
    btnSiguiente4.addEventListener("click", () => {
      if (!validarFormulario()) return;

      datosCliente = {
        nombre: inputNombre.value.trim(),
        email: inputEmail.value.trim(),
        telefono: inputTelefono.value.trim(),
        notas: inputNotas.value.trim()
      };

      mostrarResumenReserva();

      if (paso4) paso4.classList.remove("active");
      if (paso5) paso5.classList.add("active");

      if (stepper) stepper.classList.add("hidden");
      if (confirmHeader) confirmHeader.classList.remove("hidden");
    });
  }

  if (btnAnterior5) {
    btnAnterior5.addEventListener("click", () => {
      if (paso5) paso5.classList.remove("active");
      if (paso4) paso4.classList.add("active");
      if (steps[3]) steps[3].classList.add("active");

      if (confirmHeader) confirmHeader.classList.add("hidden");
      if (stepper) stepper.classList.remove("hidden");

      if (datosCliente.nombre && inputNombre) inputNombre.value = datosCliente.nombre;
      if (datosCliente.email && inputEmail) inputEmail.value = datosCliente.email;
      if (datosCliente.telefono && inputTelefono) inputTelefono.value = datosCliente.telefono;
      if (datosCliente.notas && inputNotas) inputNotas.value = datosCliente.notas;
    });
  }

  // Envío Final
  if (btnConfirmarReserva) {
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

        await crearReserva(reservaData);

        if (paso5) paso5.classList.remove("active");
        if (paso6) paso6.classList.add("active");
        if (stepper) stepper.classList.add("hidden");
        if (confirmHeader) confirmHeader.classList.add("hidden");
        if (confirmTwoHeader) confirmTwoHeader.classList.remove("hidden");
      } catch (error) {
        alert("Ocurrió un error al guardar la reserva: " + error.message);
      } finally {
        btnConfirmarReserva.disabled = false;
        btnConfirmarReserva.textContent = "Confirmar Reserva";
      }
    });
  }
});
