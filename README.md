# Russian Learning Telegram Bot

Free Telegram bot that helps English speakers learn Russian through sentences every 6 hours.

**Bot:** [@DailyStudyRussianBot](https://t.me/DailyStudyRussianBot)  
**Site:** [dailyrussian.xyz](https://dailyrussian.xyz)

## Features

- Free Russian lessons every 6 hours (Moscow time) — no paywall
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

```bash
./deploy.sh [server_ip]
```

Default server: `178.128.109.61` → `/opt/russian-learning-bot`
