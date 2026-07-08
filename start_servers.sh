#!/bin/bash

echo "Starting FastAPI backend..."
cd platform/backend
fastapi run main.py &
BACKEND_PID=$!

cleanup() {
    echo "Stopping servers..."
    kill $BACKEND_PID
    exit
}

trap cleanup SIGINT SIGTERM

wait $BACKEND_PID
