// sseService.js
const clientesSSE = {};

function registrarCliente(tenantId, res) {
  if (!clientesSSE[tenantId]) {
    clientesSSE[tenantId] = [];
  }
  clientesSSE[tenantId].push(res);
  console.log(`🟢 [SSE] Cliente conectado para tenant ID: ${tenantId}. Total activos: ${clientesSSE[tenantId].length}`);
}

function removerCliente(tenantId, res) {
  if (clientesSSE[tenantId]) {
    clientesSSE[tenantId] = clientesSSE[tenantId].filter(client => client !== res);
    console.log(`🔴 [SSE] Cliente desconectado para tenant ID: ${tenantId}. Restantes: ${clientesSSE[tenantId].length}`);
  }
}

function notificarAdmin(tenantId, tipoEvento, datos = {}) {
  console.log(`📢 [SSE] Intentando notificar al tenant ID: ${tenantId}. Clientes en memoria:`, clientesSSE[tenantId]?.length || 0);
  if (clientesSSE[tenantId] && clientesSSE[tenantId].length > 0) {
    clientesSSE[tenantId].forEach(client => {
      // Escribimos el evento con el formato SSE estándar
      client.write(`data: ${JSON.stringify({ tipo: tipoEvento, ...datos })}\n\n`);

      // Forzamos el envío inmediato del búfer si el método flush está disponible
      if (typeof client.flush === 'function') {
        client.flush();
      }

      console.log(`✅ [SSE] Evento '${tipoEvento}' enviado con éxito al cliente.`);
    });
  } else {
    console.warn(`⚠️ [SSE] No hay clientes conectados en la lista para el tenant ID: ${tenantId}`);
  }
}

module.exports = {
  registrarCliente,
  removerCliente,
  notificarAdmin
};
