# Changelog

## 2026-08-28 - Cambios iniciales

- Reestructuración del proyecto para separar frontend, backend y configuración.
- Incorporación de Vite para el frontend y Docker Compose para los servicios de la aplicación.
- Organización de los archivos Docker en la carpeta `.docker/`.
- Separación de la configuración de Express, las rutas y el arranque del servidor en `apps.js`, `route.js` y `server.js`.
- Incorporación de migraciones y semillas para la base de datos y el usuario administrador de desarrollo.
- Creación de documentación para desarrollo local y despliegue en `README.md`, `docs/DEPLOY.md` y `docs/proximos-pasos.md`.
- Incorporación de configuraciones de proyecto para VS Code, EditorConfig, Prettier y extensiones recomendadas.
- Creación de `start_withouth_docker.sh` para instalar dependencias, ejecutar migraciones e iniciar frontend y backend sin Docker.
- Mejoras en la configuración de assets, carga de estilos, fuentes y rutas del panel administrativo.
