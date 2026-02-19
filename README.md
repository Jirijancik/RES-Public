# GTDN - Get To the Data Now

A full-stack web application providing unified access to Czech government business registry (ARES) and justice register data. Built with Next.js and Django REST Framework.

---

## Quick Start

> **First time?** Follow every step below. Already set up? Skip to step 3.

### 1. Install prerequisites

You need these installed on your machine before anything else:

- **Bun** — [Download here](https://bun.sh/) (`curl -fsSL https://bun.sh/install | bash`)
- **Docker Desktop** — [Download here](https://www.docker.com/products/docker-desktop/)

After installing, **open Docker Desktop** and make sure it's running (you should see the whale icon in your menu bar / system tray).

Verify everything is ready:

```bash
bun --version           # Should print 1.0+
docker --version        # Should print Docker version 20+
docker compose version  # Should print v2+
```

### 2. Install frontend dependencies

```bash
cd res
bun install
```

### 3. Create the backend environment file

Create a file called `.env` inside the `backend/` folder:

```bash
# From the project root (res/)
touch backend/.env
```

Then paste this content into `backend/.env`:

```env
# Django
DJANGO_SECRET_KEY=dev-secret-key-change-in-production
DJANGO_DEBUG=True

# Database (must match docker-compose.yml)
DB_NAME=gtdn
DB_USER=gtdn_user
DB_PASSWORD=changeme
DB_HOST=db
DB_PORT=5432

# Redis
REDIS_URL=redis://redis:6379/0

# CORS / CSRF
CSRF_TRUSTED_ORIGINS=http://localhost:3000,http://localhost:8000

# Email (optional — fill in when you need contact forms)
MAIL_HOST=
MAIL_PORT=587
MAIL_USERNAME=
MAIL_PASSWORD=
MAIL_FROM_NAME=GTDN
MAIL_FROM_ADDRESS=

# Contact form recipient
FORM_RECIPIENT_EMAIL=

# Cloudflare Turnstile (optional — for CAPTCHA verification)
TURNSTILE_SECRET_KEY=
```

### 4. Start the backend (Docker)

This single command starts Django, PostgreSQL, Redis, and Nginx together:

```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml up --build
```

> First run takes 2–5 minutes to download images and build. Subsequent starts are fast.
>
> Leave this terminal running. You'll see logs from all services.

### 5. Run database migrations

Open a **new terminal** and run:

```bash
docker compose exec django python manage.py migrate
```

This creates the database tables Django needs. You only need to run this once (and again whenever the models change).

### 6. Start the frontend

Open another **new terminal** and run:

```bash
bun dev
```

### 7. Open the app

| What           | URL                              |
| -------------- | -------------------------------- |
| **Frontend**   | http://localhost:3000             |
| **Backend API**| http://localhost:8000/api/health/ |
| **Django Admin**| http://localhost:8000/admin/     |

You should see the GTDN homepage at `localhost:3000`.

### Optional: Create a Django admin account

```bash
docker compose exec django python manage.py createsuperuser
```

Follow the prompts to set a username and password, then log in at http://localhost:8000/admin/.

### Stopping the project

```bash
# In the terminal running Docker:
Ctrl+C

# Or from any terminal:
docker compose down
```

### Starting again next time

```bash
# 1. Make sure Docker Desktop is running
# 2. Start backend:
docker compose -f docker-compose.yml -f docker-compose.dev.yml up
# 3. In a second terminal, start frontend:
bun dev
```

No need to `--build` or `migrate` again unless dependencies or models changed.

---

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Prerequisites](#prerequisites)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Available Services](#available-services)
- [API Endpoints](#api-endpoints)
- [Project Structure](#project-structure)
- [Scripts Reference](#scripts-reference)
- [Docker Reference](#docker-reference)
- [Troubleshooting](#troubleshooting)

---

## Overview

GTDN aggregates data from Czech government APIs (ARES business registry, Justice register) into a single, user-friendly interface. The backend proxies and caches external API calls, translates Czech field names into English, and handles contact forms and newsletter subscriptions.

**Key features:**

- Business entity search and detail views (ARES)
- Justice register integration
- Contact form with Cloudflare Turnstile CAPTCHA
- Newsletter subscription
- Bilingual interface (Czech & English)
- Dark/light theme
- Interactive maps (Leaflet)
- Cookie consent (EU-compliant)
- SEO with dynamic OG images

---

## Architecture

```
                                ┌──────────────────────┐
                                │    External APIs      │
                                │  - ares.gov.cz        │
                                │  - or.justice.cz      │
                                │  - Cloudflare         │
                                └──────────┬───────────┘
                                           │
┌──────────────┐      ┌────────────────────▼──────────────────┐
│              │      │          Docker Compose                │
│   Next.js    │ HTTP │  ┌─────────┐  ┌──────┐  ┌──────────┐ │
│   Frontend   │─────▶│  │ Django  │──│Redis │  │PostgreSQL│ │
│   :3000      │      │  │Gunicorn │  │cache │  │    DB    │ │
│              │      │  └─────────┘  └──────┘  └──────────┘ │
└──────────────┘      │       ▲                               │
                      │  ┌────┴────┐                          │
                      │  │  Nginx  │ :80                      │
                      │  └─────────┘                          │
                      └───────────────────────────────────────┘
```

**Data flow:** Next.js frontend → Nginx reverse proxy → Django API → Redis cache / PostgreSQL / External APIs

---

## Tech Stack

### Frontend

| Category       | Technology                                     |
| -------------- | ---------------------------------------------- |
| Framework      | Next.js 16 (App Router, Turbopack)             |
| Language       | TypeScript 5 (strict mode)                     |
| React          | React 19.2                                     |
| Styling        | Tailwind CSS v4 (CSS-first)                    |
| UI Components  | shadcn/ui + Radix UI                           |
| Forms          | TanStack Form + Zod                            |
| Data Fetching  | TanStack React Query + Axios                   |
| i18n           | react-i18next (Czech, English)                 |
| Maps           | Leaflet + react-leaflet                        |
| CAPTCHA        | Cloudflare Turnstile                           |
| Icons          | Lucide React                                   |
| Theme          | next-themes (dark/light/system)                |

### Backend

| Category   | Technology                                        |
| ---------- | ------------------------------------------------- |
| Framework  | Django 5.1 + Django REST Framework 3.15           |
| Language   | Python 3.12                                       |
| Database   | PostgreSQL 16                                     |
| Cache      | Redis 7 (in-memory only, no persistence)          |
| Server     | Gunicorn (production) / Django runserver (dev)     |
| Proxy      | Nginx (Alpine)                                    |
| Container  | Docker with multi-stage builds                    |

---

## Prerequisites

- **Bun** — [Download here](https://bun.sh/)
- **Docker Desktop** (includes Docker Engine and Docker Compose)
- **Git**

Verify installation:

```bash
bun --version           # 1.0+
docker --version        # 20+
docker compose version  # v2+
```

---

## Getting Started

### 1. Clone and install frontend dependencies

```bash
git clone <repository-url>
cd res
bun install
```

### 2. Create the backend environment file

Create `backend/.env` with the following content:

```env
# Django
DJANGO_SECRET_KEY=dev-secret-key-change-in-production
DJANGO_DEBUG=True

# Database (must match docker-compose.yml)
DB_NAME=gtdn
DB_USER=gtdn_user
DB_PASSWORD=changeme
DB_HOST=db
DB_PORT=5432

# Redis
REDIS_URL=redis://redis:6379/0

# CORS / CSRF
CSRF_TRUSTED_ORIGINS=http://localhost:3000,http://localhost:8000

# Email (optional - fill in when needed)
MAIL_HOST=
MAIL_PORT=587
MAIL_USERNAME=
MAIL_PASSWORD=
MAIL_FROM_NAME=GTDN
MAIL_FROM_ADDRESS=

# Contact form recipient
FORM_RECIPIENT_EMAIL=

# Cloudflare Turnstile (optional - for CAPTCHA verification)
TURNSTILE_SECRET_KEY=
```

### 3. Start the backend services (Docker)

```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml up --build
```

This builds the Django image and starts all four services: **Django**, **PostgreSQL**, **Redis**, and **Nginx**. The first build takes a few minutes.

### 4. Run database migrations

In a **second terminal**:

```bash
docker compose exec django python manage.py migrate
```

### 5. (Optional) Create a Django admin superuser

```bash
docker compose exec django python manage.py createsuperuser
```

### 6. Start the frontend

In a **third terminal**:

```bash
bun dev
```

### 7. Open the app

| Service        | URL                              |
| -------------- | -------------------------------- |
| Frontend       | http://localhost:3000             |
| Backend API    | http://localhost:8000/api/        |
| Django Admin   | http://localhost:8000/admin/      |

---

## Environment Variables

### `backend/.env`

| Variable                | Required | Description                                     |
| ----------------------- | -------- | ----------------------------------------------- |
| `DJANGO_SECRET_KEY`     | Yes      | Django secret key (change for production)        |
| `DJANGO_DEBUG`          | No       | Enable debug mode (`True`/`False`)               |
| `DB_NAME`               | Yes      | PostgreSQL database name                         |
| `DB_USER`               | Yes      | PostgreSQL username                              |
| `DB_PASSWORD`           | Yes      | PostgreSQL password                              |
| `DB_HOST`               | Yes      | Database host (`db` in Docker)                   |
| `DB_PORT`               | No       | Database port (default: `5432`)                  |
| `REDIS_URL`             | No       | Redis connection URL                             |
| `CSRF_TRUSTED_ORIGINS`  | No       | Comma-separated trusted origins for CSRF         |
| `MAIL_HOST`             | No       | SMTP server hostname                             |
| `MAIL_PORT`             | No       | SMTP port (`587` for TLS, `465` for SSL)         |
| `MAIL_USERNAME`         | No       | SMTP username                                    |
| `MAIL_PASSWORD`         | No       | SMTP password                                    |
| `MAIL_FROM_NAME`        | No       | Sender display name                              |
| `MAIL_FROM_ADDRESS`     | No       | Sender email address                             |
| `FORM_RECIPIENT_EMAIL`  | No       | Email address receiving contact form submissions |
| `TURNSTILE_SECRET_KEY`  | No       | Cloudflare Turnstile server-side secret           |

---

## Available Services

When running `docker compose -f docker-compose.yml -f docker-compose.dev.yml up`:

| Service      | Internal Port | Exposed Port | Description                        |
| ------------ | ------------- | ------------ | ---------------------------------- |
| `django`     | 8000          | 8000         | Django API server (dev: runserver)  |
| `db`         | 5432          | 5432         | PostgreSQL 16 database             |
| `redis`      | 6379          | 6379         | Redis 7 cache (no persistence)     |
| `nginx`      | 80            | 80           | Reverse proxy for static/API       |

> In production (`docker-compose.yml` only), only Nginx port 80 is exposed. Database and Redis ports are internal.

---

## API Endpoints

| Method | Endpoint                     | Description                        |
| ------ | ---------------------------- | ---------------------------------- |
| GET    | `/api/health/`               | Health check                       |
| GET    | `/api/v1/ares/search/`       | Search businesses in ARES          |
| GET    | `/api/v1/ares/detail/`       | Get business details from ARES     |
| GET    | `/api/v1/justice/search/`    | Search justice register             |
| POST   | `/api/v1/contacts/submit/`   | Submit contact form                |
| POST   | `/api/v1/contacts/newsletter/` | Subscribe to newsletter          |

---

## Project Structure

```
res/
├── src/                          # Frontend (Next.js)
│   ├── app/                      # App Router (pages, layouts)
│   ├── assets/                   # Static assets (SVGs, images)
│   ├── components/
│   │   ├── ui/                   # shadcn/ui components (30+)
│   │   ├── layout/               # Header, footer, navbar
│   │   └── {domain}/             # Domain-specific components
│   ├── config/                   # App configuration (site, nav, legal)
│   ├── lib/                      # Services layer
│   │   ├── api/                  # Axios client setup
│   │   ├── ares/                 # ARES domain (types, queries, mutations)
│   │   └── query-client.ts       # React Query config
│   ├── locales/                  # i18n translations (cs/, en/)
│   ├── styles/                   # Global CSS
│   └── types/                    # Shared TypeScript types
│
├── backend/                      # Backend (Django)
│   ├── config/                   # Django settings (base, dev, prod)
│   ├── core/                     # Shared utilities and base classes
│   ├── ares/                     # ARES API integration
│   ├── justice/                  # Justice register integration
│   ├── contacts/                 # Contact form and newsletter
│   ├── requirements/             # Python dependencies (base, dev, prod)
│   └── Dockerfile                # Multi-stage production build
│
├── nginx/
│   └── nginx.conf                # Reverse proxy configuration
│
├── docker-compose.yml            # Production service definitions
├── docker-compose.dev.yml        # Development overrides
├── package.json                  # Frontend dependencies and scripts
├── tsconfig.json                 # TypeScript configuration
├── next.config.ts                # Next.js configuration
└── AGENTS.md                     # Development guidelines
```

### Backend App Pattern

Each Django app (ares, justice, contacts) follows the same structure:

```
{app}/
├── client.py          # Raw HTTP calls to external API
├── parser.py          # Transform external → internal format
├── services.py        # Business logic + Redis cache orchestration
├── serializers.py     # DRF validation and response shape
├── views.py           # Thin HTTP endpoint handlers
├── urls.py            # Route definitions
├── models.py          # Database models
├── constants.py       # Domain-specific constants
└── tests/             # Unit tests
```

---

## Scripts Reference

### Frontend (Bun)

| Command            | Description                              |
| ------------------ | ---------------------------------------- |
| `bun dev`          | Start development server (Turbopack)     |
| `bun run build`    | Production build                         |
| `bun start`        | Start production server                  |
| `bun lint`         | Run ESLint                               |
| `bun format`       | Format code with Prettier                |

### Backend (via Docker)

| Command                                             | Description                     |
| --------------------------------------------------- | ------------------------------- |
| `docker compose exec django python manage.py migrate` | Run database migrations         |
| `docker compose exec django python manage.py createsuperuser` | Create admin user       |
| `docker compose exec django python manage.py shell`  | Open Django Python shell        |
| `docker compose exec django python manage.py test`   | Run backend tests               |

---

## Docker Reference

### Common Commands

| Action                        | Command                                                          |
| ----------------------------- | ---------------------------------------------------------------- |
| Start (dev)                   | `docker compose -f docker-compose.yml -f docker-compose.dev.yml up` |
| Start + rebuild               | Add `--build` to the above                                       |
| Start in background           | Add `-d` to the above                                            |
| Stop                          | `docker compose down`                                            |
| Stop + delete volumes (DB!)   | `docker compose down -v`                                         |
| View all logs                 | `docker compose logs -f`                                         |
| View Django logs only         | `docker compose logs -f django`                                  |
| Restart a single service      | `docker compose restart django`                                  |
| Run a command in Django       | `docker compose exec django <command>`                           |

### Development vs Production

| Feature              | Development (`-f dev`)           | Production (default)          |
| -------------------- | -------------------------------- | ----------------------------- |
| Django server        | `runserver` (auto-reload)        | Gunicorn (5 workers)          |
| Code changes         | Instant (bind mount)             | Requires rebuild              |
| Debug mode           | Enabled                          | Disabled                      |
| DB/Redis ports       | Exposed to host                  | Internal only                 |
| Settings module      | `config.settings.development`    | `config.settings.production`  |

### Volume Management

| Volume           | Purpose                                    | Safe to delete?  |
| ---------------- | ------------------------------------------ | ---------------- |
| `postgres_data`  | Database files                             | No (data loss!)  |
| `static_files`   | Django admin CSS/JS (served by Nginx)      | Yes (auto-regenerated) |

---

## Troubleshooting

### Docker containers won't start

```bash
# Check if Docker is running
docker info

# Check for port conflicts (80, 5432, 6379, 8000)
lsof -i :8000

# Rebuild from scratch
docker compose down -v
docker compose -f docker-compose.yml -f docker-compose.dev.yml up --build
```

### Database migration errors

```bash
# Check if PostgreSQL is healthy
docker compose ps

# View Django logs for errors
docker compose logs django

# Reset database (WARNING: deletes all data)
docker compose down -v
docker compose -f docker-compose.yml -f docker-compose.dev.yml up --build
docker compose exec django python manage.py migrate
```

### Frontend can't connect to backend

1. Make sure Docker services are running: `docker compose ps`
2. Check that Django is accessible: `curl http://localhost:8000/api/health/`
3. Verify CORS is configured (development settings allow all origins)
4. Check the Axios base URL in `src/lib/api/client.ts`

### Port already in use

```bash
# Find what's using the port
lsof -i :<port>

# Kill the process
kill -9 <PID>
```

### Redis/cache issues

```bash
# Connect to Redis CLI
docker compose exec redis redis-cli

# Flush all cached data
docker compose exec redis redis-cli FLUSHALL
```

### Fresh start (nuclear option)

```bash
docker compose down -v              # Stop and delete volumes
docker system prune -f              # Clean up unused Docker resources
docker compose -f docker-compose.yml -f docker-compose.dev.yml up --build
docker compose exec django python manage.py migrate
```
