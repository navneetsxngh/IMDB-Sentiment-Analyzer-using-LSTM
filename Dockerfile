FROM python:3.10-slim

WORKDIR /app

# Install git (required by some DVC/MLflow internals at runtime)
RUN apt-get update && \
    apt-get install -y --no-install-recommends git && \
    rm -rf /var/lib/apt/lists/*

# Install dependencies first (better layer caching)
COPY requirements.txt .
RUN pip install -r requirements.txt

# Copy entire project (including local artifacts)
COPY . .
RUN pip install -e .

# ── Runtime environment variables (override at run time via --env-file .env) ─
# MLflow – default to local filesystem so the container starts without network auth.
# Override with --env MLFLOW_TRACKING_URI=... if you need a remote backend.
ENV MLFLOW_TRACKING_URI="mlruns"
ENV MLFLOW_EXPERIMENT_NAME="IMDB_Sentiment_Analysis"

EXPOSE 8080

# Run uvicorn directly to avoid the dev-only reload=True flag in app.py
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8080"]