#!/bin/bash

# Script to fix git pull issues on EC2
echo "🔧 Fixing Git configuration on EC2..."

# Go to project directory
cd /home/ubuntu/xmarket-project/backend

# Fetch latest changes
git fetch origin

# Reset to match remote main branch
git reset --hard origin/main

# Set git configuration for future pulls
git config pull.rebase false

# Verify we're on main branch
git checkout main

# Clean any untracked files
git clean -fd

echo "✅ Git configuration fixed!"
echo "📌 Current branch: $(git branch --show-current)"
echo "📌 Latest commit: $(git log --oneline -1)"
