from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path


@dataclass(frozen=True)
class Settings:
    app_name: str = "KynetraPDF API"
    environment: str = os.getenv("ENVIRONMENT", "development")
    allowed_origins: tuple[str, ...] = tuple(
        origin.strip()
        for origin in os.getenv("ALLOWED_ORIGINS", "http://localhost:4173,http://127.0.0.1:4173").split(",")
        if origin.strip()
    )
    max_file_size_bytes: int = int(os.getenv("MAX_FILE_SIZE_BYTES", str(20 * 1024 * 1024)))
    temp_storage_dir: Path = Path(os.getenv("TEMP_STORAGE_DIR", "/tmp/kynetrapdf"))
    temp_file_ttl_seconds: int = int(os.getenv("TEMP_FILE_TTL_SECONDS", "1800"))
    rate_limit_window_seconds: int = int(os.getenv("RATE_LIMIT_WINDOW_SECONDS", "60"))
    rate_limit_requests: int = int(os.getenv("RATE_LIMIT_REQUESTS", "60"))


settings = Settings()
settings.temp_storage_dir.mkdir(parents=True, exist_ok=True)
