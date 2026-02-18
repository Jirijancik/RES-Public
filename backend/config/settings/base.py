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
    # "ares",        # Uncommented by Chunk 3
    # "justice",     # Uncommented by Chunk 5
    # "contacts",    # Uncommented by Chunk 4
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

# Templates: Required even for an API-only project because Django Admin
# uses templates to render its pages. Without this, visiting /admin/ crashes.
TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],                  # No custom templates needed
        "APP_DIRS": True,            # Find templates inside installed apps (admin, DRF)
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.debug",
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

# Static files: collectstatic gathers CSS/JS from all apps (mainly Django Admin)
# into STATIC_ROOT, which Nginx serves. See the shared volume in docker-compose.yml.
STATIC_URL = "/static/"
STATIC_ROOT = BASE_DIR / "staticfiles"

# CSRF: Django uses CSRF protection for any session-based requests (like the admin).
# Since our API uses DRF with AllowAny + no session auth, CSRF doesn't apply to
# API endpoints. But if you access /admin/ from a different origin (e.g., your
# Next.js domain), you need to whitelist it here or Django blocks the POST.
CSRF_TRUSTED_ORIGINS = [
    origin.strip()
    for origin in env("CSRF_TRUSTED_ORIGINS", "http://localhost:3000").split(",")
]

# DRF configuration (like setting up axios defaults)
REST_FRAMEWORK = {
    "DEFAULT_RENDERER_CLASSES": ["rest_framework.renderers.JSONRenderer"],
    "DEFAULT_PARSER_CLASSES": ["rest_framework.parsers.JSONParser"],
    # "EXCEPTION_HANDLER": "core.exceptions.custom_exception_handler",  # Uncommented by Chunk 2
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

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"
