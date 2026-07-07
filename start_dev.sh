#!/bin/bash

# Start the FastAPI backend
echo "Starting FastAPI backend..."
cd platform/backend
fastapi run main.py &
BACKEND_PID=$!

# Start the Vite frontend
echo "Starting Vite frontend..."
cd ../frontend/bookin
npm run dev &
FRONTEND_PID=$!

# Function to handle script termination
cleanup() {
    echo "Stopping servers..."
    kill $BACKEND_PID
    kill $FRONTEND_PID
    exit
}

# Trap exit signals
trap cleanup SIGINT SIGTERM

# Wait for processes
wait $BACKEND_PID $FRONTEND_PID
