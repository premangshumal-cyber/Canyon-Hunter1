# KynetraPDF Worker

This folder is reserved for heavy/background workloads (OCR, large conversions, AI pipelines).

Current state:
- `/api/jobs` runs lightweight PDF jobs in-process with a bounded worker pool.
- For production scale, move job execution to a dedicated worker service with Redis/RabbitMQ and object storage.

Suggested runtime targets:
- Render background worker
- Railway worker
- Fly.io machine
- Cloud Run worker container
