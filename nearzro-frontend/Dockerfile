# Frontend Dockerfile - Production Mode
FROM node:20-alpine

WORKDIR /app

# Increase memory limit for build
ENV NODE_OPTIONS="--max-old-space-size=4096"
ENV NEXT_TELEMETRY_DISABLED=1

# Install dependencies
COPY package*.json ./
RUN npm install

# Copy source code
COPY . .

# Build the application with standalone output
RUN npm run build

# Expose port
EXPOSE 3000

# Set production environment
ENV NODE_ENV=production

# Run production server using standalone output
CMD ["node", ".next/standalone/server.js"]
