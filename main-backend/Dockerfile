# Wiresploit main backend — capture / live timeline / findings / context analysis.
FROM python:3.13-slim

# scapy (declared in requirements) needs libpcap present at import time.
RUN apt-get update && apt-get install -y --no-install-recommends \
        libpcap0.8 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY app ./app

EXPOSE 8000
# ES URL + credentials are supplied at runtime via env (never baked into the image).
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
