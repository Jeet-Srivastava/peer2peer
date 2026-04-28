FROM node:20-alpine AS builder

WORKDIR /app

# Copy package manifests first for Docker layer caching
COPY package.json package-lock.json ./

# Install all dependencies (devDependencies needed for Vite build)
RUN npm ci

# Copy the entire frontend source
COPY . .

# Build argument for the backend API URL (injected at build time)
# This bakes the API URL into the static JS bundle
ARG VITE_API_URL=http://localhost:8000/api
ENV VITE_API_URL=$VITE_API_URL

# Build the production-optimized React app
RUN npm run build


FROM nginx:1.27-alpine AS production

RUN apk add --no-cache wget

# Copy custom Nginx configuration for SPA routing
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy the built static files from the builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Expose port 80 for HTTP traffic
EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -q -O - http://localhost/health >/dev/null 2>&1 || exit 1

# Nginx runs in the foreground by default in the official image
CMD ["nginx", "-g", "daemon off;"]
