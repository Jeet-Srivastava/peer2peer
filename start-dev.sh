#!/bin/bash

echo "🚀 Booting up the peer2peer backend environment..."

# Navigate into the backend directory
cd backend || exit

# Install dependencies just in case new ones were pulled from Git
echo "📦 Checking and installing dependencies..."
npm install

# Start the nodemon development server
echo "🟢 Starting the server..."
npm run dev