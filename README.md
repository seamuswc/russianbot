# Russian Learning Telegram Bot

Free Telegram bot that helps English speakers learn Russian through one sentence a day at 11:00 Tokyo time.

**Bot:** [@DailyStudyRussianBot](https://t.me/DailyStudyRussianBot)  
**Site:** [dailyrussian.xyz](https://dailyrussian.xyz)

## Features

- Free Russian lessons daily at 11:00 Tokyo time — no paywall
- 5 difficulty levels
- English translations + word breakdowns with pronunciation
- First lesson on `/start`

## Stack

- Telegram Bot (node-telegram-bot-api)
- Node.js + Express
- SQLite
- DeepSeek API for sentence generation
- node-cron scheduler

## Quick Start

```bash
npm install
cp .env.example .env
# Edit .env with TELEGRAM_BOT_TOKEN and DEEPSEEK_API_KEY
npm start
```

## Deploy

Runs on the **same droplet as riansi** (Thai bot).

```bash
./deploy.sh [server_ip]
```

- Default server: `68.183.185.81`
- App dir: `/opt/russian-learning-bot`
- Port: `3002` (Thai bot uses `3000`)
- systemd: `russian-learning-bot`
