/* =================================
   HELPER MULTI-TENANT
================================= */
// src/api.js

export function getSubdomain() {
  const host = window.location.hostname;
  const parts = host.split('.');

  if (host.includes('localhost')) {
    if (parts.length > 1 && parts[0] !== 'localhost') {
      return parts[0].toLowerCase();
    }
    return null;
  }

  if (parts.length > 2) {
    const sub = parts[0].toLowerCase();
    if (sub !== 'www' && sub !== 'api') {
      return sub;
    }
  }

  return null;
}

export async function fetchLandingConfig() {
  const tenant = getSubdomain();

  // Si estás en localhost, apunta al puerto donde corre Node.js (ej: 3000)
  const API_URL = window.location.hostname.includes('localhost')
    ? 'http://localhost:3000/api/barberia/configuracion' // <--- Cambia 3000 por el puerto de tu backend
    : '/api/barberia/configuracion';

  const res = await fetch(API_URL, {
    headers: {
      'x-tenant': tenant || ''
    }
  });

  if (!res.ok) {
    throw new Error(`Error ${res.status}: No se pudo obtener la configuración.`);
  }

  return await res.json();
}

/* =================================
   PETICIONES API
================================= */


/**
 * Obtiene los horarios disponibles para una fecha específica.
 */
export async function fetchDisponibilidad(fecha) {
  const tenant = getSubdomain();
  const res = await fetch(`/api/disponibilidad/${fecha}`, {
    headers: {
      'x-tenant': tenant || ''
    }
  });

  if (!res.ok) {
    throw new Error('No se pudo obtener la disponibilidad');
  }

  return await res.json();
}

/**
 * Envía la reserva confirmada al servidor.
 */
export async function crearReserva(reservaData) {
  const tenant = getSubdomain();
  const res = await fetch('/api/reservas', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-tenant': tenant || ''
    },
    body: JSON.stringify(reservaData)
  });

  if (!res.ok) {
    throw new Error('No se pudo confirmar la reserva.');
  }

  return await res.json();
}
