FROM node:20-alpine AS builder

# Set working directory inside the container
WORKDIR /app

# Copy package manifests first to leverage Docker layer caching.
# If package.json/package-lock.json haven't changed, npm ci is cached.
COPY package.json package-lock.json ./

# Install ALL dependencies (dev + prod) — needed for any build scripts
RUN npm ci

# Now prune to production-only dependencies for the final image
RUN npm prune --production


FROM node:20-alpine AS production

# Install curl for the ECS container health check (curl -f http://localhost:8000/)
RUN apk add --no-cache curl

WORKDIR /app

# Copy production node_modules from the builder stage
COPY --from=builder --chown=node:node /app/node_modules ./node_modules

# Copy the application source code
COPY --chown=node:node . .

# Ensure the runtime upload directory exists and is writable.
RUN mkdir -p /app/uploads && chown -R node:node /app

# Set a non-root user for security best practices
# The 'node' user is built-in to the official Node.js Alpine images
USER node

# Expose the port the backend listens on (matches PORT in .env / server.js)
EXPOSE 8000

# Set the default environment variable for the port
ENV PORT=8000
ENV NODE_ENV=production

# Health check — ECS also runs its own, but this provides a Docker-native check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -fsS http://localhost:8000/health || exit 1

# Start the Node.js server
CMD ["node", "server.js"]
