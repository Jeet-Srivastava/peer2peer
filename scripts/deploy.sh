#!/bin/bash
set -e

echo "Starting deployment process..."

# Use absolute paths if possible, but assume we are in the project root
PROJECT_DIR="$(pwd)"

# 1. Update Code Idempotently
echo "Fetching latest code from main branch..."
git fetch origin main
git pull origin main

# 2. Install Dependencies (Frontend)
echo "Installing frontend dependencies..."
if [ -d "$PROJECT_DIR/frontend" ]; then
    cd "$PROJECT_DIR/frontend"
    npm ci
    echo "Dependencies installed for frontend."
else
    echo "Warning: frontend directory not found."
fi

# 3. Build Frontend
echo "Building frontend..."
if [ -d "$PROJECT_DIR/frontend" ]; then
    cd "$PROJECT_DIR/frontend"
    npm run build
    echo "Frontend built successfully."
fi

# 4. Install Dependencies (Backend)
echo "Installing backend dependencies..."
if [ -d "$PROJECT_DIR/backend" ]; then
    cd "$PROJECT_DIR/backend"
    npm ci
    echo "Dependencies installed for backend."
else
    echo "Error: backend directory not found. Deployment cannot proceed."
    exit 1
fi

# 5. Restart Backend Process (using PM2 as an example)
echo "Restarting backend server..."
if [ -d "$PROJECT_DIR/backend" ]; then
    cd "$PROJECT_DIR/backend"
    
    # Check if PM2 is installed globally, else run locally
    if command -v pm2 &> /dev/null; then
        pm2 reload peer2peer-server || pm2 start server.js --name "peer2peer-server"
        pm2 save
        echo "Backend server restarted via PM2."
    else
        echo "PM2 is not installed globally. To keep the server running in production, please use PM2."
        echo "Deployment script complete. (Server might not be running in background)"
    fi
fi

echo "Deployment finished successfully."
