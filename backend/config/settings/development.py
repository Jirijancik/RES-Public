"""
Development settings. DEBUG=True, permissive CORS.
Used with: DJANGO_SETTINGS_MODULE=config.settings.development
"""
from .base import *  # noqa: F401, F403

DEBUG = True

ALLOWED_HOSTS = ["*"]

# Allow all origins in development (Next.js dev server on :3000)
CORS_ALLOW_ALL_ORIGINS = True
