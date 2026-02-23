FROM node:20-alpine
WORKDIR /app

# Copy dependencies first for better caching
COPY package*.json ./
RUN npm install --legacy-peer-deps

# Copy the rest of the frontend code
COPY . .

# Expose Next.js default port
EXPOSE 3001

# Run in development mode
CMD ["npm", "run", "dev"]