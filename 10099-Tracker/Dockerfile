FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    TRAFFIC_CONFIG_FILE=/app/data/config.json \
    TRAFFIC_TOKEN_FILE=/app/data/admin_token

WORKDIR /app
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt
COPY app.py ./
COPY web ./web
RUN mkdir -p /app/data

EXPOSE 8000
CMD ["python", "app.py", "--host", "0.0.0.0", "--port", "8000"]
