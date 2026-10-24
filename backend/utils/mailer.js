const { Resend } = require('resend');
const resend = new Resend(process.env.RESEND_API_KEY);

const enviarConfirmacionTurno = async (datosReserva) => {
    const {
        emailCliente,
        nombreCliente,
        fecha,
        hora,
        servicio,
        barbero,
        tokenCancelacion,
        subdominio
    } = datosReserva;

    // Construcción dinámica de la URL según el entorno y el subdominio del tenant
    const dominioBase = process.env.BASE_DOMAIN || 'barberiapp.ar';
    const host = subdominio ? `${subdominio}.${dominioBase}` : dominioBase;

    // Si estás en producción usa HTTPS con tu dominio; si estás en desarrollo local usa localhost
    const protocolo = process.env.NODE_ENV === 'production' ? 'https' : 'http';
    const baseUrl = process.env.NODE_ENV === 'production'
        ? `${protocolo}://${host}`
        : 'http://localhost:3000';

    const urlCancelacion = `${baseUrl}/api/turnos/cancelar?token=${tokenCancelacion}`;

    try {
        const data = await resend.emails.send({
            // 📍 Usando tu dominio corporativo oficial verificado en Resend
            from: 'Barbería App <no-reply@barberiapp.ar>',
            to: emailCliente,
            subject: `¡Turno confirmado! - ${fecha} a las ${hora} hs`,
            html: `
                <div style="font-family: Arial, sans-serif; color: #333; padding: 20px; background-color: #f9f9f9; border-radius: 8px; max-width: 600px; margin: auto;">
                    <h2 style="color: #d4af37;">¡Hola ${nombreCliente}, tu turno está confirmado!</h2>
                    <p>Gracias por reservar con nosotros. Aquí tenés los detalles de tu cita:</p>
                    <ul style="list-style: none; padding: 0; line-height: 1.6;">
                        <li><strong>Servicio:</strong> ${servicio}</li>
                        <li><strong>Fecha:</strong> ${fecha}</li>
                        <li><strong>Hora:</strong> ${hora} hs</li>
                        <li><strong>Barbero:</strong> ${barbero || 'Asignado en el local'}</li>
                    </ul>
                    <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
                    <p style="font-size: 13px; color: #666;">
                        ¿No vas a poder asistir? Recordá que podés cancelar sin inconvenientes hasta 3 horas antes de tu turno haciendo clic en el siguiente botón:
                    </p>
                    <a href="${urlCancelacion}" style="background-color: #e53e3e; color: white; padding: 10px 18px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold; font-size: 14px; margin-top: 5px;">Cancelar mi turno</a>
                </div>
            `
        });
        console.log('Correo enviado correctamente con Resend:', data);
    } catch (error) {
        console.error('Error al enviar correo con Resend:', error);
    }
};

module.exports = { enviarConfirmacionTurno };
