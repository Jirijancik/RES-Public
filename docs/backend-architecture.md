# GTDN Backend Architecture Guide

> A comprehensive guide for senior frontend developers building a Django REST API backend with Docker, Redis, and PostgreSQL.

---

## Table of Contents

1. [Overall Architecture](#1-overall-architecture)
2. [Docker](#2-docker)
3. [Backend Structure](#3-backend-structure)
4. [Redis](#4-redis)
5. [PostgreSQL](#5-postgresql)
6. [Django Best Practices](#6-django-best-practices)
7. [Next.js Integration](#7-nextjs-integration)

---

## 1. Overall Architecture

### What We're Building

A Django REST API backend to replace the business logic currently living in the Next.js frontend (`src/lib/`). The frontend currently calls the Czech ARES government API directly from the browser, parses Czech field names into English client-side, and handles contact form emails via Next.js API routes.

**After migration:**

```
                                    ┌──────────────────────┐
                                    │   External APIs       │
                                    │   - ares.gov.cz       │
                                    │   - or.justice.cz     │
                                    │   - Cloudflare        │
                                    └──────────┬───────────┘
                                               │
┌──────────────┐        ┌──────────────────────▼───────────────┐
│              │        │         Docker Compose                 │
│   Next.js    │  HTTP  │  ┌─────────┐  ┌──────┐  ┌────────┐  │
│   Frontend   │───────▶│  │  Django  │──│Redis │  │Postgres│  │
│   (UI only)  │        │  │ Gunicorn │  │cache │  │   DB   │  │
│              │        │  └─────────┘  └──────┘  └────────┘  │
└──────────────┘        │       ▲                               │
                        │       │                               │
                        │  ┌────┴────┐                          │
                        │  │  Nginx  │ :80                      │
                        │  └─────────┘                          │
                        └───────────────────────────────────────┘
```

### What Moves Where

| What | Currently | Moves To |
|------|-----------|----------|
| ARES API calls (search + detail) | Browser calls ares.gov.cz directly | Django proxies + caches in Redis |
| Czech-to-English data parsing | `src/lib/ares/ares.parser.ts` | `backend/ares/parser.py` |
| Contact form (email sending) | `src/app/api/contact-form/route.ts` | `backend/contacts/` Django app |
| Newsletter subscription | `src/app/api/newsletter/route.ts` | `backend/contacts/` Django app |
| Turnstile CAPTCHA verification | `src/lib/turnstile.ts` | `backend/core/services/turnstile.py` (also stays in Next.js) |
| Rate limiting | None (ARES has 14 req/min limit) | Django throttling + Redis cache |

### What Stays in Next.js

- All React components, pages, layouts
- React Query hooks (`ares.queries.ts`, `ares.mutations.ts`, `ares.keys.ts`) -- now pointing at Django
- TypeScript entity types (English interfaces like `AresBusinessRecord`)
- Frontend constants (`REGION_CODES`, `DISTRICT_CODES`) used by select components
- Turnstile widget (client-side CAPTCHA rendering)
- i18n, routing, Tailwind, all UI logic

### Architecture Principles

**1. The Data Source Pattern.** Every external data source (ARES, Justice, future EU VAT, etc.) follows the same file structure:

```
{data_source}/
  client.py        # Raw HTTP to external API
  parser.py        # Transform external format -> internal format
  services.py      # Business logic + cache orchestration
  serializers.py   # DRF input validation + output shape
  views.py         # Thin HTTP endpoint handlers
  urls.py          # Route definitions
  constants.py     # Base URLs, TTLs, lookup tables
  models.py        # ORM models (for future DB persistence)
```

Adding a new data source = copy the pattern, implement 5 files, add 2 lines of config.

**2. The request flow is always the same:**

```
HTTP Request
  -> View (validate input via serializer, delegate to service)
    -> Service (check Redis cache -> call client if miss -> parse -> cache result)
      -> Client (raw HTTP to external API)
      -> Parser (transform external response to internal format)
    -> Serializer (serialize output)
  -> HTTP Response
```

**3. Separation of concerns.**
- **Views** handle HTTP only (like Next.js API route handlers, but thinner)
- **Serializers** validate input + shape output (like Zod schemas)
- **Services** contain business logic (like what your React Query `onSuccess` callbacks do)
- **Clients** talk to external APIs (like your axios instances)
- **Parsers** transform data (like your `ares.parser.ts`)

### Common Pitfalls

- **Don't put business logic in views.** Views should be 5-15 lines. If your view is doing validation, cache checks, API calls, and data transformation, extract it into a service.
- **Don't call external APIs from serializers.** Serializers validate shape and type. Services orchestrate.
- **Don't skip caching.** The ARES API has a 14 req/min rate limit. Without Redis caching, your users will hit rate limits constantly.
- **Don't hardcode URLs.** Use `constants.py` and environment variables. External API URLs change.
- **Don't skip error handling in clients.** External APIs fail. Map their HTTP errors to your own exception types so views can return consistent error responses.

---

## 2. Docker

### What Docker Is (for Frontend Developers)

If you know npm, you already understand Docker's concepts:

| npm Concept | Docker Equivalent | What It Does |
|---|---|---|
| `package.json` | `Dockerfile` | Declares how to build your environment |
| `node_modules/` | Docker **image** | The installed result (read-only snapshot) |
| `npm install` | `docker build` | Creates the environment from the declaration |
| `npx next dev` | `docker run` | Runs a **container** (live instance of an image) |
| `.npmrc` | `.dockerignore` | Tells the tool what to skip |
| `npm workspaces` | `docker-compose.yml` | Orchestrates multiple services together |

**Key mental model:** An **image** is a frozen snapshot of your app + all dependencies. A **container** is a running copy of that image. You can run many containers from one image.

### Why Docker

1. **"Works on my machine" is dead.** PostgreSQL, Redis, Django, Nginx -- everyone on the team runs the exact same versions with one command.
2. **No local installs.** You don't install PostgreSQL or Redis on your Mac. Docker runs them in isolated containers.
3. **Production parity.** Your local environment matches production exactly. No surprises on deploy.
4. **One command.** `docker compose up` starts everything. `docker compose down` stops everything.

### Project File Structure

```
res/                           # Your existing Next.js project root
├── src/                       # Frontend source (unchanged)
├── backend/                   # NEW: Django backend
│   ├── Dockerfile             # How to build the Django image
│   ├── .dockerignore          # What Docker should skip
│   ├── manage.py
│   ├── requirements/
│   │   ├── base.txt
│   │   ├── dev.txt
│   │   └── prod.txt
│   ├── config/                # Django project config
│   ├── core/                  # Shared utilities
│   ├── ares/                  # ARES data source app
│   ├── justice/               # Justice data source app
│   └── contacts/              # Contact form + newsletter app
├── nginx/
│   └── nginx.conf             # Reverse proxy config
├── docker-compose.yml         # Orchestrates all services
├── docker-compose.dev.yml     # Development overrides
└── .env                       # Shared environment variables
```

### Each Docker File Explained

#### `backend/Dockerfile`

```dockerfile
# --- Stage 1: Base image with system dependencies ---
# python:3.12-slim is ~150MB (vs python:3.12 at ~900MB)
FROM python:3.12-slim AS base

# PYTHONDONTWRITEBYTECODE: Don't create .pyc files (smaller image)
# PYTHONUNBUFFERED: Print output immediately (important for Docker logs)
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

# Install system packages needed by psycopg (PostgreSQL driver)
# and pdfplumber (for Justice PDF parsing)
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
        libpq-dev \
        gcc \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# --- Stage 2: Install Python dependencies (cached layer) ---
# This layer only rebuilds when requirements files change.
# Your code changes daily, but dependencies change rarely.
FROM base AS dependencies

COPY requirements/base.txt requirements/base.txt
COPY requirements/prod.txt requirements/prod.txt
RUN pip install --no-cache-dir -r requirements/prod.txt

# --- Stage 3: Final production image ---
FROM base AS production

# Create non-root user (security: never run as root in production)
RUN addgroup --system django && \
    adduser --system --ingroup django django

# Copy installed packages from the dependencies stage
COPY --from=dependencies /usr/local/lib/python3.12/site-packages \
     /usr/local/lib/python3.12/site-packages
COPY --from=dependencies /usr/local/bin /usr/local/bin

# Copy application code
COPY . .

# Collect static files (Django admin CSS/JS) at build time
RUN python manage.py collectstatic --noinput 2>/dev/null || true

USER django
EXPOSE 8000

# Health check: Docker restarts the container if this fails
HEALTHCHECK --interval=30s --timeout=10s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/api/health/')" || exit 1

CMD ["gunicorn", "config.wsgi:application", \
     "--bind", "0.0.0.0:8000", \
     "--workers", "3", \
     "--timeout", "120"]
```

**Why multi-stage builds?** Stage 2 installs gcc and compiles C extensions. Stage 3 copies only the compiled results. The final image doesn't include gcc, saving ~200MB.

**Why layer caching matters:** Docker caches each instruction. `COPY requirements/...` before `COPY .` means changing your Python code doesn't re-install all dependencies. This cuts build time from minutes to seconds.

#### `backend/.dockerignore`

```
__pycache__
*.pyc
.git
.env
.env.*
*.md
.vscode
.idea
venv
.venv
*.egg-info
.coverage
.pytest_cache
.mypy_cache
```

Without this, Docker sends your entire `.git` folder (potentially hundreds of MB) to the build context.

#### `docker-compose.yml` (main orchestration)

```yaml
# This file defines all services that make up the application.
# Run: docker compose up
# Stop: docker compose down
# Rebuild: docker compose up --build

services:
  # --- Django API Server ---
  django:
    build:
      context: ./backend
      dockerfile: Dockerfile
      target: production            # Use the production stage
    env_file:
      - ./backend/.env
    environment:
      - DJANGO_SETTINGS_MODULE=config.settings.production
    depends_on:
      db:
        condition: service_healthy  # Wait for PostgreSQL to be ready
      redis:
        condition: service_healthy  # Wait for Redis to be ready
    networks:
      - backend-net

  # --- PostgreSQL Database ---
  db:
    image: postgres:16-alpine       # Alpine = smaller image (~80MB)
    environment:
      POSTGRES_DB: gtdn
      POSTGRES_USER: gtdn_user
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:-changeme}
    volumes:
      - postgres_data:/var/lib/postgresql/data   # Named volume: data persists
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U gtdn_user -d gtdn"]
      interval: 5s
      timeout: 5s
      retries: 5
    networks:
      - backend-net

  # --- Redis Cache ---
  redis:
    image: redis:7-alpine
    command: >
      redis-server
      --appendonly yes
      --maxmemory 256mb
      --maxmemory-policy allkeys-lru
    # appendonly: persist data to disk (survives restarts)
    # maxmemory: cap at 256MB RAM
    # allkeys-lru: when full, evict least recently used keys
    volumes:
      - redis_data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 5s
      timeout: 3s
      retries: 5
    networks:
      - backend-net

  # --- Nginx Reverse Proxy ---
  nginx:
    image: nginx:alpine
    ports:
      - "80:80"                     # The only port exposed to the host
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/conf.d/default.conf:ro
    depends_on:
      - django
    networks:
      - backend-net

# Named volumes: Docker manages these directories. Data persists across restarts.
# Delete with: docker compose down -v
volumes:
  postgres_data:
  redis_data:

# Internal network: containers communicate by service name (e.g., django -> db:5432)
networks:
  backend-net:
    driver: bridge
```

#### `docker-compose.dev.yml` (development overrides)

```yaml
# Development overrides. Use both files together:
# docker compose -f docker-compose.yml -f docker-compose.dev.yml up

services:
  django:
    build:
      target: base                  # Skip production optimizations
    command: python manage.py runserver 0.0.0.0:8000
    volumes:
      - ./backend:/app              # Bind mount: edit code, see changes instantly
      - /app/__pycache__            # Don't sync pycache to host
    ports:
      - "8000:8000"                 # Expose Django directly (skip Nginx)
    environment:
      - DJANGO_SETTINGS_MODULE=config.settings.development
      - DJANGO_DEBUG=True

  db:
    ports:
      - "5432:5432"                 # Expose DB for tools like pgAdmin, DBeaver

  redis:
    ports:
      - "6379:6379"                 # Expose Redis for redis-cli debugging
```

**Bind mounts** (`./backend:/app`) map your local folder into the container. Edit a Python file, and Django's development server auto-reloads. This is like how `next dev` watches your source files.

#### `nginx/nginx.conf`

```nginx
# Nginx sits in front of Django. It handles:
# 1. Reverse proxying API requests to Django
# 2. Serving static files (Django admin CSS/JS)
# 3. Connection buffering (protects Django from slow clients)

upstream django {
    server django:8000;
}

server {
    listen 80;
    server_name _;

    # API requests -> Django
    location /api/ {
        proxy_pass http://django;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 120s;
    }

    # Django admin -> Django
    location /admin/ {
        proxy_pass http://django;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    # Static files (collected by Django's collectstatic)
    location /static/ {
        alias /var/www/static/;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }

    # Health check endpoint
    location /health/ {
        proxy_pass http://django/api/health/;
    }
}
```

### Daily Docker Commands

```bash
# Start everything (development)
docker compose -f docker-compose.yml -f docker-compose.dev.yml up

# Start in background
docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d

# View logs
docker compose logs -f django          # Follow Django logs
docker compose logs -f redis            # Follow Redis logs

# Run Django management commands
docker compose exec django python manage.py migrate
docker compose exec django python manage.py createsuperuser
docker compose exec django python manage.py shell

# Run tests
docker compose exec django pytest

# Rebuild after changing Dockerfile or requirements
docker compose up --build

# Stop everything
docker compose down

# Stop and delete all data (volumes)
docker compose down -v

# Connect to Redis CLI
docker compose exec redis redis-cli
```

---

## 3. Backend Structure

### Complete Project Structure with Two Data Sources

This example shows ARES (REST API integration) and Justice (PDF/CSV file parsing) -- two different data source patterns that follow the same architecture.

```
backend/
├── manage.py
├── Dockerfile
├── .dockerignore
├── .env
├── requirements/
│   ├── base.txt                # Shared dependencies
│   ├── dev.txt                 # -r base.txt + dev tools
│   └── prod.txt                # -r base.txt + production tools
│
├── config/                     # Project configuration (like next.config.ts)
│   ├── __init__.py
│   ├── settings/
│   │   ├── __init__.py
│   │   ├── base.py             # Shared settings
│   │   ├── development.py      # DEBUG=True, permissive CORS
│   │   └── production.py       # Security headers, strict CORS
│   ├── urls.py                 # Root URL routing
│   └── wsgi.py                 # WSGI entry point for Gunicorn
│
├── core/                       # Shared infrastructure (NOT a data source)
│   ├── __init__.py
│   ├── apps.py
│   ├── services/
│   │   ├── __init__.py
│   │   ├── turnstile.py        # Cloudflare Turnstile verification
│   │   └── cache.py            # Generic CacheService used by all apps
│   ├── exceptions.py           # Custom exception handler + exception classes
│   ├── mixins.py               # TurnstileVerificationMixin for views
│   ├── throttles.py            # Per-endpoint rate limits
│   └── views.py                # Health check endpoint
│
├── ares/                       # Data source: Czech Business Registry (REST API)
│   ├── __init__.py
│   ├── apps.py
│   ├── client.py               # HTTP client -> ares.gov.cz
│   ├── parser.py               # Czech -> English field mapping
│   ├── services.py             # AresService: validate -> cache -> client -> parse
│   ├── serializers.py          # Request/response serializers
│   ├── views.py                # AresSearchView, AresSubjectDetailView
│   ├── urls.py                 # /search/, /subjects/<ico>/
│   ├── constants.py            # Base URL, TTLs, region/district codes
│   ├── models.py               # EconomicSubject (for future persistence)
│   └── tests/
│       ├── __init__.py
│       ├── test_client.py
│       ├── test_parser.py
│       ├── test_services.py
│       └── test_views.py
│
├── justice/                    # Data source: Court Registry (PDF/CSV parsing)
│   ├── __init__.py
│   ├── apps.py
│   ├── client.py               # Downloads PDFs/CSVs from or.justice.cz
│   ├── parsers/                # Multiple parser types for different file formats
│   │   ├── __init__.py
│   │   ├── pdf_parser.py       # pdfplumber-based PDF text + table extraction
│   │   └── csv_parser.py       # Streaming CSV parser for open data
│   ├── services.py             # JusticeService: download -> parse -> cache
│   ├── serializers.py          # Request/response serializers
│   ├── views.py                # JusticeSearchView, JusticeDocumentView
│   ├── urls.py                 # /search/, /documents/<ico>/
│   ├── constants.py            # Base URLs, TTLs, court codes
│   ├── models.py               # CourtRecord (for future persistence)
│   └── tests/
│       ├── __init__.py
│       ├── test_parsers.py
│       ├── test_services.py
│       └── fixtures/           # Sample PDFs/CSVs for tests
│           ├── sample_filing.pdf
│           └── sample_companies.csv
│
└── contacts/                   # Contact form + newsletter
    ├── __init__.py
    ├── apps.py
    ├── models.py               # ContactSubmission, NewsletterSubscriber
    ├── serializers.py          # Form validation serializers
    ├── services.py             # Email sending logic
    ├── views.py                # ContactFormView, NewsletterView
    ├── urls.py                 # /contact-form/, /newsletter/
    ├── admin.py                # Django Admin for viewing submissions
    └── tests/
        ├── __init__.py
        └── test_views.py
```

### File-by-File Explanation with Examples

#### `config/settings/base.py` -- Project Configuration

This is the Django equivalent of `next.config.ts` + `.env`. It configures everything.

```python
"""
Base settings shared across all environments.
Like your next.config.ts but for the whole backend.
"""
import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent.parent


def env(key, default=None):
    """Read environment variable. Like process.env in Node."""
    return os.environ.get(key, default)


SECRET_KEY = env("DJANGO_SECRET_KEY", "change-me-in-production")

INSTALLED_APPS = [
    # Django built-ins
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    # Third-party (like npm packages)
    "rest_framework",
    "corsheaders",
    # Your apps (like your src/lib/ domains)
    "core",
    "ares",
    "justice",
    "contacts",
]

MIDDLEWARE = [
    "corsheaders.middleware.CorsMiddleware",   # MUST be first
    "django.middleware.security.SecurityMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "config.urls"

# DRF configuration (like setting up axios defaults)
REST_FRAMEWORK = {
    "DEFAULT_RENDERER_CLASSES": ["rest_framework.renderers.JSONRenderer"],
    "DEFAULT_PARSER_CLASSES": ["rest_framework.parsers.JSONParser"],
    "EXCEPTION_HANDLER": "core.exceptions.custom_exception_handler",
    "DEFAULT_THROTTLE_CLASSES": [],
    "DEFAULT_PERMISSION_CLASSES": ["rest_framework.permissions.AllowAny"],
}

# Database
DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.postgresql",
        "NAME": env("DB_NAME", "gtdn"),
        "USER": env("DB_USER", "gtdn_user"),
        "PASSWORD": env("DB_PASSWORD", ""),
        "HOST": env("DB_HOST", "db"),        # 'db' = Docker service name
        "PORT": env("DB_PORT", "5432"),
    }
}

# Cache (Redis)
CACHES = {
    "default": {
        "BACKEND": "django_redis.cache.RedisCache",
        "LOCATION": env("REDIS_URL", "redis://redis:6379/0"),
        "OPTIONS": {
            "CLIENT_CLASS": "django_redis.client.DefaultClient",
            "SERIALIZER": "django_redis.serializers.json.JSONSerializer",
        },
        "KEY_PREFIX": "gtdn",
        "TIMEOUT": 300,  # Default: 5 minutes
    }
}

# Email (same env vars as your current .env.example)
EMAIL_HOST = env("MAIL_HOST", "127.0.0.1")
EMAIL_PORT = int(env("MAIL_PORT", "587"))
EMAIL_USE_SSL = env("MAIL_PORT") == "465"
EMAIL_USE_TLS = env("MAIL_PORT") == "587"
EMAIL_HOST_USER = env("MAIL_USERNAME", "")
EMAIL_HOST_PASSWORD = env("MAIL_PASSWORD", "")
DEFAULT_FROM_EMAIL = f'{env("MAIL_FROM_NAME", "GTDN")} <{env("MAIL_FROM_ADDRESS", "")}>'

# Custom settings
FORM_RECIPIENT_EMAIL = env("FORM_RECIPIENT_EMAIL", "")
TURNSTILE_SECRET_KEY = env("TURNSTILE_SECRET_KEY", "")
```

#### `config/urls.py` -- Root URL Routing

```python
"""
Root URL config. Like your app/ directory structure in Next.js,
but explicit rather than file-system based.
"""
from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/health/", include("core.urls")),
    path("api/v1/ares/", include("ares.urls")),
    path("api/v1/justice/", include("justice.urls")),
    path("api/v1/contacts/", include("contacts.urls")),
    # Adding a new data source = one line:
    # path("api/v1/eu-vat/", include("eu_vat.urls")),
]
```

#### `core/services/cache.py` -- Shared Cache Service

```python
"""
Generic cache service used by all data source apps.
Wraps Django's cache framework with namespacing and hashing.

Usage:
    cache = CacheService(prefix="ares", default_ttl=900)
    cache.get("detail", "12345678")
    cache.set(result, "detail", "12345678", ttl=3600)
"""
import hashlib
import json

from django.core.cache import cache


class CacheService:
    def __init__(self, prefix: str, default_ttl: int = 900):
        self.prefix = prefix
        self.default_ttl = default_ttl

    def _make_key(self, *parts: str) -> str:
        """Namespaced cache key: 'ares:detail:12345678'."""
        return f"{self.prefix}:{':'.join(parts)}"

    def hash_params(self, params: dict) -> str:
        """Deterministic hash for search params."""
        serialized = json.dumps(params, sort_keys=True, default=str)
        return hashlib.sha256(serialized.encode()).hexdigest()[:16]

    def get(self, *key_parts: str):
        return cache.get(self._make_key(*key_parts))

    def set(self, value, *key_parts: str, ttl: int | None = None):
        cache.set(self._make_key(*key_parts), value, ttl or self.default_ttl)
```

#### `core/exceptions.py` -- Custom Error Handler

```python
"""
Standardized error responses across the entire API.
Every error follows the same shape so the frontend can handle them consistently.

Frontend sees:
  { "error": "Human-readable message" }
  or
  { "error": "Validation failed.", "details": { "ico": ["This field is required."] } }
"""
from rest_framework.views import exception_handler
from rest_framework.response import Response
from rest_framework import status


class ExternalAPIError(Exception):
    """Raised when an external API (ARES, Justice) fails."""
    def __init__(self, message: str, status_code: int | None = None, service_name: str = "external"):
        self.message = message
        self.status_code = status_code
        self.service_name = service_name
        super().__init__(message)


def custom_exception_handler(exc, context):
    """DRF calls this for every unhandled exception in views."""
    # Let DRF handle its built-in exceptions first (404, 403, validation errors)
    response = exception_handler(exc, context)

    if isinstance(exc, ExternalAPIError):
        return Response(
            {"error": exc.message, "service": exc.service_name},
            status=exc.status_code or status.HTTP_502_BAD_GATEWAY,
        )

    return response
```

#### `core/mixins.py` -- Turnstile Verification Mixin

```python
"""
Mixin for views that require Cloudflare Turnstile CAPTCHA verification.
Used by contact form and newsletter endpoints.

Usage:
    class ContactFormView(TurnstileVerificationMixin, APIView):
        def post(self, request):
            self.verify_turnstile(request)  # Raises ValidationError if invalid
            ...
"""
from rest_framework.exceptions import ValidationError
from core.services.turnstile import verify_turnstile_token


class TurnstileVerificationMixin:
    def verify_turnstile(self, request):
        token = request.data.get("turnstileToken")
        if not token:
            raise ValidationError({"turnstileToken": "Turnstile verification is required."})

        client_ip = (
            request.META.get("HTTP_CF_CONNECTING_IP")
            or request.META.get("HTTP_X_FORWARDED_FOR", "").split(",")[0].strip()
            or request.META.get("HTTP_X_REAL_IP")
            or request.META.get("REMOTE_ADDR")
        )
        result = verify_turnstile_token(token, client_ip)
        if not result["success"]:
            raise ValidationError({"turnstileToken": result.get("error", "Verification failed.")})
```

### Example 1: ARES App (REST API Data Source)

#### `ares/client.py`

```python
"""
HTTP client for the ARES government API.
Sends raw Czech-format requests, receives raw Czech-format responses.
Does NOT parse or transform data -- that's the parser's job.

Equivalent to: the axios instance + HTTP calls in src/lib/ares/ares.endpoints.ts
"""
import requests
from core.exceptions import ExternalAPIError
from .constants import ARES_BASE_URL, ARES_REQUEST_TIMEOUT


class AresClient:
    def __init__(self):
        self.base_url = ARES_BASE_URL
        self.session = requests.Session()
        self.session.headers.update({
            "Content-Type": "application/json",
            "Accept": "application/json",
        })

    def search(self, request_body: dict) -> dict:
        """POST /vyhledat -- raw dict in Czech API format."""
        try:
            resp = self.session.post(
                f"{self.base_url}/vyhledat",
                json=request_body,
                timeout=ARES_REQUEST_TIMEOUT,
            )
            resp.raise_for_status()
            return resp.json()
        except requests.HTTPError as e:
            raise self._map_error(e)
        except requests.RequestException:
            raise ExternalAPIError("Unable to connect to ARES service", service_name="ares")

    def get_by_ico(self, ico: str) -> dict:
        """GET /{ico} -- returns raw dict in Czech API format."""
        try:
            resp = self.session.get(
                f"{self.base_url}/{ico}",
                timeout=ARES_REQUEST_TIMEOUT,
            )
            resp.raise_for_status()
            return resp.json()
        except requests.HTTPError as e:
            raise self._map_error(e)
        except requests.RequestException:
            raise ExternalAPIError("Unable to connect to ARES service", service_name="ares")

    def _map_error(self, error: requests.HTTPError) -> ExternalAPIError:
        """Map HTTP status codes to user-friendly error messages."""
        code = error.response.status_code if error.response else None
        messages = {
            400: "Invalid request parameters",
            404: "Economic subject not found",
            429: "Too many requests. Please try again later.",
        }
        return ExternalAPIError(
            messages.get(code, "ARES service is temporarily unavailable"),
            status_code=code,
            service_name="ares",
        )
```

#### `ares/parser.py`

```python
"""
Transforms Czech ARES API responses to English entity format.
This is a direct port of src/lib/ares/ares.parser.ts.

Every function is PURE -- no I/O, no side effects, no database calls.
Input: raw Czech dict from ARES API.
Output: English dict matching the TypeScript entity types.
"""


def parse_headquarters(sidlo: dict | None) -> dict | None:
    """Transform Czech address fields to English."""
    if not sidlo:
        return None
    return {
        "countryCode": sidlo.get("kodStatu"),
        "countryName": sidlo.get("nazevStatu"),
        "regionCode": sidlo.get("kodKraje"),
        "regionName": sidlo.get("nazevKraje"),
        "districtCode": sidlo.get("kodOkresu"),
        "districtName": sidlo.get("nazevOkresu"),
        "municipalityCode": sidlo.get("kodObce"),
        "municipalityName": sidlo.get("nazevObce"),
        "streetName": sidlo.get("nazevUlice"),
        "buildingNumber": sidlo.get("cisloDomovni"),
        "postalCode": sidlo.get("psc"),
        "textAddress": sidlo.get("textovaAdresa"),
        # ... all remaining fields from AresHeadquarters interface
    }


def parse_registration_statuses(seznam: dict | None) -> dict | None:
    if not seznam:
        return None
    return {
        "rosStatus": seznam.get("stavZdrojeRos"),
        "businessRegisterStatus": seznam.get("stavZdrojeVr"),
        "resStatus": seznam.get("stavZdrojeRes"),
        "tradeRegisterStatus": seznam.get("stavZdrojeRzp"),
        "vatStatus": seznam.get("stavZdrojeDph"),
        # ... all 16 status fields
    }


def parse_economic_subject(subject: dict) -> dict:
    """Parse a single economic subject to match AresEconomicSubject type."""
    record = {
        "ico": subject["ico"],
        "businessName": subject["obchodniJmeno"],
        "headquarters": parse_headquarters(subject.get("sidlo")),
        "legalForm": subject.get("pravniForma"),
        "foundationDate": subject.get("datumVzniku"),
        "terminationDate": subject.get("datumZaniku"),
        "vatId": subject.get("dic"),
        "naceActivities": subject.get("czNace"),
        "registrationStatuses": parse_registration_statuses(subject.get("seznamRegistraci")),
        "isPrimaryRecord": True,
    }
    return {"icoId": subject.get("icoId") or subject["ico"], "records": [record]}


def parse_search_result(response: dict) -> dict:
    return {
        "totalCount": response["pocetCelkem"],
        "economicSubjects": [
            parse_economic_subject(s) for s in response.get("ekonomickeSubjekty", [])
        ],
    }


def to_search_request(params: dict) -> dict:
    """Convert English search params to Czech API request body."""
    body = {}
    if params.get("start") is not None:
        body["start"] = params["start"]
    if params.get("count") is not None:
        body["pocet"] = params["count"]
    if params.get("ico"):
        body["ico"] = params["ico"]
    if params.get("businessName"):
        body["obchodniJmeno"] = params["businessName"]
    if params.get("legalForm"):
        body["pravniForma"] = params["legalForm"]
    if params.get("location"):
        loc = params["location"]
        sidlo = {}
        if loc.get("regionCode") is not None:
            sidlo["kodKraje"] = loc["regionCode"]
        if loc.get("districtCode") is not None:
            sidlo["kodOkresu"] = loc["districtCode"]
        if sidlo:
            body["sidlo"] = sidlo
    return body
```

#### `ares/services.py`

```python
"""
ARES business logic + caching layer.
This is the BRAIN of the ARES app. Views call this, never the client directly.

Pattern: validate -> check cache -> call client -> parse -> cache -> return

Equivalent to: what useAresSearchMutation onSuccess does, but server-side.
"""
import re
from core.services.cache import CacheService
from core.exceptions import ExternalAPIError
from .client import AresClient
from .parser import parse_search_result, parse_economic_subject, to_search_request
from .constants import ARES_DETAIL_CACHE_TTL, ARES_SEARCH_CACHE_TTL


class AresService:
    def __init__(self, client: AresClient | None = None):
        self.client = client or AresClient()
        self.cache = CacheService(prefix="ares", default_ttl=ARES_SEARCH_CACHE_TTL)

    def search(self, params: dict) -> dict:
        """Search for economic subjects."""
        request_body = to_search_request(params)
        cache_hash = self.cache.hash_params(request_body)

        # Check cache
        cached = self.cache.get("search", cache_hash)
        if cached is not None:
            return cached

        # Fetch from ARES
        raw = self.client.search(request_body)
        result = parse_search_result(raw)

        # Cache search results
        self.cache.set(result, "search", cache_hash, ttl=ARES_SEARCH_CACHE_TTL)

        # Also cache each individual subject (same pattern as your React Query onSuccess)
        for subject in result.get("economicSubjects", []):
            ico_id = subject.get("icoId")
            if ico_id:
                self.cache.set(subject, "detail", ico_id, ttl=ARES_DETAIL_CACHE_TTL)

        return result

    def get_by_ico(self, ico: str) -> dict:
        """Get economic subject by ICO."""
        normalized = ico.zfill(8)
        if not re.match(r"^\d{8}$", normalized):
            raise ExternalAPIError("ICO must be 8 digits.", status_code=400, service_name="ares")

        cached = self.cache.get("detail", normalized)
        if cached is not None:
            return cached

        raw = self.client.get_by_ico(normalized)
        result = parse_economic_subject(raw)

        self.cache.set(result, "detail", normalized, ttl=ARES_DETAIL_CACHE_TTL)
        return result
```

#### `ares/serializers.py`

```python
"""
DRF serializers define the API contract.
Input serializers = Zod schemas (validate incoming data).
Output serializers = TypeScript types (shape outgoing data).

These match the existing TypeScript interfaces EXACTLY so the frontend
can consume this API with zero changes to its type definitions.
"""
from rest_framework import serializers


# --- Input serializers (request validation) ---

class SearchLocationSerializer(serializers.Serializer):
    municipalityCode = serializers.IntegerField(required=False)
    regionCode = serializers.IntegerField(required=False)
    districtCode = serializers.IntegerField(required=False)


class SearchRequestSerializer(serializers.Serializer):
    start = serializers.IntegerField(required=False, min_value=0)
    count = serializers.IntegerField(required=False, min_value=1, max_value=100)
    ico = serializers.ListField(child=serializers.CharField(), required=False)
    businessName = serializers.CharField(required=False, allow_blank=True)
    legalForm = serializers.ListField(child=serializers.CharField(), required=False)
    location = SearchLocationSerializer(required=False)


# --- Output serializers (response shape) ---
# These match AresBusinessRecord, AresEconomicSubject, AresSearchResult

class BusinessRecordSerializer(serializers.Serializer):
    ico = serializers.CharField()
    businessName = serializers.CharField()
    headquarters = serializers.DictField(required=False, allow_null=True)
    legalForm = serializers.CharField(required=False, allow_null=True)
    foundationDate = serializers.CharField(required=False, allow_null=True)
    terminationDate = serializers.CharField(required=False, allow_null=True)
    vatId = serializers.CharField(required=False, allow_null=True)
    naceActivities = serializers.ListField(child=serializers.CharField(), required=False)
    registrationStatuses = serializers.DictField(required=False, allow_null=True)
    isPrimaryRecord = serializers.BooleanField(required=False)


class EconomicSubjectSerializer(serializers.Serializer):
    icoId = serializers.CharField()
    records = BusinessRecordSerializer(many=True)


class SearchResultSerializer(serializers.Serializer):
    totalCount = serializers.IntegerField()
    economicSubjects = EconomicSubjectSerializer(many=True)
```

#### `ares/views.py`

```python
"""
Thin HTTP layer. Views do three things:
1. Validate input (via serializer)
2. Call service (business logic)
3. Serialize output (via serializer)

If your view is longer than 15 lines, extract logic into the service.
"""
from rest_framework.views import APIView
from rest_framework.response import Response
from .services import AresService
from .serializers import SearchRequestSerializer, SearchResultSerializer, EconomicSubjectSerializer


class AresSearchView(APIView):
    def post(self, request):
        serializer = SearchRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        service = AresService()
        result = service.search(serializer.validated_data)

        return Response(SearchResultSerializer(result).data)


class AresSubjectDetailView(APIView):
    def get(self, request, ico):
        service = AresService()
        result = service.get_by_ico(ico)

        return Response(EconomicSubjectSerializer(result).data)
```

#### `ares/urls.py`

```python
from django.urls import path
from . import views

app_name = "ares"

urlpatterns = [
    path("search/", views.AresSearchView.as_view(), name="search"),
    path("subjects/<str:ico>/", views.AresSubjectDetailView.as_view(), name="subject-detail"),
]
```

### Example 2: Justice App (PDF/CSV File Parsing Data Source)

The Justice app shows a different data source pattern -- instead of calling a REST API, it downloads and parses PDF/CSV files. The service layer structure is identical.

#### `justice/client.py`

```python
"""
HTTP client for downloading data from Czech Justice Registry.
Two sources:
  1. dataor.justice.cz -- open data CSV/XML exports (structured)
  2. or.justice.cz -- PDF documents (Sbirka listin / document collection)
"""
import requests
from core.exceptions import ExternalAPIError
from .constants import JUSTICE_BASE_URL, JUSTICE_OPENDATA_URL, REQUEST_TIMEOUT


class JusticeClient:
    def __init__(self):
        self.session = requests.Session()
        self.session.headers.update({"User-Agent": "GTDN-Backend/1.0"})

    def download_csv(self, dataset_url: str) -> bytes:
        """Download a CSV dataset from the open data portal."""
        try:
            resp = self.session.get(dataset_url, timeout=REQUEST_TIMEOUT, stream=True)
            resp.raise_for_status()
            return resp.content
        except requests.RequestException:
            raise ExternalAPIError("Justice open data unavailable", service_name="justice")

    def download_document(self, document_id: str) -> tuple[bytes, str]:
        """Download a PDF from the Sbirka listin. Returns (bytes, source_url)."""
        url = f"{JUSTICE_BASE_URL}/ias/content/download?id={document_id}"
        try:
            resp = self.session.get(url, timeout=REQUEST_TIMEOUT)
            resp.raise_for_status()
            content_type = resp.headers.get("content-type", "")
            if "pdf" not in content_type.lower():
                raise ExternalAPIError(f"Expected PDF, got: {content_type}", service_name="justice")
            return resp.content, url
        except requests.RequestException:
            raise ExternalAPIError("Justice document download failed", service_name="justice")
```

#### `justice/parsers/pdf_parser.py`

```python
"""
PDF parsing for Czech Justice Registry documents.
Uses pdfplumber (pure Python, no Java/Ghostscript needed in Docker).

Handles:
  - Financial filings (Rozvaha / Balance Sheet, Vykaz zisku / P&L)
  - Annual reports
  - Founding documents

Czech characters (hacky/carky) are handled natively by pdfplumber.
"""
import pdfplumber
from io import BytesIO


class PDFParser:
    MAX_PAGES = 100  # Safety limit

    def extract_text(self, pdf_bytes: bytes) -> str:
        """Extract all text from a PDF."""
        with pdfplumber.open(BytesIO(pdf_bytes)) as pdf:
            pages = []
            for page in pdf.pages[:self.MAX_PAGES]:
                text = page.extract_text()
                if text:
                    pages.append(text)
            return "\n\n".join(pages)

    def extract_tables(self, pdf_bytes: bytes) -> list[list[list[str]]]:
        """
        Extract tables from a PDF.
        Returns: list of tables, each table is list of rows, each row is list of cells.
        """
        all_tables = []
        with pdfplumber.open(BytesIO(pdf_bytes)) as pdf:
            for page in pdf.pages[:self.MAX_PAGES]:
                tables = page.extract_tables(table_settings={
                    "vertical_strategy": "lines",
                    "horizontal_strategy": "lines",
                    "snap_tolerance": 5,
                })
                for table in tables:
                    cleaned = [
                        [cell or "" for cell in row]
                        for row in table
                        if any(cell for cell in row)
                    ]
                    if cleaned:
                        all_tables.append(cleaned)
        return all_tables

    def detect_document_type(self, text: str) -> str:
        """Detect Czech financial document type from text content."""
        text_upper = text[:2000].upper()
        if "ROZVAHA" in text_upper:
            return "balance_sheet"
        if "VÝKAZ ZISKU" in text_upper or "VYKAZ ZISKU" in text_upper:
            return "profit_loss"
        if "PŘÍLOHA" in text_upper or "PRILOH" in text_upper:
            return "notes"
        return "unknown"
```

#### `justice/parsers/csv_parser.py`

```python
"""
CSV parsing for Czech Justice open data exports from dataor.justice.cz.
Streams rows one at a time for memory efficiency (these files can be large).

Handles Czech encodings: UTF-8 (modern files) and cp1250 (legacy Windows files).
"""
import csv
import io
from typing import Generator


class JusticeCSVParser:
    # Map Czech CSV headers to English field names
    COLUMN_MAP = {
        "ico": "ico",
        "nazev": "name",
        "pravni_forma": "legal_form",
        "sidlo": "address",
        "rejstrikovy_soud": "registry_court",
        "spisova_znacka": "file_number",
        "datum_zapisu": "registration_date",
    }

    def parse_stream(self, raw_bytes: bytes) -> Generator[dict, None, None]:
        """
        Parse CSV and yield one record at a time.
        Memory-efficient: never loads the whole file.
        """
        text = self._decode(raw_bytes)
        reader = csv.DictReader(io.StringIO(text))

        for row in reader:
            yield {
                english: (row.get(czech) or "").strip()
                for czech, english in self.COLUMN_MAP.items()
            }

    def parse_all(self, raw_bytes: bytes) -> list[dict]:
        """Parse entire CSV into a list. For smaller files."""
        return list(self.parse_stream(raw_bytes))

    def _decode(self, raw_bytes: bytes) -> str:
        """Try UTF-8 first, fall back to cp1250 (Czech Windows encoding)."""
        try:
            return raw_bytes.decode("utf-8")
        except UnicodeDecodeError:
            return raw_bytes.decode("cp1250")
```

#### `justice/services.py`

```python
"""
Justice business logic + caching layer.
Same pattern as AresService but for a file-parsing data source.
"""
from core.services.cache import CacheService
from .client import JusticeClient
from .parsers.pdf_parser import PDFParser
from .parsers.csv_parser import JusticeCSVParser
from .constants import DOCUMENT_CACHE_TTL, SEARCH_CACHE_TTL

MAX_PDF_SIZE_MB = 50


class JusticeService:
    def __init__(self):
        self.client = JusticeClient()
        self.pdf_parser = PDFParser()
        self.csv_parser = JusticeCSVParser()
        self.cache = CacheService(prefix="justice", default_ttl=SEARCH_CACHE_TTL)

    def get_document(self, ico: str, document_id: str) -> dict:
        """Download, parse, and cache a PDF document."""
        cached = self.cache.get("doc", ico, document_id)
        if cached is not None:
            return cached

        # Download PDF
        pdf_bytes, source_url = self.client.download_document(document_id)

        # Validate size
        size_mb = len(pdf_bytes) / (1024 * 1024)
        if size_mb > MAX_PDF_SIZE_MB:
            raise ValueError(f"PDF too large: {size_mb:.1f}MB (max {MAX_PDF_SIZE_MB}MB)")

        # Parse
        text = self.pdf_parser.extract_text(pdf_bytes)
        tables = self.pdf_parser.extract_tables(pdf_bytes)
        doc_type = self.pdf_parser.detect_document_type(text)

        result = {
            "ico": ico,
            "documentId": document_id,
            "documentType": doc_type,
            "textContent": text[:10000],  # Truncate for API response
            "tables": tables,
            "tableCount": len(tables),
            "sourceUrl": source_url,
        }

        self.cache.set(result, "doc", ico, document_id, ttl=DOCUMENT_CACHE_TTL)
        return result

    def import_companies_csv(self, dataset_url: str) -> list[dict]:
        """Download and parse a company CSV from open data portal."""
        cached = self.cache.get("csv", self.cache.hash_params({"url": dataset_url}))
        if cached is not None:
            return cached

        csv_bytes = self.client.download_csv(dataset_url)
        records = self.csv_parser.parse_all(csv_bytes)

        self.cache.set(records, "csv", self.cache.hash_params({"url": dataset_url}), ttl=43200)
        return records
```

### Contacts App (Quick Overview)

The contacts app follows a simpler pattern -- no external API, no cache. It validates input, persists to DB, and sends email.

```python
# contacts/views.py
class ContactFormView(TurnstileVerificationMixin, APIView):
    def post(self, request):
        self.verify_turnstile(request)
        serializer = ContactFormSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        service = ContactService()
        service.submit(serializer.validated_data, client_ip=self._get_client_ip(request))
        return Response({"message": "Message sent successfully!"})

# contacts/models.py
class ContactSubmission(models.Model):
    name = models.CharField(max_length=50)
    surname = models.CharField(max_length=50)
    email = models.EmailField()
    phone = models.CharField(max_length=20)
    message = models.TextField(max_length=1000)
    gdpr_consent = models.BooleanField(default=False)
    client_ip = models.GenericIPAddressField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

class NewsletterSubscriber(models.Model):
    email = models.EmailField(unique=True)
    is_active = models.BooleanField(default=True)
    subscribed_at = models.DateTimeField(auto_now_add=True)
```

### API Endpoints Summary

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/ares/search/` | Search companies |
| GET | `/api/v1/ares/subjects/{ico}/` | Company detail |
| GET | `/api/v1/justice/search/?query=...` | Search court registry |
| GET | `/api/v1/justice/documents/?ico=...&document_id=...` | Get parsed PDF |
| POST | `/api/v1/contacts/contact-form/` | Submit contact form |
| POST | `/api/v1/contacts/newsletter/` | Newsletter subscribe |

---

## 4. Redis

### What Redis Is

Redis is a **shared in-memory key-value store**. Think of it as a giant JavaScript `Map()` that:
- Lives on a server (not in a browser)
- Is shared across all users and all Django worker processes
- Supports TTL (Time To Live) -- keys auto-delete after expiration
- Is extremely fast (~0.1ms reads vs ~5ms for PostgreSQL)
- Persists to disk so data survives restarts

### Why Redis Instead of React Query

Your current caching is React Query -- client-side, per-browser. Here's what Redis gives you:

| | React Query (current) | Redis (backend) |
|---|---|---|
| **Shared across users** | No -- each browser has its own cache | Yes -- one cache for everyone |
| **ARES rate limit** | Each user burns requests independently | One fetch serves all users |
| **Cache survives page refresh** | No | Yes |
| **Popular companies** | Fetched thousands of times/day | Fetched once per TTL |
| **ARES downtime** | App breaks | Stale cache still serves |
| **Cost** | Free | Free (open source, ~5MB RAM usage) |

### How It Works in Our Architecture

```
User A searches "Praha"
  -> Django -> Redis MISS -> ARES API -> parse -> store in Redis -> respond

User B searches "Praha" (30 seconds later)
  -> Django -> Redis HIT -> respond instantly (no ARES call)

User C searches "Praha" (16 minutes later, cache expired)
  -> Django -> Redis MISS -> ARES API -> parse -> store in Redis -> respond
```

### Configuration

In `config/settings/base.py`:

```python
CACHES = {
    "default": {
        "BACKEND": "django_redis.cache.RedisCache",
        "LOCATION": env("REDIS_URL", "redis://redis:6379/0"),
        "OPTIONS": {
            "CLIENT_CLASS": "django_redis.client.DefaultClient",
            # Store as JSON (readable in redis-cli, debuggable)
            "SERIALIZER": "django_redis.serializers.json.JSONSerializer",
        },
        "KEY_PREFIX": "gtdn",    # All keys prefixed: "gtdn:ares:detail:12345678"
        "TIMEOUT": 300,          # Default TTL: 5 minutes
    }
}
```

### Cache Key Convention

```
gtdn:{app}:{operation}:{identifier}

Examples:
  gtdn:ares:detail:12345678          # Company detail by ICO
  gtdn:ares:search:a1b2c3d4          # Search results (hashed params)
  gtdn:justice:doc:12345678:abc123   # Parsed PDF document
  gtdn:justice:csv:e5f6g7h8          # Parsed CSV dataset
```

### TTLs Per Data Source

| Data | TTL | Why |
|------|-----|-----|
| ARES company detail | 1 hour | Company data changes rarely |
| ARES search results | 15 minutes | New companies can register |
| Justice PDF documents | 24 hours | Filed documents never change |
| Justice CSV data | 12 hours | Open data updates daily |
| Contact submissions | Not cached | Always persisted to DB |

### The CacheService Class

See `core/services/cache.py` above. Every data source app uses it:

```python
# In AresService:
self.cache = CacheService(prefix="ares", default_ttl=900)
self.cache.get("detail", "12345678")
self.cache.set(result, "detail", "12345678", ttl=3600)

# In JusticeService:
self.cache = CacheService(prefix="justice", default_ttl=900)
self.cache.get("doc", ico, document_id)
self.cache.set(result, "doc", ico, document_id, ttl=86400)
```

### Search-to-Detail Cache Seeding

When a search returns 10 companies, each one is also cached under its detail key:

```python
# In AresService.search():
for subject in result["economicSubjects"]:
    self.cache.set(subject, "detail", subject["icoId"], ttl=3600)
```

This mirrors what your current React Query `onSuccess` does in `ares.mutations.ts` (line 23-25). The result: clicking a company after searching is always instant.

### Debugging Redis

```bash
# Connect to Redis CLI inside Docker
docker compose exec redis redis-cli

# List all keys
KEYS gtdn:*

# Get a specific cached value
GET gtdn:ares:detail:12345678

# Check TTL remaining on a key
TTL gtdn:ares:detail:12345678

# Delete a specific cache entry
DEL gtdn:ares:detail:12345678

# Flush all cache (careful!)
FLUSHDB

# Monitor all commands in real-time
MONITOR
```

---

## 5. PostgreSQL

### Django ORM for Prisma/Drizzle Developers

If you know Prisma or Drizzle, you already understand the Django ORM. Different syntax, same concepts.

```python
# --- Define a model (like a Prisma schema) ---

class ContactSubmission(models.Model):
    name = models.CharField(max_length=50)       # String @db.VarChar(50)
    surname = models.CharField(max_length=50)
    email = models.EmailField()                   # String (with email validation)
    phone = models.CharField(max_length=20)
    message = models.TextField(max_length=1000)   # String @db.Text
    gdpr_consent = models.BooleanField()          # Boolean
    client_ip = models.GenericIPAddressField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)  # DateTime @default(now())

    class Meta:
        ordering = ["-created_at"]                # Default sort: newest first
        db_table = "contact_submissions"          # Explicit table name
```

### Query Comparison

```python
# FIND MANY
# Prisma:  prisma.contact.findMany({ where: { email: { contains: "gmail" } }, take: 10 })
# Django:
contacts = ContactSubmission.objects.filter(email__icontains="gmail")[:10]

# FIND UNIQUE
# Prisma:  prisma.subscriber.findUnique({ where: { email: "x@y.com" } })
subscriber = NewsletterSubscriber.objects.get(email="x@y.com")

# CREATE
submission = ContactSubmission.objects.create(
    name="Jan", surname="Novak", email="jan@example.com",
    phone="+420123456789", message="Hello", gdpr_consent=True,
)

# UPSERT
subscriber, created = NewsletterSubscriber.objects.update_or_create(
    email="jan@example.com",
    defaults={"is_active": True},
)
# created = True if new record, False if updated existing

# COUNT
total = ContactSubmission.objects.count()

# COMPLEX FILTER (OR condition)
from django.db.models import Q
results = ContactSubmission.objects.filter(
    Q(name__icontains="jan") | Q(email__icontains="jan")
)
```

### Migrations Workflow

When you change a model, Django generates a migration file (like Prisma `migrate dev`):

```bash
# After changing models.py:
docker compose exec django python manage.py makemigrations    # Generate migration
docker compose exec django python manage.py migrate           # Apply to database

# See what SQL a migration will run:
docker compose exec django python manage.py sqlmigrate contacts 0001
```

### Django Admin (Free Back-Office)

By registering models in `admin.py`, you get a full admin panel at `/admin/`:

```python
# contacts/admin.py
from django.contrib import admin
from .models import ContactSubmission, NewsletterSubscriber


@admin.register(ContactSubmission)
class ContactSubmissionAdmin(admin.ModelAdmin):
    list_display = ("name", "surname", "email", "created_at")
    list_filter = ("created_at",)
    search_fields = ("name", "surname", "email")
    readonly_fields = ("created_at",)


@admin.register(NewsletterSubscriber)
class NewsletterSubscriberAdmin(admin.ModelAdmin):
    list_display = ("email", "is_active", "subscribed_at")
    list_filter = ("is_active",)
    search_fields = ("email",)
```

No extra code needed. Visit `http://localhost:8000/admin/` and you can view, search, filter, and edit all your data.

### When to Use JSONField vs Normalized Tables

**Use JSONField** for raw API responses (audit trail), flexible metadata, data you never filter/query on:

```python
class EconomicSubject(models.Model):
    ico = models.CharField(max_length=8, unique=True, db_index=True)
    business_name = models.CharField(max_length=500)
    raw_data = models.JSONField(default=dict)  # Full ARES response for debugging
```

**Use separate columns** for anything you need to search, filter, or sort by:

```python
# BAD: Filtering JSON fields is slow and hard
Subject.objects.filter(raw_data__headquarters__regionCode=19)

# GOOD: Indexed column, fast query
Subject.objects.filter(region_code=19)
```

### Connection String in Docker

In Docker, services find each other by name. Django connects to `db:5432` (the service name from docker-compose.yml):

```python
DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.postgresql",
        "NAME": "gtdn",
        "USER": "gtdn_user",
        "PASSWORD": env("POSTGRES_PASSWORD"),
        "HOST": "db",          # Docker service name, NOT localhost
        "PORT": "5432",
    }
}
```

---

## 6. Django Best Practices

### Code Organization Rules

1. **Views are thin.** A view validates input, calls a service, serializes output. If your view is more than 15 lines, extract logic into `services.py`.

2. **Services contain business logic.** Validation, caching, external API calls, data transformation, email sending -- all in services. Services are easy to test because they don't depend on HTTP.

3. **Parsers are pure functions.** No I/O, no database, no cache. Input dict in, output dict out. Easy to test with static fixtures.

4. **Clients handle HTTP only.** The client talks to external APIs and maps HTTP errors to exceptions. It does NOT parse or transform the response.

5. **Serializers define the contract.** Input serializers validate request shape (like Zod). Output serializers define response shape (like TypeScript interfaces).

### What Good Django Code Looks Like

```python
# GOOD: Each layer has one job
class AresSearchView(APIView):
    """View: HTTP only. 5 lines."""
    def post(self, request):
        serializer = SearchRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        result = AresService().search(serializer.validated_data)
        return Response(SearchResultSerializer(result).data)


# BAD: View does everything
class AresSearchView(APIView):
    def post(self, request):
        params = request.data
        if not params.get("businessName") and not params.get("ico"):
            return Response({"error": "Need name or ICO"}, status=400)
        body = {"obchodniJmeno": params["businessName"], "pocet": 10}
        cache_key = f"ares:search:{hash(str(body))}"
        cached = cache.get(cache_key)
        if cached:
            return Response(cached)
        resp = requests.post("https://ares.gov.cz/...", json=body, timeout=15)
        data = resp.json()
        result = {"totalCount": data["pocetCelkem"], "subjects": [...]}
        cache.set(cache_key, result, 900)
        return Response(result)
        # This view is doing validation, caching, HTTP, parsing, and response shaping.
        # Impossible to test any single concern in isolation.
```

### Dependency Injection (Simple Python Style)

Django doesn't need a DI framework. Use default arguments:

```python
class AresService:
    def __init__(self, client: AresClient | None = None):
        self.client = client or AresClient()  # Default in production, injectable in tests

# Production: uses real client
service = AresService()

# Tests: inject a mock
mock_client = MagicMock()
mock_client.get_by_ico.return_value = {"ico": "12345678", "obchodniJmeno": "Test"}
service = AresService(client=mock_client)
```

### Error Handling

Map external errors to your own exceptions. Never let raw `requests.HTTPError` reach your views:

```python
# In client.py:
def _map_error(self, error):
    code = error.response.status_code
    messages = {404: "Not found", 429: "Rate limited"}
    raise ExternalAPIError(messages.get(code, "Service unavailable"), status_code=code)

# The custom_exception_handler in core/exceptions.py catches this
# and returns a consistent JSON error response to the frontend.
```

### Settings: Environment Variables

```python
# GOOD: All config from environment, with safe defaults for development
SECRET_KEY = env("DJANGO_SECRET_KEY", "dev-only-secret-key")
DATABASE_URL = env("DATABASE_URL", "postgres://gtdn_user:password@db:5432/gtdn")

# BAD: Hardcoded secrets
SECRET_KEY = "my-production-secret-key-hardcoded"
```

### Testing

```python
# Use pytest-django. Tests look like this:
import pytest
from unittest.mock import MagicMock
from ares.services import AresService


@pytest.mark.django_db
def test_search_returns_cached_result():
    """Cache HIT: second call should not hit ARES API."""
    mock_client = MagicMock()
    mock_client.search.return_value = {"pocetCelkem": 1, "ekonomickeSubjekty": []}

    service = AresService(client=mock_client)

    # First call: cache miss, calls ARES
    service.search({"businessName": "Test"})
    assert mock_client.search.call_count == 1

    # Second call: cache hit, does NOT call ARES
    service.search({"businessName": "Test"})
    assert mock_client.search.call_count == 1  # Still 1, not 2
```

---

## 7. Next.js Integration

### How This Backend Complements Next.js

Your Next.js app currently does everything -- UI rendering, API calls, data parsing, email sending. After migration:

| Concern | Before | After |
|---------|--------|-------|
| UI rendering | Next.js | Next.js (unchanged) |
| Data fetching | Browser -> ARES | Browser -> Django -> ARES |
| Data parsing | Browser (parser.ts) | Django (parser.py) |
| Caching | Per-browser (React Query) | Shared (Redis) |
| Email sending | Next.js API route | Django |
| Rate limiting | None | Django throttling |
| Form persistence | None | PostgreSQL |

### What Changes in the Frontend

#### `src/lib/ares/ares.endpoints.ts` (simplified)

```typescript
// BEFORE: calls ARES directly, parses Czech response client-side
import axios from "axios";
import { aresParser } from "./ares.parser";

const aresClient = axios.create({
  baseURL: "https://ares.gov.cz/ekonomicke-subjekty-v-be/rest/ekonomicke-subjekty",
});

export const aresEndpoints = {
  async search(params: AresSearchParams): Promise<AresSearchResult> {
    const requestBody = aresParser.toSearchRequest(params);
    const response = await aresClient.post<AresApiSearchResponse>("/vyhledat", requestBody);
    return aresParser.toSearchResult(response.data);
  },
};

// AFTER: calls Django, receives pre-parsed English JSON
import axios from "axios";

const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1",
  timeout: 15000,
  headers: { "Content-Type": "application/json" },
});

export const aresEndpoints = {
  async search(params: AresSearchParams): Promise<AresSearchResult> {
    const response = await apiClient.post<AresSearchResult>("/ares/search/", params);
    return response.data;  // Already parsed by Django
  },

  async getByIco(ico: string): Promise<AresEconomicSubject> {
    const normalized = ico.padStart(8, "0");
    const response = await apiClient.get<AresEconomicSubject>(`/ares/subjects/${normalized}/`);
    return response.data;  // Already parsed by Django
  },
};
```

**Key insight:** The Django API returns the **exact same JSON shape** as the TypeScript entity types. This means:
- `AresSearchResult`, `AresEconomicSubject`, `AresBusinessRecord` types stay unchanged
- React Query hooks (`ares.queries.ts`, `ares.mutations.ts`) stay unchanged
- All React components stay unchanged

#### Files to Delete

| File | Why |
|------|-----|
| `src/lib/ares/ares.parser.ts` | Parser moves to Django |
| `src/lib/turnstile.ts` | Server-side verification moves to Django |
| `src/app/api/contact-form/route.ts` | Replaced by Django endpoint |
| `src/app/api/newsletter/route.ts` | Replaced by Django endpoint |

#### Files to Modify

| File | Change |
|------|--------|
| `src/lib/ares/ares.endpoints.ts` | Call Django API instead of ARES directly |
| `src/lib/ares/ares.types.ts` | Remove Czech API types (`AresApi*`). Keep English types. |
| `src/lib/ares/index.ts` | Remove Czech type + parser exports |
| Contact/newsletter form components | Change fetch URL to Django endpoint |

#### New Environment Variable

```bash
# .env.local
NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1
```

### Using /lib Efficiently with Server-Side Features

Next.js 16 (your version) has two runtimes: **Server Components** (run on the server) and **Client Components** (run in the browser). This matters for how you call Django:

```
src/lib/
  api/
    client.ts            # Client-side axios instance (NEXT_PUBLIC_API_URL)
    server.ts            # Server-side fetch (API_BASE_URL -- internal Docker URL)
  ares/
    ares.endpoints.ts    # Uses client.ts (called from React Query hooks in browser)
    ares.types.ts        # Shared types (used by both server and client)
    ares.queries.ts      # React Query hooks (client-side)
    ares.keys.ts         # Query key factory
  query-client.ts        # React Query config (unchanged)
  utils.ts               # Utilities (unchanged)
```

#### Server Components calling Django directly

Server Components run on the Node.js server. They can call Django's internal Docker URL (`http://django:8000`) -- no CORS needed, no browser involved:

```typescript
// src/lib/api/server.ts
import "server-only";  // Build error if imported in a Client Component

const API_BASE_URL = process.env.API_BASE_URL || "http://localhost:8000";

export async function serverFetch<T>(endpoint: string): Promise<T> {
  const response = await fetch(`${API_BASE_URL}/api/v1${endpoint}`, {
    headers: { "Content-Type": "application/json" },
    next: { revalidate: 300 },  // ISR: cache for 5 minutes on the Next.js side
  });
  if (!response.ok) throw new Error(`API error: ${response.status}`);
  return response.json();
}
```

```typescript
// src/app/subject/[ico]/page.tsx (Server Component -- no "use client")
import { serverFetch } from "@/lib/api/server";
import type { AresEconomicSubject } from "@/lib/ares/ares.types";

export default async function SubjectPage({ params }: { params: Promise<{ ico: string }> }) {
  const { ico } = await params;
  const subject = await serverFetch<AresEconomicSubject>(`/ares/subjects/${ico}/`);

  return (
    <h1>{subject.records[0].businessName}</h1>
    // This HTML is sent to the browser already rendered.
    // No loading spinner, no client-side fetch, instant content.
  );
}
```

#### Client Components calling Django via React Query

Client Components run in the browser. They use your existing React Query hooks and hit the public Django URL:

```typescript
// src/lib/api/client.ts
import axios from "axios";

export const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1",
  timeout: 15000,
  headers: { "Content-Type": "application/json" },
});
```

The React Query hooks stay exactly as they are -- they just point at Django now instead of ARES.

#### CORS: Server vs Client

```
Browser (Client Component) ---> Django = NEEDS CORS ✓
Next.js Server (RSC)        ---> Django = NO CORS needed
```

Django CORS config:
```python
# Development: allow Next.js dev server
CORS_ALLOWED_ORIGINS = ["http://localhost:3000"]

# Production: allow your domain
CORS_ALLOWED_ORIGINS = ["https://yourdomain.com"]
```

#### Two API_URL Environment Variables

```bash
# .env.local (Next.js)

# Server-only (no NEXT_PUBLIC_ prefix): used by Server Components
# In Docker, this is the internal service name
API_BASE_URL=http://django:8000

# Client-side (NEXT_PUBLIC_ prefix): bundled into browser JS
# In Docker, this is the external URL the browser can reach
NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1
```

### The Complete Data Flow

```
1. User types "Praha" in search form (Client Component)
2. React Query useAresSearchMutation fires
3. aresEndpoints.search({ businessName: "Praha" })
4. axios POST to http://localhost:8000/api/v1/ares/search/
5. Nginx proxies to Django
6. Django SearchRequestSerializer validates input
7. AresService.search() checks Redis cache
   - MISS: calls AresClient -> ares.gov.cz -> parser -> cache -> return
   - HIT: returns cached data instantly
8. Django returns JSON (same shape as AresSearchResult TypeScript type)
9. React Query stores in client cache, triggers re-render
10. AresSearchResults component renders the data (unchanged)
```

### Dependencies

#### `requirements/base.txt`
```
Django>=5.1,<5.2
djangorestframework>=3.15
django-cors-headers>=4.4
django-redis>=5.4
redis>=5.0
requests>=2.32
gunicorn>=22.0
psycopg[binary]>=3.2
pdfplumber>=0.11
beautifulsoup4>=4.12
```

#### `requirements/dev.txt`
```
-r base.txt
pytest>=8.0
pytest-django>=4.8
responses>=0.25
factory-boy>=3.3
ruff>=0.5
django-debug-toolbar>=4.4
```

---

## Implementation Phases

### Phase 1: Scaffolding
Create `backend/` directory, Docker files, `config/` settings, `core/` app with shared services. Verify `docker compose up` starts Django + PostgreSQL + Redis.

### Phase 2: ARES App
Port `ares.constants.ts` -> `constants.py`, `ares.endpoints.ts` -> `client.py`, `ares.parser.ts` -> `parser.py`. Implement services, serializers, views. Test with curl.

### Phase 3: Contacts App
Create models, migrations, serializers, services (email), views. Set up Django Admin. Test with curl.

### Phase 4: Justice App
Implement client (PDF/CSV download), parsers (pdfplumber + csv), services, views. Test with sample documents.

### Phase 5: Frontend Migration
Add `NEXT_PUBLIC_API_URL` env var. Simplify `ares.endpoints.ts`. Delete parser, Czech types, Next.js API routes. Update form fetch URLs. End-to-end test.

### Verification Checklist
- [ ] `docker compose up` starts all services
- [ ] `curl POST localhost:8000/api/v1/ares/search/` returns company data
- [ ] Same search repeated returns from Redis cache (check Django logs)
- [ ] `curl GET localhost:8000/api/v1/ares/subjects/12345678/` returns detail
- [ ] Contact form submission sends email and persists in DB
- [ ] Django Admin at `/admin/` shows submissions
- [ ] Frontend search works end-to-end through Django
- [ ] Frontend detail page works end-to-end through Django
