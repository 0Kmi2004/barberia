# Próximos pasos

Este documento reúne mejoras recomendadas antes de publicar el proyecto y próximas mejoras funcionales. El orden sugerido es: seguridad, disponibilidad y logs; luego performance y SEO; finalmente mejoras de presentación y del dashboard.

## 1. Seguridad

### Headers HTTP

Configurar estos headers en el servidor web o en un middleware de Express:

- `Permissions-Policy`: deshabilitar APIs del navegador que la aplicación no utiliza, por ejemplo cámara, micrófono, geolocalización y pagos.
- `X-Frame-Options: DENY` o `SAMEORIGIN`: evitar que el sitio sea embebido en iframes.
- `X-Content-Type-Options: nosniff`: evitar que el navegador adivine tipos MIME.
- `Referrer-Policy: strict-origin-when-cross-origin`: limitar la información enviada como referrer.
- `Content-Security-Policy`: definir explícitamente orígenes permitidos para scripts, estilos, imágenes, fuentes, videos y conexiones API.
- `X-XSS-Protection: 0`: este header se solicita por compatibilidad, pero los navegadores modernos lo consideran obsoleto. La protección principal debe ser CSP, escape de contenido y validación de entrada.

Ejemplo inicial para Nginx, que debe ajustarse a los recursos realmente utilizados:

```nginx
add_header Permissions-Policy "camera=(), microphone=(), geolocation=(), payment=()" always;
add_header X-Frame-Options "DENY" always;
add_header X-Content-Type-Options "nosniff" always;
add_header Referrer-Policy "strict-origin-when-cross-origin" always;
add_header X-XSS-Protection "0" always;
add_header Content-Security-Policy "default-src 'self'; script-src 'self' https://unpkg.com; style-src 'self' 'unsafe-inline' https://cdnjs.cloudflare.com; img-src 'self' data:; font-src 'self' https://cdnjs.cloudflare.com; media-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'" always;
```

La política actual usa recursos externos de Font Awesome y Lucide. Antes de endurecer `Content-Security-Policy`, revisar si esos recursos pueden descargarse y servirse desde el propio proyecto. Evitar `unsafe-eval`; reducir `unsafe-inline` cuando el frontend esté preparado para ello.

### HTTPS

- Redirigir todo el tráfico HTTP a HTTPS con una redirección permanente `301`.
- Configurar el certificado SSL y renovarlo automáticamente.
- Verificar que el proxy conserve `X-Forwarded-Proto`.
- Activar HSTS (`Strict-Transport-Security`) solo después de confirmar que todo el sitio funciona correctamente con HTTPS.
- Actualizar `APP_URL` o `WEB_URL` del entorno de producción a la URL HTTPS real.

Ejemplo conceptual:

```nginx
server {
  listen 80;
  server_name midominio.com www.midominio.com;
  return 301 https://midominio.com$request_uri;
}
```

### Archivos y rutas privadas

Bloquear el acceso público a archivos y directorios que nunca deben servirse:

- `.env`, `.env.*` y archivos con secretos.
- `.git/`, `.gitignore` y archivos de configuración del repositorio.
- `node_modules/`.
- `backend/`, `web/src/` y archivos fuente que no sean necesarios en el servidor público.
- Logs, dumps y archivos temporales.
- Archivos de configuración de Composer (`composer.json`, `composer.lock`) si alguna vez se agregan al proyecto.
- `package.json`, `package-lock.json`, archivos Docker y configuraciones internas cuando el hosting no los necesite públicamente.

Además de bloquearlos en Nginx o Apache, no se deben subir secretos a la carpeta pública. Las reglas del servidor no reemplazan una correcta separación entre `public_html/`, el backend y los archivos de configuración.

## 2. Performance

### Cache de archivos estáticos

Configurar cache de larga duración para assets versionados generados por Vite:

```nginx
location ~* \.(css|js|svg|png|jpg|jpeg|webp|gif|woff2|mp4)$ {
  expires 30d;
  add_header Cache-Control "public, max-age=2592000, immutable";
}
```

No aplicar cache inmutable a HTML, respuestas `/api/` ni archivos que cambien sin cambiar su nombre. Para HTML usar, por ejemplo, `Cache-Control: no-cache` o una política corta.

### Compresión

- Habilitar Brotli si el hosting lo soporta.
- Habilitar Gzip como fallback para HTML, CSS, JavaScript, JSON, SVG y fuentes compatibles.
- No comprimir nuevamente videos, imágenes WebP/PNG/JPEG o archivos que ya estén comprimidos.
- Verificar que `Content-Encoding` sea `br` o `gzip` en producción.
- Mantener el build de Vite minificado y eliminar archivos de desarrollo del servidor público.

### Assets

- Optimizar `barvideo.mp4` y las imágenes para el tamaño real de visualización.
- Mantener `width`, `height` o `aspect-ratio` en imágenes y videos para reducir cambios de layout.
- Usar lazy loading para imágenes que estén fuera del primer viewport.
- Precargar solo fuentes y recursos realmente críticos.

## 3. SEO

- Definir títulos y descripciones únicos para la landing, la reserva y el panel.
- Agregar `meta name="description"`, canonical URL y etiquetas Open Graph para la landing.
- Usar un único `h1` descriptivo y una jerarquía correcta de encabezados.
- Agregar `alt` útil a las imágenes y texto accesible a los controles.
- Crear un sitemap con las URLs públicas reales y registrarlo en Google Search Console.
- No indexar el login ni el dashboard.

### Crear `robots.txt`

Crear `web/public/robots.txt` para que Vite lo copie a la raíz del sitio publicado. El objetivo es permitir el rastreo de las páginas públicas y evitar que los buscadores indexen el panel administrativo o los endpoints de la API:

```text
User-agent: *
Disallow: /admin/
Disallow: /api/

Sitemap: https://midominio.com/sitemap.xml
```

Después del build, verificar que el archivo esté disponible en `https://midominio.com/robots.txt`. `robots.txt` es una instrucción para rastreadores, no un mecanismo de seguridad: las rutas `/admin/` y `/api/` deben continuar protegidas por autenticación y autorización en el servidor.

### Sitemap XML

Mantener un sitemap XML en `/sitemap.xml` con las URLs públicas reales y enlazarlo desde `robots.txt`. Luego registrarlo en Google Search Console.

## 4. Landing page

Crear una landing page del proyecto antes de mostrar el demo de la barbería:

- Presentar primero el producto y su propuesta de valor.
- Incluir un botón claro hacia el demo de la barbería.
- Mantener la reserva pública accesible desde la landing sin agregar pasos innecesarios.
- Separar las rutas, por ejemplo `/` para la landing y `/demo/` para la aplicación de barbería.
- Mantener `/admin/` fuera del flujo público de la landing.
- Diseñar la landing para mobile y desktop, con tiempos de carga bajos y un CTA visible.
- Agregar la metadata SEO de la landing sin duplicar títulos del demo.

Antes de hacer este cambio, definir si la aplicación actual en `web/index.html` se trasladará a `/demo/` o si la landing reemplazará temporalmente la página principal con un enlace al demo.

## 5. Mejoras del dashboard

### Buscador

Agregar un buscador para filtrar reservas por:

- Nombre del cliente.
- Teléfono.
- Email.
- Servicio.
- Fecha.
- Estado.

La búsqueda debe ejecutarse en el backend con consultas parametrizadas y filtros indexables cuando el volumen de reservas crezca. Para pocos registros puede filtrarse en el frontend, pero no se deben cargar datos de otros tenants si el sistema evoluciona a multitenancy.

### Mostrar todas las reservas por defecto

Actualmente el dashboard inicializa una fecha seleccionada y solicita las reservas con ese filtro. El comportamiento deseado es:

1. Al abrir el dashboard, solicitar `/api/admin/reservas` sin parámetro `fecha`.
2. Mostrar todas las reservas ordenadas por fecha y hora.
3. Mantener el selector de fecha como filtro opcional.
4. Permitir volver a la vista completa con una opción `Todas las fechas`.
5. Mantener las métricas separadas: métricas generales para todas las reservas y métricas por fecha cuando se aplique el filtro.

El endpoint backend ya soporta una consulta sin `fecha`; el cambio principal está en la inicialización de `fechaSeleccionadaStr` y en `applyFilters()` del frontend.

### Validaciones del dashboard

- Mostrar un estado visible cuando no hay resultados.
- Mostrar errores de API sin dejar la tabla en un estado ambiguo.
- Mantener la autenticación y autorización en cada endpoint administrativo.
- Aplicar el buscador, estado y fecha de forma combinable.
- Agregar paginación si la cantidad de reservas deja de ser pequeña.

## 6. Observabilidad básica

Agregar logs útiles en la aplicación sin registrar secretos ni datos personales innecesarios:

- Inicio y detención de la aplicación.
- Método, ruta, código de respuesta y duración de cada request.
- Errores con un identificador de request.
- Inicio y resultado de migraciones.
- Fallos de conexión a MySQL.
- Eventos de autenticación sin registrar contraseñas, JWT ni hashes.
- Creación y actualización de reservas usando IDs, no nombres, emails o teléfonos.

Un middleware inicial para Express puede registrar duración y estado:

```js
app.use((req, res, next) => {
  const startedAt = Date.now();

  res.on('finish', () => {
    const durationMs = Date.now() - startedAt;
    console.log(JSON.stringify({
      level: 'info',
      method: req.method,
      path: req.originalUrl,
      status: res.statusCode,
      durationMs
    }));
  });

  next();
});
```

Para producción, enviar la salida a los logs administrados por el hosting o a un agregador. Configurar rotación y retención para evitar llenar el disco. La variable `DEBUG` debe controlar logs de diagnóstico adicionales y permanecer desactivada en producción.

## Orden sugerido de implementación

1. Separar correctamente archivos públicos y privados.
2. Activar HTTPS y headers de seguridad.
3. Agregar logs básicos y revisar errores de API.
4. Configurar cache y compresión.
5. Completar metadata SEO, `robots.txt` y sitemap.
6. Definir e implementar la landing del proyecto.
7. Mejorar el dashboard con vista completa, búsqueda y estados vacíos.
8. Repetir las pruebas funcionales y de seguridad antes del deploy.
