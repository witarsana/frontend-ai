#!/bin/bash

# Load environment variables
source ../.env

# Start frontend with environment configuration
echo "🌐 Starting Frontend on ${FRONTEND_HOST}:${FRONTEND_PORT}"
cd ../frontend && npm run dev
