# Build stage
FROM node:20-slim AS builder

# Install system dependencies required for building native modules
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# Install pnpm
RUN npm install -g pnpm@10.22.0

# Set working directory
WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY config ./config
COPY packages ./packages
COPY apps/server/package.json ./apps/server/
COPY apps/web/package.json ./apps/web/
COPY packages/dto/package.json ./packages/dto/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source code
COPY . .

# Build DTO package first
RUN pnpm --filter @mancedb/dto build

# Build web app (outputs to server/public)
RUN pnpm --filter @mancedb/web build

# Build server
RUN pnpm --filter @mancedb/server build

# Production stage
FROM node:20-slim

WORKDIR /app

# Install system dependencies required for LanceDB native modules
RUN apt-get update && apt-get install -y \
    libssl3 \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Install pnpm for production
RUN npm install -g pnpm@10.22.0

# Copy package files for dependency resolution
COPY --from=builder /app/package.json /app/pnpm-lock.yaml /app/pnpm-workspace.yaml ./
COPY --from=builder /app/apps/server/package.json ./apps/server/
COPY --from=builder /app/packages/dto/package.json ./packages/dto/

# Install production dependencies only (minimal install)
RUN pnpm install --prod --frozen-lockfile --prefer-offline

# Copy built files from builder stage
COPY --from=builder /app/apps/server/dist/ ./apps/server/dist/
COPY --from=builder /app/apps/server/public/ ./apps/server/public/
COPY --from=builder /app/packages/dto/dist/ ./packages/dto/dist/

# Create .env file with default values if not provided
ENV NODE_ENV=production
ENV PORT=3000

# Expose port
EXPOSE 3000

# Health check - uses the /api/v1/health endpoint
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3000/api/v1/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start server
CMD ["node", "apps/server/dist/index.js"]
