# Deploy en hosting compartido

Esta guía describe un despliegue básico de Barbería en un hosting compartido. El proyecto tiene dos partes:

- `web/`: frontend estático generado con Vite.
- `backend/`: API Express que necesita Node.js y una base de datos MySQL.

## Primera estrategia: sin Docker

Para un hosting compartido, la estrategia inicial recomendada es no usar Docker. Docker Compose queda reservado para el desarrollo local o para un VPS que permita administrar contenedores.

El despliegue sin Docker consiste en:

1. Construir el frontend con Vite y publicar `web/dist/`.
2. Crear una base MySQL desde el panel del proveedor.
3. Ejecutar el backend Express con la aplicación Node.js del hosting.
4. Configurar el proveedor para enviar `/api/` al backend Node.

## Antes de contratar el hosting

Verificá que el proveedor incluya:

- Node.js compatible con la versión usada por el proyecto, preferentemente Node 20 o superior.
- Una forma de ejecutar una aplicación Node.js de manera persistente, por ejemplo `Application Manager`, Passenger, PM2 administrado por el proveedor o una opción equivalente.
- MySQL 8 o una versión compatible.
- Acceso SSH o, como mínimo, una terminal para ejecutar `npm` y las migraciones.
- Configuración de variables de entorno.
- HTTPS mediante un certificado SSL.
- Posibilidad de configurar un proxy o reglas de routing.

Docker no es necesario para este flujo. Si el hosting tampoco permite procesos Node persistentes, habrá que ejecutar la API en otro servicio compatible y mantener el frontend estático en el hosting compartido.

## Arquitectura recomendada

Lo más simple es usar el mismo dominio para frontend y API:

```text
https://midominio.com/             -> web/dist/
https://midominio.com/admin/       -> web/dist/admin/
https://midominio.com/api/*        -> aplicación Express en Node.js
```

El frontend ya utiliza rutas relativas como `/api/reservas`, por lo que esta configuración evita cambios de URL y problemas de CORS.

Si el proveedor solo permite usar un subdominio para Node.js, por ejemplo `api.midominio.com`, habrá que cambiar las llamadas del frontend para usar esa URL y configurar CORS en el backend. No conviene dejar URLs de `localhost` en producción.

## Preparar la base de datos

1. Crear una base MySQL y un usuario dedicado desde el panel del hosting.
2. Otorgar a ese usuario permisos únicamente sobre la base de Barbería.
3. Anotar el host, puerto, nombre de base, usuario y contraseña.
4. Configurar esos valores como variables de entorno de la aplicación Node:

```env
PORT=3000
DB_HOST=host-mysql-del-proveedor
DB_NAME=nombre_de_la_base
DB_USER=usuario_de_la_base
DB_PASSWORD=contraseña_de_la_base
JWT_SECRET=una-clave-larga-aleatoria-y-secreta
```

No subas `.env` al repositorio ni lo publiques dentro de la carpeta del frontend. `DB_*` son las variables que consume el backend. `MYSQL_ROOT_PASSWORD` solo es necesaria para la inicialización de MySQL mediante Docker Compose y no se necesita en este flujo sin Docker. `JWT_SECRET` debe ser diferente en cada entorno y no debe usar valores de ejemplo.

## Construir el frontend

Desde la raíz del proyecto:

```bash
cd web
npm ci
npm run build
```

Esto genera `web/dist/`. Subí el contenido de esa carpeta a la carpeta pública del dominio, normalmente `public_html/` o una carpeta equivalente.

La carpeta publicada debería contener, entre otros archivos:

```text
public_html/index.html
public_html/admin/index.html
public_html/admin/dashboard.html
public_html/assets/
```

No subas `web/node_modules/` ni el código fuente si el hosting solo servirá el frontend estático.

## Configurar y ejecutar el backend

Subí la carpeta `backend/` fuera de la carpeta pública, por ejemplo:

```text
/home/usuario/apps/barberia/backend/
/home/usuario/public_html/
```

Desde el directorio del backend:

```bash
cd /home/usuario/apps/barberia/backend
npm ci --omit=dev
npm run migrate
npm start
```

En un hosting con panel Node.js, normalmente hay que configurar:

- Application root: la carpeta `backend/`.
- Startup file: `server.js`.
- Application URL o dominio.
- Node environment: `production`.
- Variables `PORT`, `DB_HOST`, `DB_NAME`, `DB_USER`, `DB_PASSWORD` y `JWT_SECRET`.

El proveedor puede asignar el puerto internamente. La aplicación ya lee `process.env.PORT`, así que no conviene fijar manualmente otro puerto en el código.

### Alternativa: `supervisord`

Si el proveedor permite usar `supervisord`, puede utilizarse para mantener la API Node.js activa y reiniciarla si se detiene. Esta opción depende de que el hosting permita configuraciones propias de Supervisor; algunos planes compartidos solo ofrecen un gestor Node administrado.

Ejemplo de configuración:

```ini
[program:barberia-api]
directory=/home/usuario/apps/barberia/backend
command=/usr/bin/npm start
user=usuario
autostart=true
autorestart=true
startsecs=5
environment=NODE_ENV="production"
stdout_logfile=/home/usuario/logs/barberia-api.log
stderr_logfile=/home/usuario/logs/barberia-api-error.log
stopasgroup=true
killasgroup=true
```

Adaptá las rutas, el usuario, la ubicación de `npm` y las variables de entorno a la configuración del proveedor. Si las variables no se configuran desde el panel Node.js, pueden declararse en `environment` o cargarse desde el entorno seguro que ofrezca el hosting. No escribas contraseñas ni `JWT_SECRET` directamente en un archivo versionado.

Después de guardar la configuración, los comandos habituales son:

```bash
supervisorctl reread
supervisorctl update
supervisorctl status barberia-api
```

El proceso debe quedar en estado `RUNNING`. Antes de publicar el dominio, verificá que el endpoint `/health` responda y que el proxy del hosting envíe `/api/` a la aplicación Node.

## Routing del frontend y la API

El servidor web debe enviar `/api/` a la aplicación Node y servir el resto como archivos estáticos. La configuración de Nginx incluida en `.docker/web/nginx.conf` sirve únicamente como referencia; no se copia directamente a un hosting Apache/cPanel porque cada proveedor tiene su propia forma de configurar el proxy.

Si el hosting usa Apache, normalmente se necesita una regla de proxy proporcionada por el proveedor. Si no permite proxy hacia Node.js, el frontend cargará, pero las reservas, el login y el panel administrativo no funcionarán.

## Crear el administrador inicial

La migración `backend/migrations/003_seed_admin.sql` crea un administrador de desarrollo si todavía no existe:

```text
Email: admin@barberia.com
Password: admin123
```

Después de iniciar sesión, cambiá esa contraseña o reemplazá la semilla por una credencial propia antes de exponer el sitio públicamente. Esa contraseña no debe mantenerse en producción.

## Verificaciones posteriores

Comprobá, en este orden:

1. `https://midominio.com/` carga el frontend y sus estilos.
2. `https://midominio.com/assets/barvideo.mp4` responde correctamente.
3. `https://midominio.com/api/servicios` responde JSON.
4. `https://midominio.com/admin/` muestra el login.
5. El login permite entrar al dashboard.
6. Se puede crear un turno desde el sitio público.
7. El turno aparece en el dashboard al seleccionar la fecha correcta.
8. El estado de una reserva se puede actualizar.
9. Los logs no exponen contraseñas, tokens ni datos innecesarios de clientes.

## Seguridad y mantenimiento

- Usá HTTPS y redirigí HTTP a HTTPS.
- No subas `.env`, contraseñas, hashes ni tokens al repositorio.
- Cambiá la contraseña del administrador de desarrollo.
- Configurá backups automáticos de MySQL antes de usar datos reales.
- Verificá límites de CPU, memoria, procesos y conexiones del plan compartido.
- Revisá los logs del proveedor si la aplicación se detiene.
- Ejecutá las migraciones antes de iniciar una nueva versión, pero no edites migraciones que ya fueron aplicadas.
- Probá cada actualización primero en un entorno de staging si el proveedor lo ofrece.

## Si el hosting no soporta Node.js

Un hosting que solo sirve HTML/PHP no puede ejecutar este backend Express directamente. En ese caso, las opciones son:

- Hospedar el frontend en el hosting compartido y la API Node en otro servicio.
- Usar un VPS o plataforma que soporte Node.js. Docker puede utilizarse allí como alternativa, pero no es obligatorio.
- Reescribir la API para la tecnología soportada por el hosting, lo que sería un cambio de arquitectura y no forma parte de este despliegue básico.
