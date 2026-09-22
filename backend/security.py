from __future__ import annotations

import re
import time
from collections import defaultdict, deque
from pathlib import Path

from .config import settings

_filename_pattern = re.compile(r"[^A-Za-z0-9._-]+")
_request_log: dict[str, deque[float]] = defaultdict(deque)


def sanitize_filename(filename: str) -> str:
    safe = _filename_pattern.sub("_", filename).strip("._")
    return safe or "file"


def allowed_extension(filename: str, allowed: set[str]) -> bool:
    return Path(filename).suffix.lower() in allowed


def check_rate_limit(client_id: str) -> tuple[bool, int]:
    now = time.time()
    q = _request_log[client_id]
    window = settings.rate_limit_window_seconds
    while q and q[0] < now - window:
        q.popleft()
    if len(q) >= settings.rate_limit_requests:
        retry_after = max(1, int(window - (now - q[0])))
        return False, retry_after
    q.append(now)
    return True, 0
