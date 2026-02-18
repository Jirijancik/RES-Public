"""
Production settings. Strict security headers, no debug.
Used with: DJANGO_SETTINGS_MODULE=config.settings.production
"""
from .base import env  # noqa: F401
from .base import *  # noqa: F401, F403

DEBUG = False

ALLOWED_HOSTS = [
    host.strip()
    for host in env("ALLOWED_HOSTS", "localhost").split(",")
]

# CORS: Only allow specific origins in production
CORS_ALLOWED_ORIGINS = [
    origin.strip()
    for origin in env("CORS_ALLOWED_ORIGINS", "http://localhost:3000").split(",")
]

# Security headers
SECURE_HSTS_SECONDS = 31536000  # 1 year
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
SECURE_HSTS_PRELOAD = True
SECURE_SSL_REDIRECT = env("SECURE_SSL_REDIRECT", "True") == "True"
SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
