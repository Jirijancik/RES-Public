import pytest
from django.core.cache import cache


@pytest.fixture(autouse=True)
def clear_cache():
    """Clear Django cache before each test to prevent cross-test contamination."""
    cache.clear()
    yield
    cache.clear()
