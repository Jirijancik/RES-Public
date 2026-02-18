from django.core.cache import cache
from rest_framework.throttling import UserRateThrottle


class AresSearchThrottle(UserRateThrottle):
    rate = "30/minute"
    scope = "ares_search"


class AresDetailThrottle(UserRateThrottle):
    rate = "60/minute"
    scope = "ares_detail"


class ContactFormThrottle(UserRateThrottle):
    rate = "5/hour"
    scope = "contact_form"


class GlobalOutboundThrottle:
    """Custom throttle for outbound API calls (shared across all users)."""

    def __init__(self, key: str, max_requests: int, window: int):
        self.cache_key = f"throttle:outbound:{key}"
        self.max_requests = max_requests
        self.window = window  # seconds

    def allow(self) -> bool:
        current = cache.get(self.cache_key)
        if current is None:
            cache.set(self.cache_key, 1, self.window)
            return True
        if current >= self.max_requests:
            return False
        cache.incr(self.cache_key)
        return True

    def wait_time(self) -> int | None:
        ttl = cache.ttl(self.cache_key)
        return ttl if ttl and ttl > 0 else None
