from __future__ import annotations

import os
import time
import uuid
from pathlib import Path

from .config import settings


def save_temp_file(content: bytes, suffix: str) -> Path:
    name = f"{uuid.uuid4().hex}{suffix}"
    path = settings.temp_storage_dir / name
    path.write_bytes(content)
    return path


def cleanup_expired_files() -> None:
    now = time.time()
    ttl = settings.temp_file_ttl_seconds
    for file in settings.temp_storage_dir.glob("*"):
        try:
            if file.is_file() and now - file.stat().st_mtime > ttl:
                file.unlink(missing_ok=True)
        except OSError:
            continue


def read_file(path: Path) -> bytes:
    return path.read_bytes()


def delete_file(path: Path) -> None:
    try:
        os.remove(path)
    except OSError:
        pass
