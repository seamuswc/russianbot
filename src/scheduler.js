const cron = require('node-cron');
const database = require('./database');
const deepseekService = require('./services/deepseek');
const messageQueue = require('./messageQueue');
const config = require('./config');

class Scheduler {
  constructor(telegramBot) {
    this.bot = telegramBot;
    this.setupDailyMessages();
  }

  setupDailyMessages() {
    // Schedule messages every 6 hours
    cron.schedule(config.DAILY_MESSAGE_CRON, async () => {
      console.log('📅 6-hour message scheduler triggered');
      await this.sendDailyMessages();
    }, {
      timezone: config.TIMEZONE
    });

    console.log('⏰ 6-hour message scheduler set (every 6 hours)');
  }

  async sendDailyMessages() {
    try {
      // Free bot: send to every registered user (no subscription gate)
      const users = await this.getAllUsers();

      console.log(`📤 Queuing messages for ${users.length} users`);

      const difficultySentences = {};
      for (let level = 1; level <= 5; level++) {
        try {
          difficultySentences[level] = await deepseekService.generateRussianSentence(level);
          console.log(`✅ Generated sentence for difficulty ${level}`);
        } catch (error) {
          console.error(`❌ Error generating sentence for difficulty ${level}:`, error);
        }
      }

      let queued = 0;
      for (const user of users) {
        try {
          const sentenceData = difficultySentences[user.difficulty_level];
          if (sentenceData) {
            await this.saveSentence(sentenceData, user.difficulty_level);

            const message = this.createDailyMessage(sentenceData, users.length);
            const chatId = parseInt(user.telegram_user_id, 10);
            if (isNaN(chatId)) {
              console.error(`❌ Invalid chatId for user ${user.telegram_user_id}`);
              continue;
            }
            messageQueue.addMessage(chatId, message);
            queued += 1;
          } else {
            console.error(`❌ No sentence data for difficulty level ${user.difficulty_level}`);
          }
        } catch (error) {
          console.error(`❌ Error queuing message for user ${user.telegram_user_id}:`, error);
        }
      }

      console.log(`📋 Queued ${queued} messages for ${users.length} registered users`);
      await this.notifyAdminUserCount(users.length, queued);
    } catch (error) {
      console.error('❌ Error in sendDailyMessages:', error);
    }
  }

  async notifyAdminUserCount(registeredCount, queuedCount) {
    const adminId = config.ADMIN_TELEGRAM_ID;
    const summary =
      `📊 Russian bot send complete\n\n` +
      `Registered users: ${registeredCount}\n` +
      `Lessons queued: ${queuedCount}` +
      (registeredCount === 0 ? '\n\n(No users yet.)' : '');

    console.log(summary.replace(/\n/g, ' | '));

    if (!adminId || Number.isNaN(adminId)) {
      console.warn('⚠️ ADMIN_TELEGRAM_ID not set — skipping Telegram admin ping');
      return;
    }

    try {
      const telegram = this.bot?.bot;
      if (!telegram) {
        console.warn('⚠️ Telegram bot not ready for admin ping');
        return;
      }
      await telegram.sendMessage(adminId, summary);
    } catch (error) {
      console.error('❌ Failed to notify admin of user count:', error.message);
    }
  }

  async getAllUsers() {
    return new Promise((resolve, reject) => {
      const query = `SELECT * FROM users`;

      database.db.all(query, [], (err, rows) => {
        if (err) {
          console.error('❌ Error getting users:', err);
          reject(err);
        } else {
          resolve(rows || []);
        }
      });
    });
  }

  createDailyMessage(sentenceData, subscriberCount = 0) {
    // Create word breakdown
    let wordBreakdown = '';
    if (sentenceData.word_breakdown && sentenceData.word_breakdown.length > 0) {
      wordBreakdown = '\n\n📚 Word Breakdown:\n';
      for (const word of sentenceData.word_breakdown) {
        if (typeof word === 'object' && word.word && word.meaning) {
          const pronunciation = word.pronunciation ? word.pronunciation.trim().toLowerCase() : '';
          wordBreakdown += `${word.word} - ${word.meaning} - ${pronunciation}\n`;
        } else if (typeof word === 'string') {
          wordBreakdown += `${word}\n`;
        }
      }
    }

    const peopleLabel = subscriberCount === 1 ? 'person' : 'people';
    const subscribeLine =
      subscriberCount > 0
        ? `\n\n👥 ${subscriberCount} ${peopleLabel} subscribed`
        : '';

    return `🇷🇺 Russian Lesson

📝 Russian Sentence:
${sentenceData.russian_text}

🔤 English Translation:
${sentenceData.english_translation}

Try typing the sentence back in Russian!${wordBreakdown}

Practice writing the Russian sentence!${subscribeLine}`;
  }

  async saveSentence(sentenceData, difficultyLevel) {
    return new Promise((resolve, reject) => {
      const query = `
        INSERT INTO sentences (russian_text, english_translation, difficulty_level, word_breakdown)
        VALUES (?, ?, ?, ?)
      `;
      
      const wordBreakdown = JSON.stringify(sentenceData.word_breakdown || []);
      
      database.db.run(query, [
        sentenceData.russian_text,
        sentenceData.english_translation,
        difficultyLevel,
        wordBreakdown
      ], function(err) {
        if (err) {
          console.error('❌ Error saving sentence:', err);
          reject(err);
        } else {
          resolve(this.lastID);
        }
      });
    });
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

module.exports = Scheduler;
