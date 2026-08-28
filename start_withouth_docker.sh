#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

if [[ ! -f "$ROOT_DIR/.env" ]]; then
  echo "Error: no se encontró .env en la raíz del proyecto." >&2
  exit 1
fi

set -a
# Se cargan aquí por comodidad y para validarlas antes de iniciar los procesos.
# El backend también las carga automáticamente desde .env mediante dotenv.
# shellcheck disable=SC1091
source "$ROOT_DIR/.env"
set +a

: "${DB_NAME:?Falta DB_NAME en .env}"
: "${DB_USER:?Falta DB_USER en .env}"
: "${DB_PASSWORD:?Falta DB_PASSWORD en .env}"
: "${JWT_SECRET:?Falta JWT_SECRET en .env}"

DB_HOST="${DB_HOST:-127.0.0.1}"
DB_PORT="${DB_PORT:-3306}"

if ! command -v node >/dev/null 2>&1 || ! command -v npm >/dev/null 2>&1; then
  echo "Error: Node.js y npm deben estar instalados." >&2
  exit 1
fi

if command -v mysqladmin >/dev/null 2>&1; then
  if ! mysqladmin ping \
    --host="$DB_HOST" \
    --port="$DB_PORT" \
    --user="$DB_USER" \
    --password="$DB_PASSWORD" \
    --silent >/dev/null 2>&1; then
    echo "Error: no se pudo conectar a MySQL en $DB_HOST:$DB_PORT." >&2
    exit 1
  fi
else
  echo "mysqladmin no está disponible; la conexión se validará durante la migración."
fi

# Se instalan las dependencias del backend si no existen
if [[ ! -d "$ROOT_DIR/backend/node_modules" ]]; then
  echo "Instalando dependencias del backend..."
  npm --prefix "$ROOT_DIR/backend" ci
fi

# Se instalan las dependencias del frontend si no existen
if [[ ! -d "$ROOT_DIR/web/node_modules" ]]; then
  echo "Instalando dependencias del frontend..."
  npm --prefix "$ROOT_DIR/web" ci
fi

# Se ejecutan las migraciones de la base de datos
echo "Ejecutando migraciones..."
(cd "$ROOT_DIR" && node backend/migrate.js)

# Se ejecuta el script de limpieza al salir
cleanup() {
  trap - INT TERM EXIT
  [[ -n "${BACKEND_PID:-}" ]] && kill "$BACKEND_PID" 2>/dev/null || true
  [[ -n "${FRONTEND_PID:-}" ]] && kill "$FRONTEND_PID" 2>/dev/null || true
  wait 2>/dev/null || true
}

# Se ejecuta la limpieza al recibir señales de interrupción o terminación
trap cleanup INT TERM EXIT

export DB_HOST DB_PORT

# Se ejecuta el backend
echo "Iniciando API en http://localhost:${PORT:-3000}..."
(cd "$ROOT_DIR" && node backend/server.js) &
BACKEND_PID=$!

# Se ejecuta el frontend Vite
echo "Iniciando frontend Vite..."
(cd "$ROOT_DIR/web" && npm run dev) &
FRONTEND_PID=$!

echo "Aplicación disponible en http://localhost:5173"
wait -n "$BACKEND_PID" "$FRONTEND_PID"
