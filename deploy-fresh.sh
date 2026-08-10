#!/bin/bash

# Russian Learning Bot - Fresh Deployment Script
# This script wipes the server and deploys fresh

SERVER_IP=${1:-"68.183.185.81"}
APP_DIR="/opt/russian-learning-bot"
SERVICE_NAME="russian-learning-bot"

echo "🧹 Wiping server and deploying fresh Russian Learning Bot to $SERVER_IP"
echo "⚠️  This will completely remove the existing installation!"

# Upload files directly to server
echo "🚀 Uploading files and deploying fresh installation..."

# Upload files directly
scp -r src root@$SERVER_IP:/tmp/
scp -r public root@$SERVER_IP:/tmp/
scp package.json root@$SERVER_IP:/tmp/
scp .env.example root@$SERVER_IP:/tmp/
scp README.md root@$SERVER_IP:/tmp/
scp CRITICAL_FIXES_SUMMARY.md root@$SERVER_IP:/tmp/

# Deploy on server
ssh root@$SERVER_IP << EOF
  echo "🧹 Stopping and removing existing installation..."
  
  # Stop and disable service
  systemctl stop $SERVICE_NAME 2>/dev/null || true
  systemctl disable $SERVICE_NAME 2>/dev/null || true
  
  # Remove old installation
  rm -rf $APP_DIR
  
  # Remove systemd service
  rm -f /etc/systemd/system/$SERVICE_NAME.service
  
  # Reload systemd
  systemctl daemon-reload
  
  echo "✅ Server wiped clean"
  
  # Create fresh app directory
  mkdir -p $APP_DIR
  cd $APP_DIR
  
  # Copy fresh files
  cp -r /tmp/src $APP_DIR/
  cp -r /tmp/public $APP_DIR/
  cp /tmp/package.json $APP_DIR/
  cp /tmp/.env.example $APP_DIR/
  cp /tmp/README.md $APP_DIR/
  cp /tmp/CRITICAL_FIXES_SUMMARY.md $APP_DIR/
  
  # Install Node.js if not already installed
  if ! command -v node &> /dev/null; then
    echo "📦 Installing Node.js..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt-get install -y nodejs
  else
    echo "✅ Node.js already installed: \$(node --version)"
  fi
  
  # Install dependencies
  echo "📦 Installing npm dependencies..."
  npm install --production
  
  # Create data directory
  mkdir -p data
  
  # Create .env file with actual values (not copied from git)
  echo "📋 Creating .env file on server..."
  cat > .env << 'EOL'
# Telegram Bot Configuration
TELEGRAM_BOT_TOKEN=your-telegram-bot-token
ADMIN_TELEGRAM_ID=your-telegram-user-id

# DeepSeek API
DEEPSEEK_API_KEY=your-deepseek-api-key

# Database
DATABASE_PATH=./data/bot.db

# Server
PORT=3000
NODE_ENV=production

# Timezone
TIMEZONE=Asia/Tokyo
EOL
  echo "✅ .env file created — add TELEGRAM_BOT_TOKEN and DEEPSEEK_API_KEY on the server"
  
  # Create systemd service
  cat > /etc/systemd/system/$SERVICE_NAME.service << EOL
[Unit]
Description=Russian Learning Bot
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=$APP_DIR
ExecStart=/usr/bin/node src/index.js
Restart=always
RestartSec=10
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
EOL

  # Install and configure nginx
  echo "🌐 Installing nginx..."
  apt-get update -qq
  apt-get install -y nginx certbot python3-certbot-nginx
  
  # Create nginx configuration for dailyrussian.xyz (HTTP first for Let's Encrypt)
  echo "📝 Configuring nginx..."
  cat > /etc/nginx/sites-available/dailyrussian.xyz << 'NGINX_EOF'
server {
    listen 80;
    server_name dailyrussian.xyz www.dailyrussian.xyz;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
NGINX_EOF
  
  # Enable site
  ln -sf /etc/nginx/sites-available/dailyrussian.xyz /etc/nginx/sites-enabled/
  rm -f /etc/nginx/sites-enabled/default
  
  # Test nginx configuration
  nginx -t
  
  # Enable and start nginx
  systemctl enable nginx
  systemctl restart nginx
  
  # Wait for nginx to be fully ready
  sleep 2
  
  # Install SSL certificate with Let's Encrypt
  echo "🔒 Setting up SSL certificate..."
  certbot --nginx -d dailyrussian.xyz -d www.dailyrussian.xyz --non-interactive --agree-tos --email admin@dailyrussian.xyz --redirect || {
    echo "⚠️ SSL certificate installation failed. You can run it manually later with:"
    echo "   certbot --nginx -d dailyrussian.xyz -d www.dailyrussian.xyz"
  }
  
  # Reload systemd and start service
  systemctl daemon-reload
  systemctl enable $SERVICE_NAME
  systemctl start $SERVICE_NAME
  
  # Wait a moment for startup
  sleep 3
  
  # Check status
  echo "📊 Service status:"
  systemctl status $SERVICE_NAME --no-pager
  
  echo "📊 Nginx status:"
  systemctl status nginx --no-pager | head -10
  
  # Check if running
  if systemctl is-active --quiet $SERVICE_NAME; then
    echo "✅ Bot service started successfully!"
  else
    echo "❌ Bot service failed to start"
    echo "📝 Recent logs:"
    journalctl -u $SERVICE_NAME --no-pager -n 20
  fi
  
  if systemctl is-active --quiet nginx; then
    echo "✅ Nginx started successfully!"
  else
    echo "❌ Nginx failed to start"
  fi
  
  echo "🎉 Fresh deployment completed!"
EOF

# Clean up
ssh root@$SERVER_IP "rm -rf /tmp/src /tmp/package.json /tmp/.env.example /tmp/README.md /tmp/CRITICAL_FIXES_SUMMARY.md"

echo ""
echo "🎉 Fresh deployment completed!"
echo "🌐 Health check: http://$SERVER_IP:3000/health"
echo "📱 Bot should be running on Telegram"
echo "📝 To check logs: ssh root@$SERVER_IP 'journalctl -u $SERVICE_NAME -f'"
