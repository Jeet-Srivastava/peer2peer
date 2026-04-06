#!/bin/bash

echo "Booting up the peer2peer backend environment..."

# --- CHECK 1: Is Node.js installed? ---
if ! command -v node &> /dev/null; then
    echo "ERROR: Node.js is not installed on this machine."
    echo "Please install Node.js from https://nodejs.org/ to continue."
    exit 1
fi

# --- CHECK 2: Does the backend directory exist? ---
if [ -d "backend" ]; then
    cd backend || exit
else
    echo "ERROR: 'backend' directory not found!"
    echo "Make sure you are running this script from the root of the peer2peer project."
    exit 1
fi

# --- CHECK 3: Does the .env file exist? ---
if [ ! -f ".env" ]; then
    echo "WARNING: No .env file found in the backend directory!"
    echo "You must create a .env file with your MONGO_URI and JWT_SECRET before starting the server."
    exit 1
fi

# Install dependencies
echo "Checking and installing dependencies..."
npm install

# Start the nodemon development server
echo "Starting the server..."
npm run dev