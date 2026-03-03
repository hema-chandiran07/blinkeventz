# Backend Dockerfile - Production Mode
FROM node:20-alpine

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm install

# Copy source code
COPY . .

# Generate Prisma Client
RUN npx prisma generate

# Build the application
RUN npx nest build

# Expose API port
EXPOSE 3000

# Set environment
ENV NODE_ENV=production

# Start production server
CMD ["node", "dist/src/main.js"]
