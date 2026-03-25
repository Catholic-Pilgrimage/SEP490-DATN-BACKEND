#!/bin/bash

# Deploy script for VPS
echo "Starting deployment..."

# Navigate to app directory
cd "$(dirname "$0")/.." || exit 1

# Check if .env exists
if [ ! -f .env ]; then
    echo "ERROR: .env file not found!"
    echo "Creating .env from .env.example..."
    cp .env.example .env
    echo "WARNING: Please edit .env file with your configuration before continuing!"
    exit 1
fi

# Stop existing containers
echo "Stopping existing containers..."
docker-compose down

# Pull latest changes (if using git)
if [ -d .git ]; then
    echo "Pulling latest changes..."
    git pull
fi

# Build and start containers
echo "Building and starting containers..."
docker-compose up -d --build

# Wait for services to be healthy
echo "Waiting for services to be ready..."
sleep 10

# Check container status
echo "Container status:"
docker-compose ps

# Show logs
echo "Recent logs:"
docker-compose logs --tail=50

echo "Deployment complete!"
echo "App should be running on port ${PORT:-3000}"
