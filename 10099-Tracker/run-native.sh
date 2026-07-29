#!/bin/sh
set -eu

cd "$(dirname "$0")"

if [ ! -x .venv/bin/python ]; then
  python3 -m venv .venv
  .venv/bin/python -m pip install --upgrade pip
  .venv/bin/python -m pip install -r requirements.txt
fi

exec .venv/bin/python app.py \
  --host "${APP_HOST:-0.0.0.0}" \
  --port "${APP_PORT:-8000}"
