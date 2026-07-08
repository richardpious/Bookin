#!/bin/bash

echo "Starting FastAPI backend..."
cd platform/backend
fastapi run main.py --host 0.0.0.0 --port ${PORT:-10000}
BACKEND_PID=$!

cleanup() {
    echo "Stopping servers..."
    kill $BACKEND_PID
    exit
}

trap cleanup SIGINT SIGTERM

wait $BACKEND_PID
