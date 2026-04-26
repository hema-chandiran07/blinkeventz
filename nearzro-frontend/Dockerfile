# =====================================================
# Stage 1: Dependencies
# =====================================================
FROM node:20-alpine AS deps

WORKDIR /app

# Install dependencies and build tools needed for native modules (like lightningcss in Tailwind v4)
RUN apk add --no-cache libc6-compat python3 make g++

# Copy package files
COPY package*.json ./

# Explicitly install the MUSL version of lightningcss to avoid module loading errors
# Using install instead of ci to ensure the .node binary matching Alpine's libc is fetched
RUN npm install lightningcss-linux-x64-musl
RUN npm install

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
ARG NEXT_PUBLIC_API_URL=http://localhost:3000
ENV NODE_OPTIONS="--max-old-space-size=4096"
ENV NEXT_TELEMETRY_DISABLED=1
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}

# Force build from source if necessary as a fail-safe
ENV npm_config_build_from_source=true

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

# Create non-root user for security (Alpine style)
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy public folder if it exists
COPY --from=builder /app/public ./public

# Set the correct permission for prerender cache
RUN mkdir .next
RUN chown nextjs:nodejs .next

# Copy standalone server from builder
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./

# Copy static files - CRITICAL for fixing 404 errors
# Next.js standalone mode does NOT serve static files automatically
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Switch to non-root user
USER nextjs

# Expose the port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000', (r) => process.exit(r.statusCode === 200 ? 0 : 1))"

# Start the Next.js server
CMD ["node", "server.js"]