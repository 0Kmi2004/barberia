let fechasConPendientes = [];
let fechaActualVisualizada = new Date(); // Para navegar meses
let fechaSeleccionadaStr = new Date().toISOString().split('T')[0]; // Fecha en formato YYYY-MM-DD

async function cargarFechasPendientes() {
  const token = localStorage.getItem('adminToken');
  try {
    const response = await fetch('/api/admin/fechas-pendientes', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (response.ok) {
      fechasConPendientes = await response.json();
    }
  } catch (error) {
    console.error('Error al cargar fechas con pendientes:', error);
  }
}

async function inicializarCalendario() {
  const dateDisplay = document.getElementById('selected-date-display');
  const calendarContainer = document.querySelector('.calendar-container');

  await cargarFechasPendientes();

  const btnAnterior = document.getElementById('btnMesAnterior');
  const btnSiguiente = document.getElementById('btnMesSiguiente');

  if (btnAnterior) {
    btnAnterior.addEventListener('click', (e) => {
      e.stopPropagation();
      fechaActualVisualizada.setMonth(fechaActualVisualizada.getMonth() - 1);
      renderizarCalendario();
    });
  }

  if (btnSiguiente) {
    btnSiguiente.addEventListener('click', (e) => {
      e.stopPropagation();
      fechaActualVisualizada.setMonth(fechaActualVisualizada.getMonth() + 1);
      renderizarCalendario();
    });
  }

  if (dateDisplay && calendarContainer) {
    dateDisplay.style.cursor = 'pointer';
    
    dateDisplay.addEventListener('click', (e) => {
      e.stopPropagation();
      calendarContainer.classList.toggle('active');
    });

    calendarContainer.addEventListener('click', (e) => {
      e.stopPropagation();
    });

    document.addEventListener('click', () => {
      calendarContainer.classList.remove('active');
    });
  }

  renderizarCalendario();
}

function renderizarCalendario() {
  const calendarDays = document.getElementById('calendarDays');
  const calendarTitle = document.getElementById('calendarTitle');
  const dateDisplay = document.getElementById('selected-date-display');
  
  if (!calendarDays || !calendarTitle) return;

  if (dateDisplay && fechaSeleccionadaStr) {
    const [anio, mes, dia] = fechaSeleccionadaStr.split('-');
    dateDisplay.textContent = `${parseInt(dia)}/${parseInt(mes)}/${anio}`;
  }

  calendarDays.innerHTML = '';

  const anio = fechaActualVisualizada.getFullYear();
  const mes = fechaActualVisualizada.getMonth();

  const nombreMes = new Intl.DateTimeFormat('es-ES', { month: 'long', year: 'numeric' }).format(fechaActualVisualizada);
  calendarTitle.textContent = nombreMes.charAt(0).toUpperCase() + nombreMes.slice(1);

  const primerDiaSemana = new Date(anio, mes, 1).getDay();
  const offsetLunes = (primerDiaSemana + 6) % 7;
  const totalDiasMes = new Date(anio, mes + 1, 0).getDate();

  for (let i = 0; i < offsetLunes; i++) {
    const emptySpan = document.createElement('span');
    emptySpan.className = 'calendar-day empty';
    calendarDays.appendChild(emptySpan);
  }

  for (let dia = 1; dia <= totalDiasMes; dia++) {
    const daySpan = document.createElement('span');
    daySpan.className = 'calendar-day';
    daySpan.textContent = dia;

    const mesStr = String(mes + 1).padStart(2, '0');
    const diaStr = String(dia).padStart(2, '0');
    const fechaFormateada = `${anio}-${mesStr}-${diaStr}`;

    if (fechaFormateada === fechaSeleccionadaStr) {
      daySpan.classList.add('selected');
    }

    if (fechasConPendientes.includes(fechaFormateada)) {
      daySpan.classList.add('has-pending');
      daySpan.title = 'Tiene turnos pendientes';
    }

    daySpan.addEventListener('click', () => {
      fechaSeleccionadaStr = fechaFormateada;
      renderizarCalendario();
      applyFilters();
      
      const calendarContainer = document.querySelector('.calendar-container');
      if (calendarContainer) {
        calendarContainer.classList.remove('active');
      }
    });

    calendarDays.appendChild(daySpan);
  }
}

async function refrescarCalendario() {
  await cargarFechasPendientes();
  renderizarCalendario();
}

async function cargarMetricas() {
  const token = localStorage.getItem('adminToken');
  const fecha = fechaSeleccionadaStr;

  try {
    const params = new URLSearchParams();
    if (fecha) params.append('fecha', fecha);

    const url = `/api/admin/metricas${params.toString() ? `?${params.toString()}` : ''}`;

    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) return;

    const data = await response.json();

    const todayEl = document.getElementById('today-count');
    const pendingEl = document.getElementById('pending-count');
    const completedEl = document.getElementById('completed-count');

    if (todayEl) todayEl.textContent = data.hoy ?? 0;
    if (pendingEl) pendingEl.textContent = data.pendientes ?? 0;
    if (completedEl) completedEl.textContent = data.completados ?? 0;

  } catch (error) {
    console.error('Error al cargar métricas:', error);
  }
}

async function cambiarEstadoReserva(idReserva, nuevoEstado) {
  const token = localStorage.getItem('adminToken');

  try {
    const response = await fetch(`/api/admin/reservas/${idReserva}/estado`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ estado: nuevoEstado })
    });

    if (response.ok) {
      applyFilters();        
      refrescarCalendario();  
    } else {
      const data = await response.json();
      alert(data.message || 'Error al actualizar el estado.');
    }
  } catch (error) {
    console.error('Error al cambiar el estado:', error);
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  inyectarEstilosEstado();

  const loginForm = document.getElementById('login-form');
  if (loginForm) {
    redirectIfAlreadyLoggedIn();

    const errorMsg = document.getElementById('error-msg');

    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (errorMsg) errorMsg.style.display = 'none';

      const emailInput = document.getElementById('email');
      const passwordInput = document.getElementById('password');

      const email = emailInput ? emailInput.value : '';
      const password = passwordInput ? passwordInput.value : '';

      try {
        const response = await fetch('/api/auth/login', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ email, password })
        });

        const data = await response.json();

        if (response.ok) {
          if (data.token) {
            localStorage.setItem('adminToken', data.token);
          }
          window.location.href = '/admin/dashboard.html';
        } else {
          showError(data.message || 'Credenciales incorrectas');
        }
      } catch (error) {
        showError('Error de conexión con el servidor');
      }
    });

    function showError(text) {
      if (errorMsg) {
        errorMsg.textContent = text;
        errorMsg.style.display = 'block';
      }
    }
  }

  const tbody = document.getElementById('appointments-list');
  if (tbody) {
    await protectAdminRoute();
    setupLogout();

    await inicializarCalendario();

    applyFilters();

    const statusFilter = document.getElementById('status-filter');
    if (statusFilter) {
      statusFilter.addEventListener('change', () => applyFilters());
    }
  }
});

function applyFilters() {
  const statusFilter = document.getElementById('status-filter');

  const fecha = fechaSeleccionadaStr;
  const estado = statusFilter ? statusFilter.value : 'todos';

  fetchAppointments(fecha, estado);
  cargarMetricas();
}

async function fetchAppointments(fecha = '', estado = 'todos') {
  const token = localStorage.getItem('adminToken');
  const tbody = document.getElementById('appointments-list');
  if (!tbody) return;

  try {
    const params = new URLSearchParams();
    if (fecha) params.append('fecha', fecha);
    if (estado && estado !== 'todos') params.append('estado', estado);

    const url = `/api/admin/reservas?${params.toString()}`;

    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      if (response.status === 401) {
        localStorage.removeItem('adminToken');
        redirectToLogin();
      }
      throw new Error('Error al obtener las reservas');
    }

    const reservas = await response.json();
    renderTable(reservas);

  } catch (error) {
    console.error('Error al cargar reservas:', error);
  }
}

function renderTable(reservas) {
  const tbody = document.getElementById('appointments-list');
  if (!tbody) return;
  tbody.replaceChildren();

  reservas.forEach(reserva => {
    const tr = document.createElement('tr');
    const telefono = reserva.cliente_telefono || reserva.telefono || '';
    const estadoLimpio = reserva.estado ? reserva.estado.toLowerCase().trim() : 'pendiente';

    tr.className = `row-estado-${estadoLimpio}`;

    [reserva.hora, reserva.cliente_nombre, telefono, reserva.servicio_nombre]
      .forEach((value) => {
        const cell = document.createElement('td');
        cell.textContent = value || '';
        tr.appendChild(cell);
      });

    const statusCell = document.createElement('td');
    const badge = document.createElement('span');
    badge.className = `badge badge-${estadoLimpio}`;
    badge.textContent = reserva.estado || 'pendiente';
    statusCell.appendChild(badge);
    tr.appendChild(statusCell);

    const actionsCell = document.createElement('td');
    const addAction = (label, title, handler, extraClass = '') => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = `action-btn ${extraClass}`.trim();
      button.title = title;
      button.textContent = label;
      button.addEventListener('click', handler);
      actionsCell.appendChild(button);
    };

    addAction('💬', 'Enviar WhatsApp', () => enviarWhatsApp(
      telefono,
      reserva.cliente_nombre,
      reserva.fecha,
      reserva.hora,
      reserva.servicio_nombre
    ));
    addAction('⏳', 'Restablecer a Pendiente', () => cambiarEstadoReserva(reserva.reserva_id, 'pendiente'));
    addAction('✅', 'Marcar como Completada', () => cambiarEstadoReserva(reserva.reserva_id, 'completada'));
    addAction('❌', 'Cancelar Turno', () => {
      if (window.confirm('¿Deseas cancelar esta reserva?')) {
        cambiarEstadoReserva(reserva.reserva_id, 'cancelada');
      }
    }, 'delete');
    tr.appendChild(actionsCell);

    tbody.appendChild(tr);
  });
}

function inyectarEstilosEstado() {
  if (document.getElementById('estado-styles')) return;

  const style = document.createElement('style');
  style.id = 'estado-styles';
  style.textContent = `
    /* Badges */
    .badge {
      padding: 4px 8px;
      border-radius: 12px;
      font-size: 12px;
      font-weight: bold;
      display: inline-block;
      text-transform: capitalize;
    }

    .badge-pendiente {
      background-color: #fef3c7;
      color: #b45309;
      border: 1px solid #fcd34d;
    }
    .row-estado-pendiente {
      border-left: 4px solid #f59e0b;
    }

    .badge-completada, .badge-confirmada {
      background-color: #d1fae5;
      color: #047857;
      border: 1px solid #6ee7b7;
    }
    .row-estado-completada, .row-estado-confirmada {
      border-left: 4px solid #10b981;
    }

    .badge-cancelada {
      background-color: #fee2e2;
      color: #b91c1c;
      border: 1px solid #fca5a5;
    }
    .row-estado-cancelada {
      border-left: 4px solid #ef4444;
      opacity: 0.7;
    }

    /* Estilos del Calendario Desplegable */
    .filter-group {
      position: relative;
    }

    .calendar-container {
      display: none;
      position: absolute;
      top: 100%;
      left: 0;
      z-index: 100;
      margin-top: 8px;
      background: #ffffff;
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1);
      padding: 16px;
      width: 280px;
    }

    .calendar-container.active {
      display: block;
    }

    .calendar-day {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      height: 32px;
      font-size: 13px;
      border-radius: 6px;
      cursor: pointer;
      position: relative;
    }

    .calendar-day:hover:not(.empty) {
      background-color: #f3f4f6;
    }

    .calendar-day.selected {
      background-color: #2563eb;
      color: #ffffff;
      font-weight: bold;
    }

    .calendar-day.has-pending::after {
      content: '';
      position: absolute;
      bottom: 2px;
      left: 50%;
      transform: translateX(-50%);
      width: 5px;
      height: 5px;
      border-radius: 50%;
      background-color: #f59e0b;
    }

    .calendar-day.selected.has-pending::after {
      background-color: #ffffff;
    }
  `;
  document.head.appendChild(style);
}

async function protectAdminRoute() {
  const token = localStorage.getItem('adminToken');

  if (!token) {
    redirectToLogin();
    return;
  }

  try {
    const response = await fetch('/api/admin/reservas', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error('Sesión inválida o expirada');
    }

  } catch (error) {
    console.warn('Acceso no autorizado:', error.message);
    localStorage.removeItem('adminToken');
    redirectToLogin();
  }
}

function redirectToLogin() {
  window.location.href = '/admin/index.html';
}

function redirectIfAlreadyLoggedIn() {
  const token = localStorage.getItem('adminToken');
  if (token) {
    window.location.href = '/admin/dashboard.html';
  }
}

function setupLogout() {
  const logoutBtn = document.getElementById('logout-btn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      localStorage.removeItem('adminToken');
      redirectToLogin();
    });
  }
}

function enviarWhatsApp(telefono, clienteNombre, fecha, hora, servicio) {
  if (!telefono) {
    alert('El cliente no tiene un teléfono registrado.');
    return;
  }

  const numeroLimpio = telefono.replace(/\D/g, '');
  const mensaje = `Hola ${clienteNombre}, te escribimos de la Barbería para confirmar tu turno del día ${fecha} a las ${hora} hs (${servicio}).`;
  const url = `https://wa.me/${numeroLimpio}?text=${encodeURIComponent(mensaje)}`;

  window.open(url, '_blank');
}

window.lucide?.createIcons();
