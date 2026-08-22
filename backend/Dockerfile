# ── Build stage: compile deps into an isolated venv (keeps gcc out of runtime) ─
FROM python:3.11-slim@sha256:9c900dea9e8fb7e16277c179b555cc72d29a352dbc33cff48ad5a0412fd5bfc7 AS builder

WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc libpq-dev \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN python -m venv /venv \
    && /venv/bin/pip install --no-cache-dir --upgrade pip \
    && /venv/bin/pip install --no-cache-dir -r requirements.txt

# ── Runtime stage: no build toolchain, non-root, read-only friendly ────────────
FROM python:3.11-slim@sha256:9c900dea9e8fb7e16277c179b555cc72d29a352dbc33cff48ad5a0412fd5bfc7 AS runtime

WORKDIR /app
ENV PATH="/venv/bin:$PATH" \
    PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    HOME=/tmp

# Unprivileged service account — nothing in this image runs as root.
RUN groupadd -r appuser && useradd -r -g appuser -u 10001 appuser

COPY --from=builder /venv /venv
COPY . .

# Uploads dir is a mounted volume at runtime; create + own it for the fallback case.
RUN mkdir -p /app/uploads && chown -R appuser:appuser /app/uploads

USER appuser

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
