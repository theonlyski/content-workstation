# Multi-stage build for Content Workstation
# Stage 1: Build frontend and server
FROM node:22-alpine AS builder

WORKDIR /app

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# Copy package files
COPY package.json pnpm-lock.yaml ./

# Install all dependencies (including dev)
RUN pnpm install --frozen-lockfile --ignore-scripts
RUN pnpm rebuild better-sqlite3 esbuild

# Copy source files
COPY . .

# Build frontend (Vite) and server (TypeScript)
RUN pnpm build

# Stage 2: Production image
FROM node:22-alpine AS production

WORKDIR /app

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# Copy package files
COPY package.json pnpm-lock.yaml ./

# Install production dependencies only
RUN pnpm install --frozen-lockfile --prod --ignore-scripts
RUN pnpm rebuild better-sqlite3

# Copy built frontend from builder
COPY --from=builder /app/dist ./dist

# Copy built server from builder
COPY --from=builder /app/dist-server ./dist-server

# Copy server source (needed for better-sqlite3 native module)
COPY --from=builder /app/server ./server

# Create data directory for SQLite
RUN mkdir -p /app/data

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3010
ENV HOST=127.0.0.1
ENV DB_PATH=/app/data/content.db

# Expose port (will be bound to 127.0.0.1 in docker-compose)
EXPOSE 3010

# Start the server
CMD ["node", "dist-server/server/index.js"]
