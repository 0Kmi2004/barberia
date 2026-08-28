# Barbería

Aplicación web con JavaScript vanilla, API Express y base de datos MySQL.

## Desarrollo local con Docker

Copiá `.env.example` como `.env` y configurá los secretos locales. Iniciá MySQL y la API con Docker:

```bash
docker compose up --build
```
### Comandos útiles

```bash
docker compose up --build
docker compose down
docker compose down -v # también elimina los datos locales de MySQL
```


La aplicación está disponible en `http://localhost:8080`; el endpoint de salud de la API es `http://localhost:3000/health`.

Para desarrollar únicamente el frontend con recarga automática, iniciá primero la API y luego ejecutá:

```bash
cd web
npm install
npm run dev
```

Vite sirve el sitio en `http://localhost:5173` y redirige las llamadas `/api` a la API en el puerto 3000.

## Desarrollo local sin Docker

Docker no es necesario si MySQL Server ya está instalado localmente.

### Configuración de MySQL

Creá la base de datos `barberia` y un usuario dedicado usando tu instalación local de MySQL. El backend lee estas variables:

```env
DB_HOST=127.0.0.1
DB_NAME=barberia
DB_USER=barberia
DB_PASSWORD=your_mysql_password
PORT=3000
JWT_SECRET=your_long_local_secret
```

`MYSQL_ROOT_PASSWORD` solo es necesaria al iniciar MySQL con Docker Compose.

### Iniciar la aplicación

Con MySQL ya iniciado localmente y el `.env` raíz configurado, iniciá la API y el frontend juntos con:

```bash
./start_withouth_docker.sh
```

El script verifica el entorno local, instala las dependencias faltantes, ejecuta las migraciones, inicia la API backend en el puerto 3000 y el frontend en el puerto 5173. Presioná `Ctrl+C` para detener ambos procesos.

La aplicación está disponible en `http://localhost:5173` y el endpoint de salud de la API es `http://localhost:3000/health`.

## Migraciones de la base de datos

El script auxiliar ejecuta las migraciones automáticamente antes de iniciar la aplicación. Para ejecutar únicamente las migraciones, sin iniciar la API ni el frontend, usá este comando desde la raíz del proyecto:

```bash
npm --prefix backend run migrate
```

El comando de migración utiliza las variables `DB_*` del `.env` raíz y crea la base de datos si no existe. El usuario de la base debe tener permisos para crear bases de datos; de lo contrario, creá `barberia` manualmente antes de ejecutar el comando.

Las migraciones también crean un usuario administrador de desarrollo por defecto:

```text
Email: admin@barberia.com
Contraseña: admin123
```

Cambiá esta contraseña antes de usar la aplicación en producción.

