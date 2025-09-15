# Railway-compatible Dockerfile with build verification
FROM node:20-alpine

WORKDIR /app

# Copy package files and npm configuration
COPY package*.json ./
COPY .npmrc ./

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Build the application with verification
RUN npm run build && \
    echo "Build completed. Checking dist directory:" && \
    ls -la dist/ && \
    echo "Verifying main.js exists:" && \
    test -f dist/main.js && \
    echo "✅ Build successful - main.js found"

# Start the application
CMD ["npm", "run", "start:prod"]