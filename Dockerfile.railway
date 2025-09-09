# Railway-optimized Dockerfile for NestJS Backend
FROM node:20-alpine AS base

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apk add --no-cache curl

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Production stage
FROM node:20-alpine AS production

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apk add --no-cache curl

# Copy package files
COPY package*.json ./

# Install only production dependencies
RUN npm install --only=production && npm cache clean --force

# Copy built application from base stage
COPY --from=base /app/dist ./dist
COPY --from=base /app/uploads ./uploads

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nestjs -u 1001

# Set ownership
RUN chown -R nestjs:nodejs /app
USER nestjs

# Expose port (Railway will override this)
EXPOSE 3001

# Set environment
ENV NODE_ENV=production

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=60s --retries=3 \
  CMD curl -f http://localhost:${PORT:-3001}/categories || exit 1

# Start command
CMD ["node", "dist/main.js"]
