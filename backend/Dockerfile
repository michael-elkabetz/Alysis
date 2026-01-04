# ========================================
# AIApps Backend - Bun Docker Build
# ========================================

FROM oven/bun:1.3.5-alpine AS production

WORKDIR /app

# Copy package files
COPY package.json ./

# Install all dependencies (including devDependencies for drizzle-kit)
RUN bun install

# Copy source files
COPY src ./src
COPY drizzle.config.ts ./
COPY tsconfig.json ./

# Create drizzle migrations folder
RUN mkdir -p drizzle

# Copy public folder for static file serving
COPY --link public* ./public/

# Environment
ENV NODE_ENV=production
ENV PORT=3001

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3001/api/health || exit 1

# Run migrations then start server
CMD ["sh", "-c", "bunx drizzle-kit push && bun run src/index.ts"]
