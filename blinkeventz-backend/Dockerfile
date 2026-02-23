# ---- Base image ----
FROM node:20-alpine

# ---- Set working directory ----
WORKDIR /app

# ---- Install dependencies first ----
COPY package*.json ./
RUN npm install --legacy-peer-deps

# ---- Copy source code ----
COPY . .

# ---- Generate Prisma Client ----
RUN npx prisma generate

# ---- Expose API port ----
EXPOSE 3000

# ---- Start in dev mode ----
CMD npx prisma migrate deploy && npm run start:dev
