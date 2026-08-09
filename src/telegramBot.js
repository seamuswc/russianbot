const TelegramBot = require('node-telegram-bot-api');
const database = require('./database');
const config = require('./config');
const deepseekService = require('./services/deepseek');

class TelegramBotHandler {
  constructor(options = {}) {
    try {
      console.log('🚀 Initializing Russian Learning Bot...');
      console.log('🔑 Bot token present:', !!config.TELEGRAM_BOT_TOKEN);
      console.log('🔑 Bot token length:', config.TELEGRAM_BOT_TOKEN ? config.TELEGRAM_BOT_TOKEN.length : 0);

      const polling = options.polling !== false;
      console.log('📡 Polling enabled:', polling);

      this.bot = new TelegramBot(config.TELEGRAM_BOT_TOKEN, { polling });

      this.processedCallbacks = new Set();
      this.processedMessages = new Set();

      this.setupEventHandlers();
      console.log('🤖 Russian Learning Bot started successfully');
    } catch (error) {
      console.error('❌ Failed to initialize bot:', error);
      console.error('❌ Error details:', error.message);
      console.error('❌ Error stack:', error.stack);
      throw error;
    }
  }

  createKeyboard(buttons) {
    return {
      reply_markup: {
        inline_keyboard: buttons
      }
    };
  }

  mainMenuKeyboard() {
    return this.createKeyboard([
      [
        { text: '📚 Help', callback_data: 'help' },
        { text: '📊 Status', callback_data: 'status' }
      ],
      [
        { text: '⚙️ Difficulty', callback_data: 'settings' }
      ]
    ]);
  }

  welcomeMessage() {
    return `🇷🇺 Welcome to Russian Learning Bot!

📖 Free Russian lessons every 6 hours — no payment needed.
🎯 Choose your difficulty level and start learning!`;
  }

  setupEventHandlers() {
    console.log('🔧 Setting up event handlers...');

    this.bot.on('callback_query', (callbackQuery) => {
      const callbackId = `${callbackQuery.id}_${callbackQuery.data}`;

      if (this.processedCallbacks.has(callbackId)) {
        console.log(`⚠️ Duplicate callback ignored: ${callbackQuery.data}`);
        return;
      }

      this.processedCallbacks.add(callbackId);
      console.log(`🔘 Callback query received: ${callbackQuery.data} from user ${callbackQuery.from.id}`);

      this.handleCallbackQuery(callbackQuery).catch(error => {
        console.error('❌ Error in callback query handler:', error);
        console.error('❌ Callback data:', callbackQuery.data);
        console.error('❌ User ID:', callbackQuery.from.id);
        this.processedCallbacks.delete(callbackId);
      });
    });

    this.bot.onText(/\/start/, (msg) => this.handleStart(msg));
    this.bot.onText(/\/help/, (msg) => this.handleHelp(msg.chat.id));

    this.bot.on('message', (msg) => {
      if (msg.text && msg.text.startsWith('/')) {
        return;
      }

      if (msg.from.is_bot) {
        return;
      }

      if (msg.text) {
        const messageId = `${msg.message_id}_${msg.from.id}`;

        if (this.processedMessages.has(messageId)) {
          console.log(`⚠️ Duplicate message ignored: ${msg.text.substring(0, 50)}...`);
          return;
        }

        this.processedMessages.add(messageId);
        this.handleMessage(msg);
      }
    });
  }

  async handleStart(msg) {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const displayName = msg.from.first_name || msg.from.username || 'User';

    try {
      await database.createUser(userId.toString(), displayName);
      await this.bot.sendMessage(chatId, this.welcomeMessage(), this.mainMenuKeyboard());
      await this.sendImmediateSentence(chatId, userId);
    } catch (error) {
      console.error('❌ Error in handleStart:', error);
      await this.bot.sendMessage(chatId, '❌ Sorry, something went wrong. Please try again.');
    }
  }

  async handleHelp(chatId) {
    const helpMessage = `🇷🇺 Russian Learning Bot Help

📖 How it works:
• Free Russian sentences every 6 hours (4 times per day)
• Practice with authentic Russian content
• No subscription or payment required

🎯 Difficulty: 5 levels (Beginner to Expert)

🎮 Use the buttons below to navigate!`;

    const keyboard = this.createKeyboard([
      [{ text: '🏠 Main Menu', callback_data: 'back_to_main' }]
    ]);

    await this.bot.sendMessage(chatId, helpMessage, keyboard);
  }

  async handleCallbackQuery(callbackQuery) {
    const chatId = callbackQuery.message.chat.id;
    const userId = callbackQuery.from.id;
    const data = callbackQuery.data;

    console.log(`🔘 Button clicked: ${data} by user ${userId} in chat ${chatId}`);

    try {
      await this.bot.answerCallbackQuery(callbackQuery.id);

      switch (data) {
        case 'help':
          await this.handleHelp(chatId);
          break;
        case 'status':
          await this.handleStatus(chatId, userId);
          break;
        case 'settings':
          await this.handleSettings(chatId, userId);
          break;
        case 'back_to_main':
          await this.bot.sendMessage(chatId, this.welcomeMessage(), this.mainMenuKeyboard());
          break;
        default:
          if (data.startsWith('level_')) {
            const level = parseInt(data.split('_')[1]);
            await this.handleSetLevel(chatId, userId, level);
          }
          break;
      }
    } catch (error) {
      console.error('❌ Error in handleCallbackQuery:', error);
      await this.bot.sendMessage(chatId, '❌ Sorry, something went wrong. Please try again.');
    }
  }

  async handleStatus(chatId, userId) {
    console.log(`📊 Handling status request for user ${userId}`);

    try {
      const user = await database.getUser(userId.toString());
      if (!user) {
        await this.bot.sendMessage(chatId, '❌ User not found. Please use /start first.');
        return;
      }

      const levelName = config.DIFFICULTY_LEVELS[user.difficulty_level]?.name || 'Unknown';

      const statusMessage =
        `📊 Your Status\n\n` +
        `✅ Free access — lessons are always on\n` +
        `Current Level: ${user.difficulty_level} (${levelName})\n\n` +
        `Your lessons are sent every 6 hours (4 times per day).`;

      const keyboard = this.createKeyboard([
        [{ text: '🏠 Main Menu', callback_data: 'back_to_main' }]
      ]);

      await this.bot.sendMessage(chatId, statusMessage, keyboard);
    } catch (error) {
      console.error('❌ Error in handleStatus:', error);
      await this.bot.sendMessage(chatId, '❌ Sorry, something went wrong. Please try again.');
    }
  }

  async handleSettings(chatId, userId) {
    console.log(`⚙️ Handling settings request for user ${userId}`);

    try {
      const user = await database.getUser(userId.toString());
      if (!user) {
        await this.bot.sendMessage(chatId, '❌ User not found. Please use /start first.');
        return;
      }

      const levelName = config.DIFFICULTY_LEVELS[user.difficulty_level]?.name || 'Unknown';

      let settingsMessage = `⚙️ Settings\n\n`;
      settingsMessage += `Current Difficulty Level: ${user.difficulty_level} (${levelName})\n\n`;
      settingsMessage += `Choose your difficulty level:\n`;

      Object.entries(config.DIFFICULTY_LEVELS).forEach(([level, info]) => {
        settingsMessage += `• Level ${level}: ${info.name} (${info.description})\n`;
      });

      const keyboard = this.createKeyboard([
        [
          { text: 'Level 1', callback_data: 'level_1' },
          { text: 'Level 2', callback_data: 'level_2' },
          { text: 'Level 3', callback_data: 'level_3' }
        ],
        [
          { text: 'Level 4', callback_data: 'level_4' },
          { text: 'Level 5', callback_data: 'level_5' }
        ],
        [{ text: '🏠 Main Menu', callback_data: 'back_to_main' }]
      ]);

      await this.bot.sendMessage(chatId, settingsMessage, keyboard);
    } catch (error) {
      console.error('❌ Error in handleSettings:', error);
      await this.bot.sendMessage(chatId, '❌ Sorry, something went wrong. Please try again.');
    }
  }

  async handleSetLevel(chatId, userId, level) {
    console.log(`🎯 Handling level change request: ${level} for user ${userId}`);

    try {
      await database.updateUserLevel(userId.toString(), level);
      const updatedUser = await database.getUser(userId.toString());
      console.log(`👤 User after update:`, updatedUser);

      const levelName = config.DIFFICULTY_LEVELS[level]?.name || 'Unknown';
      const confirmMessage = `✅ Difficulty updated to Level ${level}!\n\nYour lessons will now be at ${levelName} level.`;

      const keyboard = this.createKeyboard([
        [{ text: '🏠 Main Menu', callback_data: 'back_to_main' }]
      ]);

      await this.bot.sendMessage(chatId, confirmMessage, keyboard);
    } catch (error) {
      console.error('❌ Error in handleSetLevel:', error);
      await this.bot.sendMessage(chatId, '❌ Sorry, something went wrong. Please try again.');
    }
  }

  async handleMessage(msg) {
    console.log(`📝 User text message: ${msg.text}`);

    const hasCyrillicScript = /[\u0400-\u04FF]/.test(msg.text);

    if (hasCyrillicScript) {
      console.log('🇷🇺 User typed in Russian - not responding');
      return;
    }

    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const displayName = msg.from.first_name || msg.from.username || 'User';

    try {
      await database.createUser(userId.toString(), displayName);
      await this.bot.sendMessage(chatId, this.welcomeMessage(), this.mainMenuKeyboard());
    } catch (error) {
      console.error('❌ Error in handleMessage:', error);
      await this.bot.sendMessage(chatId, '❌ Sorry, something went wrong. Please try again.');
    }
  }

  async sendImmediateSentence(chatId, userId) {
    try {
      const user = await database.getUser(userId.toString());
      if (!user) {
        console.error('❌ User not found for immediate sentence');
        return;
      }

      const sentenceData = await this.generateSentence(user.difficulty_level);
      await this.saveSentence(sentenceData, user.difficulty_level);

      let wordBreakdown = '';
      if (sentenceData.word_breakdown && sentenceData.word_breakdown.length > 0) {
        wordBreakdown = '\n\n📚 Word Breakdown:\n';
        for (const word of sentenceData.word_breakdown) {
          if (typeof word === 'object' && word.word && word.meaning) {
            const pronunciation = word.pronunciation ? word.pronunciation.trim().toLowerCase() : '';
            wordBreakdown += `${word.word} - ${word.meaning}${pronunciation ? ` - ${pronunciation}` : ''}\n`;
          } else if (typeof word === 'string') {
            wordBreakdown += `${word}\n`;
          }
        }
      }

      const message = `🇷🇺 Your First Russian Lesson

📝 Russian Sentence:
${sentenceData.russian_text}

🔤 English Translation:
${sentenceData.english_translation}

Try typing the sentence back in Russian!${wordBreakdown}

Practice writing the Russian sentence!`;

      console.log(`📤 Sending immediate lesson to user ${userId}`);
      await this.bot.sendMessage(chatId, message);
      console.log(`✅ Immediate sentence sent to user ${userId}`);
    } catch (error) {
      console.error('❌ Error in sendImmediateSentence:', error);
    }
  }

  async generateSentence(difficultyLevel) {
    try {
      return await deepseekService.generateRussianSentence(difficultyLevel);
    } catch (error) {
      console.error('❌ Error generating sentence:', error);
      const fallbackSentences = {
        1: {
          russian_text: 'Добрый день! Как дела?',
          english_translation: 'Good day! How are you?',
          word_breakdown: [
            { word: 'Добрый', meaning: 'good', pronunciation: 'dobryy' },
            { word: 'день', meaning: 'day', pronunciation: 'den\'' },
            { word: 'Как', meaning: 'how', pronunciation: 'kak' },
            { word: 'дела', meaning: 'things/matters', pronunciation: 'dela' }
          ]
        },
        2: {
          russian_text: 'Я учу русский язык каждый день',
          english_translation: 'I study Russian language every day',
          word_breakdown: [
            { word: 'Я', meaning: 'I', pronunciation: 'ya' },
            { word: 'учу', meaning: 'study/learn', pronunciation: 'uchu' },
            { word: 'русский', meaning: 'Russian', pronunciation: 'russkiy' },
            { word: 'язык', meaning: 'language', pronunciation: 'yazyk' },
            { word: 'каждый', meaning: 'every', pronunciation: 'kazhdyy' },
            { word: 'день', meaning: 'day', pronunciation: 'den\'' }
          ]
        },
        3: {
          russian_text: 'Вчера я ходил в театр с друзьями',
          english_translation: 'Yesterday I went to the theater with friends',
          word_breakdown: [
            { word: 'Вчера', meaning: 'yesterday', pronunciation: 'vchera' },
            { word: 'я', meaning: 'I', pronunciation: 'ya' },
            { word: 'ходил', meaning: 'went (past tense, masculine)', pronunciation: 'khodil' },
            { word: 'в', meaning: 'to/in', pronunciation: 'v' },
            { word: 'театр', meaning: 'theater', pronunciation: 'teatr' },
            { word: 'с', meaning: 'with', pronunciation: 's' },
            { word: 'друзьями', meaning: 'friends (instrumental case)', pronunciation: 'druz\'yami' }
          ]
        },
        4: {
          russian_text: 'Если бы я знал русский лучше, я бы читал классическую литературу',
          english_translation: 'If I knew Russian better, I would read classical literature',
          word_breakdown: [
            { word: 'Если', meaning: 'if', pronunciation: 'yesli' },
            { word: 'бы', meaning: 'would (conditional)', pronunciation: 'by' },
            { word: 'я', meaning: 'I', pronunciation: 'ya' },
            { word: 'знал', meaning: 'knew (past tense)', pronunciation: 'znal' },
            { word: 'русский', meaning: 'Russian', pronunciation: 'russkiy' },
            { word: 'лучше', meaning: 'better', pronunciation: 'luchshe' },
            { word: 'читал', meaning: 'would read (past tense, masculine)', pronunciation: 'chital' },
            { word: 'классическую', meaning: 'classical (accusative, feminine)', pronunciation: 'klassicheskuyu' },
            { word: 'литературу', meaning: 'literature (accusative)', pronunciation: 'literaturu' }
          ]
        },
        5: {
          russian_text: 'Несмотря на то, что он изучал русский язык на протяжении многих лет, ему всё ещё трудно понимать сложные тексты',
          english_translation: 'Despite the fact that he studied Russian for many years, it is still difficult for him to understand complex texts',
          word_breakdown: [
            { word: 'Несмотря', meaning: 'despite', pronunciation: 'nesmotrya' },
            { word: 'на', meaning: 'on', pronunciation: 'na' },
            { word: 'то', meaning: 'that', pronunciation: 'to' },
            { word: 'что', meaning: 'that', pronunciation: 'chto' },
            { word: 'он', meaning: 'he', pronunciation: 'on' },
            { word: 'изучал', meaning: 'studied (past tense)', pronunciation: 'izuchal' },
            { word: 'русский', meaning: 'Russian', pronunciation: 'russkiy' },
            { word: 'язык', meaning: 'language', pronunciation: 'yazyk' }
          ]
        }
      };
      return fallbackSentences[difficultyLevel] || fallbackSentences[1];
    }
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
}

module.exports = TelegramBotHandler;
