#!/bin/bash

# Make this script exit if any command fails
set -e

echo "Setting up local development environment (Idempotent)..."

PROJECT_DIR="$(pwd)"

# Create necessary directories if they don't exist
echo "Ensuring required directories exist..."
mkdir -p "$PROJECT_DIR/backend/uploads"

# Safe file creation mapping using standard logic
echo "Ensuring necessary environment files are present..."
if [ ! -f "$PROJECT_DIR/backend/.env" ]; then
    echo "Creating a default backend/.env (Update values if needed)..."
    cat <<EOF > "$PROJECT_DIR/backend/.env"
PORT=3000
MONGO_URI=mongodb://localhost:27017/peer2peer-dev
JWT_SECRET=supersecretkeyreplaceinproduction
EOF
else
    echo "backend/.env already exists. Skipping."
fi

if [ ! -f "$PROJECT_DIR/frontend/.env.local" ]; then
    echo "Creating a default frontend/.env.local..."
    cat <<EOF > "$PROJECT_DIR/frontend/.env.local"
VITE_API_URL=http://localhost:3000/api
EOF
else
    echo "frontend/.env.local already exists. Skipping."
fi

echo "Environment setup complete!"
