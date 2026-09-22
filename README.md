# KynetraPDF

**Smart PDF Tools for a Smarter You**

KynetraPDF is being migrated from a single-file prototype to a production-ready architecture with secure API-backed processing.

## Repository structure

```text
KynetraPDF/
├── frontend/              # Primary web app UI
├── backend/               # FastAPI backend for PDF processing/jobs
├── worker/                # Worker architecture docs and future worker runtime
├── public/                # robots.txt, sitemap.xml
├── api/                   # Vercel API entrypoint
├── package.json
├── requirements.txt
├── .env.example
├── vercel.json
└── README.md
```

## Implemented now (real)

- API health endpoint: `GET /api/health`
- Job-based PDF processing endpoints:
  - `POST /api/jobs` (`merge`, `split`, `rotate`, `protect`, `unlock`)
  - `GET /api/jobs/{jobId}`
  - `GET /api/jobs/{jobId}/download`
- Direct compatibility endpoints:
  - `POST /api/protect`
  - `POST /api/unlock`
- Security baseline:
  - env-configured CORS allowlist
  - in-memory rate limiting
  - file size checks
  - extension + MIME + PDF signature validation
  - temporary result storage with cleanup hooks
- Frontend API-driven tool flows for merge/split/rotate/protect/unlock
- Legacy prototype preserved as source snapshot at `/frontend/legacy-source.txt`

## Requires external credentials/configuration

- AI features (chat/summarize/research generation)
- Auth providers (email/password, Google OAuth)
- Payment/subscription integrations
- Cloud object storage credentials
- Database-backed persistent job/user data

## Optional/future features (not yet fully implemented)

- Dedicated distributed worker queue (Redis/RabbitMQ)
- OCR/searchable PDF at scale
- Full conversion suite (Word/Excel/PPT with high fidelity)
- Study mode and research mode server-side AI pipelines
- Admin analytics dashboard
- Cloud drive connectors (Google Drive, OneDrive, Dropbox)

## Local development

1. Install Python dependencies:
   ```bash
   pip install -r requirements.txt
   ```
2. Configure environment:
   ```bash
   cp .env.example .env
   ```
3. Run backend API:
   ```bash
   uvicorn backend.main:app --reload --host 0.0.0.0 --port 8000
   ```
4. Run frontend static server (separate terminal):
   ```bash
   python -m http.server 4173 --directory frontend
   ```

## Deployment

### Frontend
- Deploy `frontend/` as static assets on Vercel/Netlify/Cloudflare Pages.

### Backend
- Deploy FastAPI app (`backend.main:app`) on Render, Railway, Fly.io, or Cloud Run.
- For Vercel, `api/index.py` exports the ASGI app and `vercel.json` routes `/api/*` to Python.

## Environment variables

See `.env.example` for required settings:
- `ALLOWED_ORIGINS`
- `MAX_FILE_SIZE_BYTES`
- `TEMP_STORAGE_DIR`
- `TEMP_FILE_TTL_SECONDS`
- `RATE_LIMIT_WINDOW_SECONDS`
- `RATE_LIMIT_REQUESTS`
- plus placeholders for AI, DB, storage, JWT, Stripe secrets

## API response format

Success:

```json
{
  "success": true,
  "jobId": "abc123",
  "status": "queued"
}
```

Error:

```json
{
  "success": false,
  "error": {
    "code": "INVALID_INPUT",
    "message": "Only .pdf files are allowed."
  }
}
```

## Security note

KynetraPDF does not claim absolute security/privacy guarantees. Current protections are baseline controls and should be extended with malware scanning, auth-based authorization, persistent rate-limit storage, and managed object storage before high-scale production use.
