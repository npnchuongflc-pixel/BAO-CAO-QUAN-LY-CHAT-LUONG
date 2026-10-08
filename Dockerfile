FROM node:22-alpine

WORKDIR /app

# Install dependencies first for efficient caching
COPY package*.json ./
RUN npm ci

# Copy application source code
COPY . .

# Build frontend and server bundles
RUN npm run build

# Default environment configuration
ENV NODE_ENV=production
ENV PORT=8080

EXPOSE 8080

CMD ["node", "server.ts"]
