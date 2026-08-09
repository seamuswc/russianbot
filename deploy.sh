#!/bin/bash

# Russian Learning Bot Deployment Script
# Runs on the same droplet as riansi (Thai bot).
# Usage: ./deploy.sh [server_ip]

SERVER_IP=${1:-"68.183.185.81"}
APP_DIR="/opt/russian-learning-bot"
SERVICE_NAME="russian-learning-bot"
PORT=3002

echo "🚀 Deploying Russian Learning Bot to $SERVER_IP (alongside Thai bot)"
echo "📁 App dir: $APP_DIR"
echo "🔌 Port: $PORT"

# Create deployment package
echo "📦 Creating deployment package..."
tar -czf russian-learning-bot.tar.gz \
  --exclude=node_modules \
  --exclude=.git \
  --exclude=data \
  --exclude=logs \
  --exclude=*.log \
  src/ public/ package.json .env.example

# Upload to server
echo "📤 Uploading to server..."
scp russian-learning-bot.tar.gz root@$SERVER_IP:/tmp/

# Deploy on server
echo "🔧 Deploying on server..."
ssh root@$SERVER_IP << EOF
  set -e
  APP_DIR="$APP_DIR"
  SERVICE_NAME="$SERVICE_NAME"
  PORT="$PORT"

  mkdir -p \$APP_DIR
  cd \$APP_DIR

  tar -xzf /tmp/russian-learning-bot.tar.gz
  npm install --production
  mkdir -p data logs

  if [ -f .env ]; then
    echo "📋 Existing .env kept"
    # Ensure PORT is 3002 so we don't collide with Thai bot on 3000
    if grep -q '^PORT=' .env; then
      sed -i 's/^PORT=.*/PORT='"\$PORT"'/' .env
    else
      echo "PORT=\$PORT" >> .env
    fi
  else
    echo "📋 Creating .env (reuse DeepSeek from Thai bot if present)..."
    DEEPSEEK_VAL=""
    if [ -f /opt/thai-learning-bot/.env ]; then
      DEEPSEEK_VAL=\$(grep '^DEEPSEEK_API_KEY=' /opt/thai-learning-bot/.env | cut -d= -f2- || true)
    fi
    cat > .env << EOL
# Telegram Bot Configuration
TELEGRAM_BOT_TOKEN=your-telegram-bot-token
ADMIN_TELEGRAM_ID=

# DeepSeek API
DEEPSEEK_API_KEY=\${DEEPSEEK_VAL}

# Database
DATABASE_PATH=./data/bot.db

# Server (Thai bot uses 3000)
PORT=\$PORT
NODE_ENV=production

# Timezone
TIMEZONE=Europe/Moscow
EOL
    # Expand DeepSeek into file properly
    if [ -n "\$DEEPSEEK_VAL" ]; then
      sed -i "s|^DEEPSEEK_API_KEY=.*|DEEPSEEK_API_KEY=\$DEEPSEEK_VAL|" .env
      echo "✅ Copied DEEPSEEK_API_KEY from Thai bot"
    fi
    echo "⚠️  Set TELEGRAM_BOT_TOKEN (and optional ADMIN_TELEGRAM_ID) in \$APP_DIR/.env"
  fi

  cat > /etc/systemd/system/\$SERVICE_NAME.service << EOL
[Unit]
Description=Russian Learning Bot
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=\$APP_DIR
ExecStart=/usr/bin/node src/index.js
Restart=always
RestartSec=10
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
EOL

  # Only restart THIS service — do not kill Thai bot / other node apps
  systemctl daemon-reload
  systemctl enable \$SERVICE_NAME
  systemctl restart \$SERVICE_NAME
  sleep 3
  systemctl status \$SERVICE_NAME --no-pager || true

  echo "✅ Russian bot deployment step done"
  echo "📊 Service: \$(systemctl is-active \$SERVICE_NAME)"
  echo "📝 Logs: journalctl -u \$SERVICE_NAME -f"
EOF

rm -f russian-learning-bot.tar.gz

echo "🎉 Deploy finished"
echo "🌐 Health: http://$SERVER_IP:$PORT/health"
echo "📱 Ensure TELEGRAM_BOT_TOKEN is set in /opt/russian-learning-bot/.env"
echo "🌍 Point dailyrussian.xyz DNS A record to $SERVER_IP (currently may still point elsewhere)"
