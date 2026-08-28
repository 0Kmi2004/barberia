# Barbería

Vanilla-JavaScript web application, Express API, and MySQL database.

## Local development

Copy `.env.example` to `.env` and choose local secrets. Start MySQL and the API with Docker:

```bash
docker compose up --build
```

The application is available at `http://localhost:8080`; the API health endpoint is `http://localhost:3000/health`.

For frontend-only development with hot reload, start the API first and then run:

```bash
cd web
npm install
npm run dev
```

Vite serves the site on `http://localhost:5173` and proxies `/api` calls to the API on port 3000.

## Local development without Docker

Docker is not required when MySQL Server is already installed locally.

### MySQL configuration

Create the `barberia` database and a dedicated MySQL user using your local MySQL installation. The backend reads these variables:

```env
DB_HOST=127.0.0.1
DB_NAME=barberia
DB_USER=barberia
DB_PASSWORD=your_mysql_password
PORT=3000
JWT_SECRET=your_long_local_secret
```

When running the backend from the `backend/` directory, place these values in `backend/.env`. Do not commit this file. The root `.env` contains the `MYSQL_*` variables used by Docker Compose, while `backend/config/database.js` expects the `DB_*` variables when running outside Docker.

### Start the API

From the backend directory:

```bash
cd backend
npm ci
npm run migrate
npm start
```

The API runs on `http://localhost:3000`. Verify it with `http://localhost:3000/health`.

### Start the frontend

In a second terminal:

```bash
cd web
npm ci
npm run dev
```

Vite runs the frontend on `http://localhost:5173` and proxies `/api` requests to the API on port 3000.

For a production-like frontend preview, build and serve the generated files instead:

```bash
cd web
npm run build
npm run preview
```

Do not open `web/dist` directly as a file in the browser; use Vite or another HTTP server so asset paths and API requests work correctly.

## Database migrations

The API container runs migrations before it starts. To run them outside Docker, configure the `DB_*` variables used by `backend/config/database.js` and run:

```bash
cd backend
npm run migrate
```

## Useful commands

```bash
docker compose up --build
docker compose down
docker compose down -v # also removes local MySQL data
```
