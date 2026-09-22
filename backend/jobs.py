from __future__ import annotations

import json
import time
import uuid
from concurrent.futures import ThreadPoolExecutor
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

from . import pdf_ops
from .security import sanitize_filename
from .storage import cleanup_expired_files, save_temp_file


@dataclass
class Job:
    id: str
    operation: str
    filename: str
    status: str = "queued"
    progress: int = 0
    created_at: float = field(default_factory=time.time)
    updated_at: float = field(default_factory=time.time)
    error: str | None = None
    output_path: Path | None = None


class JobStore:
    def __init__(self) -> None:
        self._jobs: dict[str, Job] = {}
        self._executor = ThreadPoolExecutor(max_workers=2)

    def create(self, operation: str, filename: str) -> Job:
        job = Job(id=uuid.uuid4().hex, operation=operation, filename=filename)
        self._jobs[job.id] = job
        return job

    def get(self, job_id: str) -> Job | None:
        return self._jobs.get(job_id)

    def enqueue(self, job: Job, files: list[bytes], options: dict[str, Any]) -> None:
        self._executor.submit(self._run_job, job, files, options)

    def _run_job(self, job: Job, files: list[bytes], options: dict[str, Any]) -> None:
        cleanup_expired_files()
        job.status = "processing"
        job.progress = 10
        job.updated_at = time.time()
        try:
            operation = job.operation
            result: bytes
            if operation == "merge":
                result = pdf_ops.merge_pdf(files)
            elif operation == "split":
                result = pdf_ops.split_pdf(files[0], str(options.get("ranges", "")))
            elif operation == "rotate":
                result = pdf_ops.rotate_pdf(
                    files[0], int(options.get("degrees", 90)), str(options.get("pages", "all"))
                )
            elif operation == "protect":
                result = pdf_ops.protect_pdf(files[0], str(options.get("password", "")))
            elif operation == "unlock":
                result = pdf_ops.unlock_pdf(files[0], str(options.get("password", "")))
            else:
                raise ValueError("Unsupported operation.")

            job.progress = 90
            output = save_temp_file(result, ".pdf")
            job.output_path = output
            job.progress = 100
            job.status = "completed"
            job.updated_at = time.time()
        except Exception as exc:
            job.status = "failed"
            job.error = str(exc)
            job.updated_at = time.time()


job_store = JobStore()


def parse_options(options_raw: str | None) -> dict[str, Any]:
    if not options_raw:
        return {}
    try:
        parsed = json.loads(options_raw)
    except json.JSONDecodeError as exc:
        raise ValueError(f"Invalid options JSON: {exc.msg}") from exc
    if not isinstance(parsed, dict):
        raise ValueError("Options must be a JSON object.")
    return parsed


def output_name(operation: str, original: str) -> str:
    base = sanitize_filename(original).removesuffix(".pdf")
    return f"KynetraPDF_{operation}_{base}.pdf"
