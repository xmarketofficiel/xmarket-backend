#!/bin/bash

# Script to start the backend server in development mode
# This ensures we're in the right directory

cd "$(dirname "$0")"
echo "Starting backend from: $(pwd)"
npm run start:dev
