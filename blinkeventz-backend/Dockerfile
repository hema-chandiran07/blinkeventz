# Backend Dockerfile - Development Mode
FROM node:20-alpine

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm install

# Copy source code (excluding .env via .dockerignore)
COPY . .

# Generate Prisma Client
RUN npx prisma generate

# Expose API port
EXPOSE 3000

# Set environment
ENV NODE_ENV=development

# Build and start with ts-node
CMD ["npx", "ts-node", "-T", "node_modules/.bin/nest", "start"]
