# Frontend Dockerfile - Production Mode
FROM node:20-alpine

WORKDIR /app

# Increase memory limit for build
ENV NODE_OPTIONS="--max-old-space-size=4096"
ENV NEXT_TELEMETRY_DISABLED=1

# Install dependencies
COPY package*.json ./
RUN npm install

# Copy source code and env file
COPY . .

# Build the application (production build bakes in env vars)
RUN npm run build

# Set production environment
ENV NODE_ENV=production

# Expose port
EXPOSE 3000

# Run production server
CMD ["npm", "run", "start"]
