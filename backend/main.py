from __future__ import annotations

import mimetypes
from pathlib import Path

from fastapi import FastAPI, File, Form, HTTPException, Request, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse, Response

from .config import settings
from .jobs import job_store, output_name, parse_options
from .pdf_ops import protect_pdf, unlock_pdf
from .security import allowed_extension, check_rate_limit, sanitize_filename

PDF_EXTENSIONS = {".pdf"}
PDF_SIGNATURE = b"%PDF-"

app = FastAPI(title=settings.app_name)
app.add_middleware(
    CORSMiddleware,
    allow_origins=list(settings.allowed_origins),
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Content-Type", "X-Kynetra-Password"],
)


def api_ok(data: dict, status_code: int = 200) -> JSONResponse:
    return JSONResponse({"success": True, **data}, status_code=status_code)


ERROR_MESSAGES = {
    "RATE_LIMITED": "Too many requests. Please try again later.",
    "HTTP_ERROR": "Request failed.",
    "INTERNAL_ERROR": "Unexpected server error.",
    "UNSUPPORTED_OPERATION": "This operation is not available.",
    "INVALID_INPUT": "The request input is invalid.",
    "NOT_FOUND": "Requested resource was not found.",
    "NOT_READY": "The job result is not ready yet.",
    "INVALID_PASSWORD": "Incorrect password.",
    "PROCESSING_FAILED": "PDF processing failed.",
}


def api_error(code: str, message: str, status_code: int) -> JSONResponse:
    safe_message = ERROR_MESSAGES.get(code, "Request failed.")
    return JSONResponse({"success": False, "error": {"code": code, "message": safe_message}}, status_code=status_code)


@app.middleware("http")
async def enforce_rate_limit(request: Request, call_next):
    client = request.client.host if request.client else "unknown"
    ok, retry_after = check_rate_limit(client)
    if not ok:
        return api_error("RATE_LIMITED", f"Too many requests. Retry in {retry_after}s.", 429)
    return await call_next(request)


@app.exception_handler(HTTPException)
async def http_exception_handler(_: Request, exc: HTTPException):
    if exc.status_code >= 500:
        return api_error("HTTP_ERROR", "Internal server error.", exc.status_code)
    return api_error("HTTP_ERROR", str(exc.detail), exc.status_code)


@app.exception_handler(Exception)
async def unhandled_exception_handler(_: Request, __: Exception):
    return api_error("INTERNAL_ERROR", "Unexpected server error.", 500)


@app.get("/api/health")
def health():
    return {"success": True, "service": "KynetraPDF API", "status": "ok", "environment": settings.environment}


def _validate_pdf_upload(upload: UploadFile, content: bytes) -> None:
    if not upload.filename:
        raise HTTPException(status_code=400, detail="File name is required.")
    if len(content) > settings.max_file_size_bytes:
        raise HTTPException(status_code=413, detail="File too large.")
    if not allowed_extension(upload.filename, PDF_EXTENSIONS):
        raise HTTPException(status_code=400, detail="Only .pdf files are allowed.")
    mime = upload.content_type or mimetypes.guess_type(upload.filename)[0]
    if mime not in {"application/pdf", "application/octet-stream", None}:
        raise HTTPException(status_code=400, detail="Invalid MIME type for PDF.")
    if not content.startswith(PDF_SIGNATURE):
        raise HTTPException(status_code=400, detail="Invalid PDF file signature.")


@app.post("/api/jobs")
async def create_job(
    operation: str = Form(...),
    options: str | None = Form(default=None),
    files: list[UploadFile] = File(...),
):
    if operation not in {"merge", "split", "rotate", "protect", "unlock"}:
        return api_error("UNSUPPORTED_OPERATION", "Operation is not available.", 400)

    if operation == "merge" and len(files) < 2:
        return api_error("INVALID_INPUT", "Merge requires at least 2 files.", 400)
    if operation != "merge" and len(files) != 1:
        return api_error("INVALID_INPUT", "This operation requires exactly 1 file.", 400)

    validated: list[bytes] = []
    for file in files:
        content = await file.read()
        _validate_pdf_upload(file, content)
        validated.append(content)

    parsed_options = parse_options(options)
    first_name = sanitize_filename(files[0].filename or "document.pdf")
    job = job_store.create(operation=operation, filename=first_name)
    job_store.enqueue(job, validated, parsed_options)

    return api_ok(
        {
            "jobId": job.id,
            "status": job.status,
            "operation": job.operation,
        },
        status_code=202,
    )


@app.get("/api/jobs/{job_id}")
def get_job(job_id: str):
    job = job_store.get(job_id)
    if not job:
        return api_error("NOT_FOUND", "Job not found.", 404)
    payload = {
        "jobId": job.id,
        "operation": job.operation,
        "status": job.status,
        "progress": job.progress,
        "error": job.error,
    }
    if job.status == "completed":
        payload["downloadUrl"] = f"/api/jobs/{job.id}/download"
    return api_ok(payload)


@app.get("/api/jobs/{job_id}/download")
def download_job(job_id: str):
    job = job_store.get(job_id)
    if not job:
        return api_error("NOT_FOUND", "Job not found.", 404)
    if job.status != "completed" or not job.output_path:
        return api_error("NOT_READY", "Job result is not ready.", 409)
    filename = output_name(job.operation, job.filename)
    return FileResponse(path=Path(job.output_path), media_type="application/pdf", filename=filename)


@app.post("/api/protect")
async def protect_sync(file: UploadFile = File(...), password: str = Form(...)):
    content = await file.read()
    _validate_pdf_upload(file, content)
    if not password:
        return api_error("INVALID_INPUT", "Password is required.", 400)
    try:
        out = protect_pdf(content, password)
    except Exception:
        return api_error("PROCESSING_FAILED", "Unable to protect PDF.", 500)
    return Response(
        content=out,
        media_type="application/pdf",
        headers={"Content-Disposition": 'attachment; filename="KynetraPDF_Protected.pdf"'},
    )


@app.post("/api/unlock")
async def unlock_sync(file: UploadFile = File(...), password: str = Form(...)):
    content = await file.read()
    _validate_pdf_upload(file, content)
    if not password:
        return api_error("INVALID_INPUT", "Password is required.", 400)
    try:
        out = unlock_pdf(content, password)
    except ValueError as exc:
        return api_error("INVALID_PASSWORD", str(exc), 401)
    except Exception:
        return api_error("PROCESSING_FAILED", "Unable to unlock PDF.", 500)
    return Response(
        content=out,
        media_type="application/pdf",
        headers={"Content-Disposition": 'attachment; filename="KynetraPDF_Unlocked.pdf"'},
    )
