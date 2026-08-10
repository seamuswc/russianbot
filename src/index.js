const express = require('express');
const path = require('path');
const fs = require('fs');
const TelegramBotHandler = require('./telegramBot');
const Scheduler = require('./scheduler');
const messageQueue = require('./messageQueue');
const config = require('./config');

class RussianLearningBot {
  constructor() {
    this.app = express();
    this.telegramBot = new TelegramBotHandler();

    messageQueue.setBot(this.telegramBot.bot);

    this.scheduler = new Scheduler(this.telegramBot);
    this.setupExpress();
  }

  setupExpress() {
    this.app.use(express.json());
    this.app.use(express.urlencoded({ extended: true }));
    this.app.set('trust proxy', true);
    this.app.use(express.static(path.join(__dirname, '..', 'public')));

    this.app.get('/health', (req, res) => {
      const queueStatus = messageQueue.getStatus();

      res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        timezone: config.TIMEZONE,
        messageQueue: queueStatus
      });
    });

    this.app.get('/', (req, res) => {
      res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
    });

    this.app.post('/api/contact', (req, res) => {
      this.handleContactForm(req, res);
    });

    this.app.listen(config.PORT, () => {
      console.log(`🚀 Server running on port ${config.PORT}`);
      console.log(`🌍 Timezone: ${config.TIMEZONE}`);
      console.log(`📅 Messages scheduled daily at 11:00 Tokyo (free for all users)`);
    });
  }

  startServices() {
    console.log('🚀 Background services started');
  }

  async handleContactForm(req, res) {
    try {
      const { message } = req.body;

      if (!message || !message.trim()) {
        return res.status(400).json({ error: 'Message is required' });
      }

      const logsDir = path.join(__dirname, '..', 'logs');
      if (!fs.existsSync(logsDir)) {
        fs.mkdirSync(logsDir, { recursive: true });
      }

      const logFile = path.join(logsDir, 'contact-form.log');
      const timestamp = new Date().toISOString();
      const ip = req.ip || req.connection.remoteAddress || 'unknown';
      const logEntry = `\n=== Contact Form Submission ===\nTimestamp: ${timestamp}\nIP: ${ip}\nMessage:\n${message}\n${'='.repeat(50)}\n`;

      fs.appendFileSync(logFile, logEntry, 'utf8');
      console.log('📝 Contact form message logged successfully');

      res.json({
        status: 'success',
        message: 'Message sent successfully'
      });
    } catch (error) {
      console.error('❌ Contact form error:', error);
      res.status(500).json({ error: 'Failed to save message. Please try again later.' });
    }
  }
}

const bot = new RussianLearningBot();

process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down Russian Learning Bot...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Shutting down Russian Learning Bot...');
  process.exit(0);
});
