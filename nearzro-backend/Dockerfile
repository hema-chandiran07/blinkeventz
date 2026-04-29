# =====================================================
# Stage 1: Dependencies
# =====================================================
FROM node:20-alpine AS deps

WORKDIR /app

# Install build tools for native modules (sharp, bcrypt, etc.)
RUN apk add --no-cache libc6-compat python3 make g++

COPY package*.json ./

# Install all deps including dev (needed for build)
RUN npm install

# Force install sharp for Linux/musl (Alpine uses musl libc)
RUN npm install --platform=linux --libc=musl sharp

# =====================================================
# Stage 2: Builder
# =====================================================
FROM node:20-alpine AS builder

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Generate Prisma client
RUN npx prisma generate

# Build NestJS
RUN npm run build

# =====================================================
# Stage 3: Runner
# =====================================================
FROM node:20-alpine AS runner

WORKDIR /app

RUN apk add --no-cache wget

ENV NODE_ENV=production

# Copy only what's needed to run
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/prisma ./prisma

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD wget --quiet --tries=1 --no-verbose http://localhost:3000/health -O /dev/null || exit 1

CMD ["sh", "-c", "npx prisma migrate deploy && node dist/src/main.js"]