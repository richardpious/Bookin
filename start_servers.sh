#!/bin/bash

echo "Starting FastAPI backend..."
cd platform/backend
fastapi run main.py &
BACKEND_PID=$!

echo "Starting Vite frontend..."
cd ../frontend/bookin
npm run dev -- --host 0.0.0.0 --port 5173 &
FRONTEND_PID=$!

cleanup() {
    echo "Stopping servers..."
    kill $BACKEND_PID
    kill $FRONTEND_PID
    exit
}

trap cleanup SIGINT SIGTERM

wait $BACKEND_PID $FRONTEND_PID
