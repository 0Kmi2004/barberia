import { createIcons, icons } from 'lucide';

createIcons({ icons });

let fechasConPendientes = [];
let fechaActualVisualizada = new Date(); // Para navegar meses
let fechaSeleccionadaStr = ''; // Por defecto vacía para cargar TODAS las reservas

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
  const calendarPopover = document.getElementById('calendarPopover');

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

  // Manejo del evento de abrir/cerrar popover flotante
  if (dateDisplay && calendarPopover) {
    dateDisplay.addEventListener('click', (e) => {
      e.stopPropagation();
      calendarPopover.classList.toggle('hidden');
    });

    calendarPopover.addEventListener('click', (e) => {
      e.stopPropagation();
    });

    document.addEventListener('click', () => {
      calendarPopover.classList.add('hidden');
    });
  }

  renderizarCalendario();
}

function renderizarCalendario() {
  const calendarDays = document.getElementById('calendarDays');
  const calendarTitle = document.getElementById('calendarTitle');
  const dateDisplay = document.getElementById('selected-date-display');
  const calendarPopover = document.getElementById('calendarPopover');

  if (!calendarDays || !calendarTitle) return;

  if (dateDisplay) {
    if (fechaSeleccionadaStr) {
      const [anio, mes, dia] = fechaSeleccionadaStr.split('-');
      dateDisplay.textContent = `${parseInt(dia)}/${parseInt(mes)}/${anio}`;
    } else {
      dateDisplay.textContent = 'Todas las fechas';
    }
  }

  calendarDays.innerHTML = '';

  const anio = fechaActualVisualizada.getFullYear();
  const mes = fechaActualVisualizada.getMonth();

  const nombreMes = new Intl.DateTimeFormat('es-ES', { month: 'long', year: 'numeric' }).format(fechaActualVisualizada);
  calendarTitle.textContent = nombreMes.charAt(0).toUpperCase() + nombreMes.slice(1);

  const primerDiaSemana = new Date(anio, mes, 1).getDay();
  const offsetLunes = (primerDiaSemana + 6) % 7;
  const totalDiasMes = new Date(anio, mes + 1, 0).getDate();

  // Opción para resetear el filtro a "Todas las fechas"
  const clearOption = document.createElement('div');
  clearOption.className = 'calendar-reset-btn';
  clearOption.textContent = 'Ver todas las fechas';
  clearOption.addEventListener('click', () => {
    fechaSeleccionadaStr = '';
    renderizarCalendario();
    applyFilters();
    if (calendarPopover) calendarPopover.classList.add('hidden');
  });

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

      if (calendarPopover) {
        calendarPopover.classList.add('hidden');
      }
    });

    calendarDays.appendChild(daySpan);
  }

  // Insertar botón de limpiar filtro al final del contenedor del calendario
  const calendarContainer = calendarDays.closest('.calendar');
  if (calendarContainer && !calendarContainer.querySelector('.calendar-reset-btn')) {
    calendarContainer.appendChild(clearOption);
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

    const orderFilter = document.getElementById('order-filter');
    if (orderFilter) {
      orderFilter.addEventListener('change', () => applyFilters());
    }

    const searchInput = document.getElementById('search-input');
    if (searchInput) {
      searchInput.addEventListener('input', () => applyFilters());
    }

    const retryBtn = document.getElementById('retry-btn');
    if (retryBtn) {
      retryBtn.addEventListener('click', () => applyFilters());
    }
  }
});

function applyFilters() {
  const statusFilter = document.getElementById('status-filter');
  const searchInput = document.getElementById('search-input');
  const orderFilter = document.getElementById('order-filter');

  const fecha = typeof fechaSeleccionadaStr !== 'undefined' ? fechaSeleccionadaStr : '';
  const estado = statusFilter ? statusFilter.value : 'todos';
  const query = searchInput ? searchInput.value.trim() : '';
  const orden = orderFilter ? orderFilter.value : 'DESC';

  fetchAppointments(fecha, estado, query, orden);
  if (typeof cargarMetricas === 'function') {
    cargarMetricas();
  }
}

async function fetchAppointments(fecha = '', estado = 'todos', query = '', orden = 'DESC') {
  const token = localStorage.getItem('adminToken');
  const tbody = document.getElementById('appointments-list');
  if (!tbody) return;

  mostrarEstado('loading');

  try {
    const params = new URLSearchParams();
    if (fecha) params.append('fecha', fecha);
    if (estado && estado !== 'todos') params.append('estado', estado);
    if (orden) params.append('orden', orden);

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

    let reservas = await response.json();

    // Ordenamiento por fecha y hora
    reservas.sort((a, b) => {
      const fechaA = new Date(`${a.fecha}T${a.hora || '00:00'}`);
      const fechaB = new Date(`${b.fecha}T${b.hora || '00:00'}`);
      return orden === 'ASC' ? fechaA - fechaB : fechaB - fechaA;
    });

    // Filtro cliente por término de búsqueda (nombre, teléfono o servicio)
    if (query) {
      const q = query.toLowerCase();
      reservas = reservas.filter(r => {
        const nombre = (r.cliente_nombre || '').toLowerCase();
        const tel = (r.cliente_telefono || r.telefono || '').toLowerCase();
        const servicio = (r.servicio_nombre || '').toLowerCase();
        return nombre.includes(q) || tel.includes(q) || servicio.includes(q);
      });
    }

    // Manejo de Estado Vacío vs Tabla con datos
    if (reservas.length === 0) {
      mostrarEstado('empty');
    } else {
      mostrarEstado('success');
      renderTable(reservas);
    }

  } catch (error) {
    console.error('Error al cargar reservas:', error);
    mostrarEstado('error');
  }
}

function mostrarEstado(estado) {
  const loadingState = document.getElementById('loading-state');
  const errorState = document.getElementById('error-state');
  const emptyState = document.getElementById('empty-state');
  const tableContainer = document.getElementById('table-container') || document.getElementById('appointments-list');

  if (loadingState) loadingState.style.display = 'none';
  if (errorState) errorState.style.display = 'none';
  if (emptyState) emptyState.style.display = 'none';
  if (tableContainer) tableContainer.style.display = 'none';

  switch (estado) {
    case 'loading':
      if (loadingState) loadingState.style.display = 'block';
      break;
    case 'error':
      if (errorState) errorState.style.display = 'block';
      break;
    case 'empty':
      if (emptyState) emptyState.style.display = 'block';
      break;
    case 'success':
      if (tableContainer) tableContainer.style.display = '';
      break;
  }
}

function renderTable(reservas) {
  const tbody = document.getElementById('appointments-list');
  if (!tbody) return;
  tbody.replaceChildren();

  if (reservas.length === 0) {
    const tr = document.createElement('tr');
    const td = document.createElement('td');
    td.colSpan = 7;
    td.style.textAlign = 'center';
    td.style.padding = '24px';
    td.style.color = '#6b7280';
    td.textContent = 'No se encontraron reservas que coincidan con los filtros.';
    tr.appendChild(td);
    tbody.appendChild(tr);
    return;
  }

  reservas.forEach(reserva => {
    const tr = document.createElement('tr');
    const telefono = reserva.cliente_telefono || reserva.telefono || '';
    const estadoLimpio = reserva.estado ? reserva.estado.toLowerCase().trim() : 'pendiente';

    let fechaFormateada = reserva.fecha || '';
    if (fechaFormateada.includes('-')) {
      const [y, m, d] = fechaFormateada.split('T')[0].split('-');
      fechaFormateada = `${d}/${m}/${y}`;
    }

    tr.className = `row-estado-${estadoLimpio}`;

    [fechaFormateada, reserva.hora, reserva.cliente_nombre, telefono, reserva.servicio_nombre]
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
      background-color: #333333;
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

    .calendar-reset-btn {
      margin-top: 10px;
      padding: 8px 12px;
      font-size: 12px;
      text-align: center;
      background-color: #2a2a2a;
      border-radius: 6px;
      cursor: pointer;
      font-weight: 500;
      color: #ffffff;
      transition: background-color 0.2s;
    }

    .calendar-reset-btn:hover {
      background-color: #3f3f46;
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
