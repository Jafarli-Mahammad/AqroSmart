from __future__ import annotations

from threading import RLock
from time import monotonic
from typing import Any


class TTLResponseCache:
    def __init__(self, ttl_seconds: int = 10, maxsize: int = 256) -> None:
        self.ttl_seconds = ttl_seconds
        self.maxsize = maxsize
        self._store: dict[str, tuple[float, Any]] = {}
        self._lock = RLock()

    def get(self, key: str) -> Any | None:
        now = monotonic()
        with self._lock:
            cached = self._store.get(key)
            if cached is None:
                return None
            expires_at, value = cached
            if expires_at <= now:
                self._store.pop(key, None)
                return None
            return value

    def set(self, key: str, value: Any) -> None:
        now = monotonic()
        with self._lock:
            if len(self._store) >= self.maxsize:
                oldest_key = min(self._store.items(), key=lambda item: item[1][0])[0]
                self._store.pop(oldest_key, None)
            self._store[key] = (now + self.ttl_seconds, value)

    def invalidate_prefix(self, prefix: str) -> None:
        with self._lock:
            keys = [key for key in self._store if key.startswith(prefix)]
            for key in keys:
                self._store.pop(key, None)


response_cache = TTLResponseCache(ttl_seconds=12, maxsize=512)
