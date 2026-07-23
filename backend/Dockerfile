# ============================================================
# Stage 1 – Build: install dependencies in a virtual env
# ============================================================
FROM python:3.12-slim AS builder

WORKDIR /app

# System build deps (asyncpg needs a C compiler)
RUN apt-get update && apt-get install -y --no-install-recommends \
        gcc \
        libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Copy only requirements first – leverages Docker layer cache
COPY requirements.txt .

RUN python -m venv /opt/venv \
    && /opt/venv/bin/pip install --upgrade pip \
    && /opt/venv/bin/pip install --no-cache-dir -r requirements.txt


# ============================================================
# Stage 2 – Runtime: lean production image
# ============================================================
FROM python:3.12-slim AS runtime

WORKDIR /app

# Runtime C libs needed by asyncpg
RUN apt-get update && apt-get install -y --no-install-recommends \
        libpq5 \
    && rm -rf /var/lib/apt/lists/*

# Copy virtual-env from builder
COPY --from=builder /opt/venv /opt/venv

# Copy application source
COPY main.py agents.py db.py schema_prompt.py ./

# Activate venv
ENV PATH="/opt/venv/bin:$PATH"

# ============================================================
# Runtime configuration
# ============================================================
# Cloud Run injects PORT at runtime (default 8080).
# Set a sane default here so local docker run also works.
ENV PORT=8080

EXPOSE 8080

# Run as a non-root user for security
RUN useradd --no-create-home --shell /bin/false appuser
USER appuser

# IMPORTANT: Use shell form (no brackets) so $PORT is expanded
# at container start time from the actual runtime environment variable.
# --workers 1: Cloud Run scales horizontally; multiple uvicorn workers
#              inside one container cause startup issues on Cloud Run.
CMD uvicorn main:app --host 0.0.0.0 --port $PORT
