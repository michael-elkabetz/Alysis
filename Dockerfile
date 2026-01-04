# ========================================
# Alysis - Multi-stage Docker Build
# ========================================
# Builds React frontend and serves via Bun/Elysia backend

# Stage 1: Build the frontend
FROM node:22-alpine AS frontend-builder

WORKDIR /app/frontend

# Copy frontend package files
COPY frontend/package*.json ./

# Install dependencies
RUN npm ci

# Copy frontend source
COPY frontend/ ./

# Build the React app
RUN npm run build

# ========================================
# Stage 2: Build and run the backend
FROM oven/bun:1.3.5-alpine AS production

WORKDIR /app

# Copy backend files
COPY backend/package.json backend/bun.lock* ./
RUN bun install --frozen-lockfile --production

# Copy backend source
COPY backend/src ./src
COPY backend/tsconfig.json ./

# Copy built frontend to public folder
COPY --from=frontend-builder /app/frontend/dist ./public

# Environment
ENV NODE_ENV=production
ENV PORT=3001

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3001/api/health || exit 1

# Run the server
CMD ["bun", "run", "src/index.ts"]

