#!/bin/bash

# Load environment variables
source ../.env

# Change to backend directory and start server
echo "🚀 Starting Backend on ${BACKEND_HOST}:${BACKEND_PORT}"
cd ../backend && python -m uvicorn ffmpeg_free_main:app --reload --host 0.0.0.0 --port ${BACKEND_PORT}
