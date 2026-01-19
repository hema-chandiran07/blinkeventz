# ---- Base image ----
FROM node:20-alpine

# ---- Set working directory ----
WORKDIR /app

# ---- Install dependencies first (layer caching) ----
COPY package*.json ./
RUN npm install

# ---- Copy source code ----
COPY . .

# ---- Generate Prisma Client ----
RUN npx prisma generate

# ---- Expose API port ----
EXPOSE 3000

# ---- Start in dev mode ----
CMD ["npm", "run", "start:dev"]
