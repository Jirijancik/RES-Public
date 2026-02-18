# --- Stage 1: Builder image (compiles C extensions, then gets thrown away) ---
# This stage has gcc and dev headers -- heavy tools needed only during install.
# Think of it like devDependencies: needed to build, but not to run.
FROM python:3.12-slim AS builder

# Install system packages needed to COMPILE psycopg (PostgreSQL driver).
# gcc + libpq-dev are ~200MB. We only need them here, not in the final image.
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
        libpq-dev \
        gcc \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy requirements FIRST (before your code).
# Docker caches each instruction. If requirements haven't changed,
# this entire stage is skipped on rebuild. Your code changes daily,
# but dependencies change rarely -- so this saves minutes per build.
COPY requirements/base.txt requirements/base.txt
COPY requirements/prod.txt requirements/prod.txt
RUN pip install --no-cache-dir -r requirements/prod.txt

# --- Stage 2: Final production image (clean, minimal, no build tools) ---
# Start fresh from python:3.12-slim. This image has NO gcc, NO dev headers.
# We only copy the compiled packages from the builder stage.
FROM python:3.12-slim AS production

# PYTHONDONTWRITEBYTECODE: Don't create .pyc files (smaller image)
# PYTHONUNBUFFERED: Print output immediately (important for Docker logs)
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

# libpq5 is the PostgreSQL CLIENT library (runtime only, ~2MB).
# libpq-dev (the dev headers, ~20MB) stays behind in the builder stage.
# curl is needed for the Docker health check.
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
        libpq5 \
        curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Create non-root user (security: never run as root in production)
RUN addgroup --system django && \
    adduser --system --ingroup django django

# Copy installed packages from the builder stage.
# This brings the compiled wheels (psycopg, etc.) without gcc.
COPY --from=builder /usr/local/lib/python3.12/site-packages \
     /usr/local/lib/python3.12/site-packages
COPY --from=builder /usr/local/bin /usr/local/bin

# Copy application code
COPY . .

# Collect static files (Django admin CSS/JS) at build time.
# These get placed into STATIC_ROOT so Nginx can serve them.
# NOTE: Do NOT suppress errors here. If collectstatic fails, you want
# to know during build -- not discover a broken admin panel in production.
RUN DJANGO_SETTINGS_MODULE=config.settings.production \
    DJANGO_SECRET_KEY=build-placeholder \
    python manage.py collectstatic --noinput

USER django
EXPOSE 8000

# Health check: Docker marks the container as unhealthy (and can restart it)
# if this fails 3 times in a row. Using curl is faster than spinning up a
# Python interpreter every 30 seconds.
HEALTHCHECK --interval=30s --timeout=10s --retries=3 \
    CMD curl -f http://localhost:8000/api/health/ || exit 1

CMD ["gunicorn", "config.wsgi:application", \
     "--bind", "0.0.0.0:8000", \
     "--workers", "5", \
     "--timeout", "120"]
