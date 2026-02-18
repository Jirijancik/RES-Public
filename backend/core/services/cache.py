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
