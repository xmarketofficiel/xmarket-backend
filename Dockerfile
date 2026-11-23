# Use Debian-based Node image (better Sharp compatibility)
FROM node:20-slim

WORKDIR /app

# Install Sharp dependencies for Debian
RUN apt-get update && apt-get install -y \
    libvips-dev \
    && rm -rf /var/lib/apt/lists/*

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install --include=optional --legacy-peer-deps

# Copy source code
COPY . .

# Build the application
RUN npm run build && \
    echo "Build completed. Checking dist directory:" && \
    ls -la dist/ && \
    test -f dist/main.js && \
    echo "✅ Build successful"

# Verify Sharp works
RUN node -e "require('sharp')" && echo "✅ Sharp loaded successfully"

# Remove dev dependencies
RUN npm prune --production

# Start the application
CMD ["npm", "run", "start:prod"]