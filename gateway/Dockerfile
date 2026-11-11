# Build del frontend
FROM node:22-alpine AS frontend
WORKDIR /app
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# Gateway
FROM python:3.12-slim
COPY --from=ghcr.io/astral-sh/uv:latest /uv /usr/local/bin/uv
WORKDIR /app
COPY gateway/pyproject.toml gateway/uv.lock* ./
RUN uv sync --no-dev --no-install-project
COPY gateway/src ./src
RUN uv sync --no-dev
COPY --from=frontend /app/dist ./static
ENV STATIC_DIR=/app/static STUDIO_DB_PATH=/data/studio.db
VOLUME /data
EXPOSE 8000
CMD ["uv", "run", "--no-dev", "uvicorn", "mygraph_studio.main:app", "--host", "0.0.0.0", "--port", "8000"]
