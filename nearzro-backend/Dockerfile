# Use lightweight Node image
FROM node:20-alpine

# Create working directory
WORKDIR /app

# Copy package files first (better Docker caching)
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy project files including .env
COPY . .

# Generate Prisma client (without database connection)
RUN npx prisma generate

# Build NestJS project
RUN npm run build

# Expose API port
EXPOSE 3000

# Production environment
ENV NODE_ENV=production

# Start NestJS production server with migrations
# Migrations run at container startup when database is available
CMD ["sh", "-c", "npx prisma migrate deploy && npm run start:prod"]