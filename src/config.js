require('dotenv').config();

module.exports = {
  // Telegram Bot Configuration
  TELEGRAM_BOT_TOKEN: process.env.TELEGRAM_BOT_TOKEN,
  // Your Telegram user/chat id — gets a count ping after each scheduled send
  ADMIN_TELEGRAM_ID: process.env.ADMIN_TELEGRAM_ID
    ? parseInt(process.env.ADMIN_TELEGRAM_ID, 10)
    : null,

  // DeepSeek API
  DEEPSEEK_API_KEY: process.env.DEEPSEEK_API_KEY,
  DEEPSEEK_API_URL: 'https://api.deepseek.com/v1/chat/completions',

  // Database
  DATABASE_PATH: process.env.DATABASE_PATH || './data/bot.db',

  // Server
  PORT: process.env.PORT || 3000,
  NODE_ENV: process.env.NODE_ENV || 'development',

  // Timezone
  TIMEZONE: process.env.TIMEZONE || 'Europe/Moscow',

  // Difficulty levels
  DIFFICULTY_LEVELS: {
    1: { name: 'Beginner', description: 'very basic Russian, simple greetings, basic words' },
    2: { name: 'Elementary', description: 'simple sentences, present tense' },
    3: { name: 'Intermediate', description: 'past/future tense, cases introduction' },
    4: { name: 'Advanced', description: 'complex sentences, all cases' },
    5: { name: 'Expert', description: 'complex grammar, idioms, literary Russian' }
  },

  // Message schedule (every 6 hours)
  DAILY_MESSAGE_CRON: '0 */6 * * *', // 00:00, 06:00, 12:00, 18:00 Moscow time

  // Grading thresholds
  GRADING: {
    EXCELLENT: 90,
    GOOD: 70,
    FAIR: 50,
    POOR: 30
  }
};
