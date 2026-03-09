# =====================================================
# Stage 1: Dependencies
# =====================================================
FROM node:20-alpine AS deps

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# =====================================================
# Stage 2: Builder
# =====================================================
FROM node:20-alpine AS builder

WORKDIR /app

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules

# Copy source code
COPY . .

# Set environment variables for build
ENV NODE_OPTIONS="--max-old-space-size=4096"
ENV NEXT_TELEMETRY_DISABLED=1

# Build the Next.js application
RUN npm run build

# =====================================================
# Stage 3: Runner - Production optimized image
# =====================================================
FROM node:20-alpine AS runner

WORKDIR /app

# Set production environment
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Create non-root user for security
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy standalone server from builder
COPY --from=builder /app/.next/standalone ./

# Copy static files - CRITICAL for fixing 404 errors
# Next.js standalone mode does NOT serve static files automatically
COPY --from=builder /app/.next/static ./.next/static

# Copy public folder if it exists
COPY --from=builder /app/public ./public

# Set ownership
RUN chown nextjs:nodejs /app

# Switch to non-root user
USER nextjs

# Expose the port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000', (r) => process.exit(r.statusCode === 200 ? 0 : 1))"

# Start the Next.js server
CMD ["node", "server.js"]
