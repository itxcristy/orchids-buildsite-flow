# Production Frontend Dockerfile - Multi-stage build for React + Vite
# Stage 1: Build stage - installs all deps and builds the app
FROM node:20-alpine AS builder

ARG VITE_API_URL
ARG VITE_DATABASE_URL=
ARG VITE_APP_NAME=Drena - Agency Management Platform
ARG VITE_APP_VERSION=1.0.0
ARG VITE_APP_ENVIRONMENT=production
ENV VITE_API_URL=${VITE_API_URL}
ENV VITE_DATABASE_URL=${VITE_DATABASE_URL:-}
ENV VITE_APP_NAME=${VITE_APP_NAME}
ENV VITE_APP_VERSION=${VITE_APP_VERSION}
ENV VITE_APP_ENVIRONMENT=${VITE_APP_ENVIRONMENT}

WORKDIR /app

# Copy package files first for better layer caching
COPY package.json package-lock.json* ./

# Install ALL dependencies (including devDependencies needed for build)
# Don't set NODE_ENV=production here - we need devDependencies for vite
# Increase Node.js memory limit early to prevent issues during install
ENV NODE_OPTIONS="--max-old-space-size=4096"
RUN --mount=type=cache,target=/root/.npm \
    if [ -f package-lock.json ]; then \
        npm ci --include=dev || npm install; \
    else \
        npm install; \
    fi

# Copy build configuration files
COPY vite.config.ts tailwind.config.ts postcss.config.js components.json ./
COPY tsconfig.json tsconfig.app.json tsconfig.node.json ./
COPY index.html ./

# Copy source code
# Use .dockerignore to exclude node_modules, but copy everything else
COPY src ./src
COPY public ./public

# Add a build timestamp to bust cache if source changes
ARG BUILD_DATE=unknown
ENV BUILD_DATE=${BUILD_DATE}

# Build the application for production (VITE_API_URL is available as env var)
# NODE_OPTIONS is already set above to increase memory limit
RUN npm run build

# Stage 2: Production stage - minimal nginx image
FROM nginx:alpine

# Install gettext for envsubst (needed for environment variable substitution)
RUN apk add --no-cache gettext

# Copy built static files from builder
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy nginx configuration template
COPY nginx.conf /etc/nginx/templates/default.conf.template

# Set environment variable for backend port (default 3000)
ENV BACKEND_PORT=3000

# Create non-root user and set permissions (nginx user/group may already exist)
# Also ensure templates directory exists and is writable
RUN (addgroup -g 1001 -S nginx || true) && \
    (adduser -S nginx -u 1001 -G nginx || id nginx > /dev/null 2>&1 || adduser -S nginx -u 1001 || true) && \
    mkdir -p /etc/nginx/templates /etc/nginx/conf.d && \
    chown -R nginx:nginx /usr/share/nginx/html /var/cache/nginx /var/log/nginx /etc/nginx/conf.d /etc/nginx/templates && \
    touch /var/run/nginx.pid && \
    chown nginx:nginx /var/run/nginx.pid

# Create entrypoint script for environment variable substitution
# Script runs as root to write config, nginx will drop privileges internally
RUN echo '#!/bin/sh' > /docker-entrypoint.sh && \
    echo 'set -e' >> /docker-entrypoint.sh && \
    echo 'if [ -f /etc/nginx/templates/default.conf.template ]; then' >> /docker-entrypoint.sh && \
    echo '  echo "[Nginx] Substituting environment variables in nginx config..."' >> /docker-entrypoint.sh && \
    echo '  echo "[Nginx] BACKEND_PORT=${BACKEND_PORT:-3000}"' >> /docker-entrypoint.sh && \
    echo '  envsubst '"'"'$$BACKEND_PORT'"'"' < /etc/nginx/templates/default.conf.template > /etc/nginx/conf.d/default.conf' >> /docker-entrypoint.sh && \
    echo '  echo "[Nginx] Config generated successfully"' >> /docker-entrypoint.sh && \
    echo '  chown nginx:nginx /etc/nginx/conf.d/default.conf' >> /docker-entrypoint.sh && \
    echo 'else' >> /docker-entrypoint.sh && \
    echo '  echo "[Nginx] Warning: Template file not found, using default config"' >> /docker-entrypoint.sh && \
    echo 'fi' >> /docker-entrypoint.sh && \
    echo 'exec nginx -g "daemon off;"' >> /docker-entrypoint.sh && \
    chmod +x /docker-entrypoint.sh

# nginx:alpine runs master process as root (needed for port 80) but worker processes as nginx user
# This is the standard nginx security model and is safe
# The entrypoint script writes config as root, then nginx handles privilege dropping

EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost/health || exit 1

# Use entrypoint script for environment variable substitution
CMD ["/docker-entrypoint.sh"]
