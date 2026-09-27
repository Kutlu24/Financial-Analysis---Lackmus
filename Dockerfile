FROM python:3.11-slim

ENV LANG=C.UTF-8 \
    LC_ALL=C.UTF-8 \
    PYTHONUTF8=1 \
    PYTHONUNBUFFERED=1

RUN useradd -m -u 1000 user
USER user
ENV HOME=/home/user \
    PATH=/home/user/.local/bin:$PATH
WORKDIR $HOME/app

RUN pip install --no-cache-dir --upgrade pip

COPY --chown=user pyproject.toml ./
COPY --chown=user src ./src
COPY --chown=user frontend ./frontend

RUN pip install --no-cache-dir --user -e .

EXPOSE 8000

# No persistent volume - every input here is a per-request upload, nothing
# written to disk survives (or needs to survive) a restart.
CMD ["sh", "-c", "uvicorn lackmus.api.app:app --host 0.0.0.0 --port ${PORT:-8000}"]
