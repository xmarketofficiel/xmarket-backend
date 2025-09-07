# Improved PM2 ecosystem configuration script
cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [{
    name: 'xmarket-backend',
    script: 'dist/main.js',
    instances: 1,
    exec_mode: 'cluster',
    
    // Environment variables
    env: {
      NODE_ENV: 'production',
      PORT: 3001
    },
    
    // Production environment (can be activated with --env production)
    env_production: {
      NODE_ENV: 'production',
      PORT: 3001
    },
    
    // Logging configuration
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true,
    
    // Process management
    autorestart: true,
    max_restarts: 10,
    min_uptime: '10s',
    max_memory_restart: '1G',
    
    // Graceful shutdown and startup
    kill_timeout: 5000,
    listen_timeout: 8000,
    shutdown_with_message: true,
    wait_ready: true,
    
    // Health monitoring
    health_check_grace_period: 3000,
    
    // Additional production optimizations
    node_args: '--max-old-space-size=1024'
  }]
};
EOF

# Create logs directory if it doesn't exist
mkdir -p logs

echo "✅ PM2 ecosystem configuration created successfully!"
echo "📁 Logs directory created at: ./logs/"
echo ""
echo "🚀 Usage:"
echo "  pm2 start ecosystem.config.js"
echo "  pm2 start ecosystem.config.js --env production"
echo "  pm2 restart xmarket-backend"
echo "  pm2 logs xmarket-backend"
echo "  pm2 monit"
