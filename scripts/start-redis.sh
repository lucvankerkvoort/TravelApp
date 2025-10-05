#!/bin/bash
set -e

# Check if Redis container is already running
if [ "$(docker ps -q -f name=redis-local)" ]; then
  echo "✅ Redis is already running."
  exit 0
fi

# Check if container exists but is stopped
if [ "$(docker ps -aq -f status=exited -f name=redis-local)" ]; then
  echo "🔄 Restarting existing Redis container..."
  docker start redis-local
  exit 0
fi

# Otherwise, start a new container
echo "🚀 Starting a new Redis container..."
docker run -d --name redis-local -p 6379:6379 -v redis_data:/data redis:7-alpine