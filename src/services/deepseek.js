const axios = require('axios');
const config = require('../config');
const database = require('../database');

class DeepSeekService {
  constructor() {
    this.apiKey = config.DEEPSEEK_API_KEY;
    this.apiUrl = config.DEEPSEEK_API_URL;
    this.sentenceCache = {}; // Cache for sentences by difficulty level
    this.lastCacheDate = null; // Track when cache was last updated
  }

  // Check if cache needs to be reset (each hour)
  shouldResetCache() {
    const now = new Date();
    const moscowTime = new Date(now.toLocaleString("en-US", {timeZone: "Europe/Moscow"}));
    const currentHour = moscowTime.getHours();
    const currentHourKey = `${moscowTime.toDateString()}_${currentHour}`;
    
    // Reset cache if we've entered a new hour
    if (this.lastCacheDate !== currentHourKey) {
      console.log('🔄 New hour detected, resetting sentence cache');
      this.sentenceCache = {};
      this.lastCacheDate = currentHourKey;
      return true;
    }
    return false;
  }

  // Get cached sentence or generate new one
  async generateRussianSentence(difficultyLevel, retryCount = 0) {
    // Check if cache needs reset
    this.shouldResetCache();
    
    // Return cached sentence if available
    if (this.sentenceCache[difficultyLevel]) {
      console.log(`📦 Using cached sentence for difficulty ${difficultyLevel}`);
      return this.sentenceCache[difficultyLevel];
    }
    
    console.log(`🔄 Generating new sentence for difficulty ${difficultyLevel}`);
    
    try {
      // Get recent sentences to avoid duplicates
      const recentSentences = await database.getRecentSentences(difficultyLevel, 30);
      const recentRussianTexts = recentSentences.map(s => s.russian_text).filter(Boolean);
      
      let avoidPrompt = '';
      if (recentRussianTexts.length > 0) {
        avoidPrompt = `\n\nCRITICAL: Do NOT generate any of these sentences that were recently used:\n${recentRussianTexts.slice(0, 10).map((text, i) => `${i + 1}. ${text}`).join('\n')}\n\nYou MUST create a completely different sentence with different words, topics, and structure. Do not repeat similar phrases or patterns.`;
      }
      
      const levelInfo = config.DIFFICULTY_LEVELS[difficultyLevel];
      const prompt = `Generate a Russian sentence for language learning at ${levelInfo.name} level (${levelInfo.description}). 
      The sentence should be:
      - In Cyrillic script (Russian alphabet)
      - Include English translation
      - Be appropriate for the difficulty level
      - Completely unique and different from previously generated sentences
      
      For word_breakdown, provide an array of objects with:
      - word: the individual Russian word (break down into separate words, not phrases)
      - meaning: English meaning
      - pronunciation: Russian pronunciation guide (using Latin letters, e.g., "ya", "lyublyu", "yest'", etc.)
      
      IMPORTANT: Break down into individual words. For example:
      - "Я люблю" (I love) should be broken down as "Я" (I) + "люблю" (love)
      - "Меня зовут" (My name is) should be broken down as "Меня" (me) + "зовут" (call)
      - "Хорошая погода" (good weather) should be broken down as "Хорошая" (good) + "погода" (weather)
      
      DO NOT include grammatical information (cases, verb aspects, etc.). Only provide the Russian word, English meaning, and pronunciation.
      
      CRITICAL REQUIREMENTS:
      - Use a completely different topic, vocabulary, and sentence structure
      - Vary the topics: try different activities, places, foods, emotions, weather, etc.
      - Avoid repeating similar sentence patterns or word combinations
      - Be creative and diverse in your sentence generation${avoidPrompt}

      Format the response as JSON with fields: russian_text, english_translation, word_breakdown`;

      const response = await axios.post(this.apiUrl, {
        model: 'deepseek-chat',
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.9, // Increased from 0.7 for more variation
        max_tokens: 1500
      }, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        }
      });

      const content = response.data.choices[0].message.content;
      console.log('🔍 DeepSeek raw response:', content);
      
      try {
        // Clean up the response - remove markdown code blocks
        let cleanContent = content.trim();
        if (cleanContent.startsWith('```json')) {
          cleanContent = cleanContent.replace(/^```json\s*/, '').replace(/\s*```$/, '');
        }
        if (cleanContent.startsWith('```')) {
          cleanContent = cleanContent.replace(/^```\s*/, '').replace(/\s*```$/, '');
        }
        
        console.log('🔍 Cleaned content length:', cleanContent.length);
        console.log('🔍 Cleaned content preview:', cleanContent.substring(0, 200) + '...');
        
        const parsed = JSON.parse(cleanContent);
        console.log('🔍 Parsed JSON successfully');
        console.log('🔍 Russian text:', parsed.russian_text);
        
        // Validate that we have actual Cyrillic text
        if (!parsed.russian_text || parsed.russian_text.trim() === '' || parsed.russian_text.includes('```')) {
          throw new Error('Invalid Russian text in response');
        }
        
        // Validate Cyrillic script
        const hasCyrillic = /[\u0400-\u04FF]/.test(parsed.russian_text);
        if (!hasCyrillic) {
          console.warn('⚠️ Generated text may not contain Cyrillic characters');
        }
        
        // Check for duplicate sentences
        const isDuplicate = recentRussianTexts.some(recentText => 
          recentText.trim().toLowerCase() === parsed.russian_text.trim().toLowerCase()
        );
        
        if (isDuplicate) {
          console.log(`⚠️ Duplicate sentence detected: "${parsed.russian_text}"`);
          if (retryCount < 3) {
            console.log(`🔄 Retrying with different prompt (attempt ${retryCount + 1})...`);
            await new Promise(resolve => setTimeout(resolve, 1000));
            return this.generateRussianSentence(difficultyLevel, retryCount + 1);
          } else {
            console.log(`⚠️ Max retries reached, using sentence despite duplicate check`);
          }
        }
        
        // Add pronunciation if missing and normalize to lowercase
        if (parsed.word_breakdown && Array.isArray(parsed.word_breakdown)) {
          parsed.word_breakdown.forEach(word => {
            if (!word.pronunciation || word.pronunciation.trim() === '') {
              // Simple pronunciation fallback based on common Russian words
              const pronunciationMap = {
                'Я': 'ya',
                'люблю': 'lyublyu',
                'есть': 'yest\'',
                'пиццу': 'pitstsu',
                'Меня': 'menya',
                'зовут': 'zovut',
                'Джон': 'jon',
                'Сегодня': 'sevodnya',
                'хорошая': 'khoroshaya',
                'погода': 'pogoda'
              };
              word.pronunciation = pronunciationMap[word.word] || word.word.toLowerCase();
            } else {
              // Normalize pronunciation to lowercase (AI might return capitalized)
              word.pronunciation = word.pronunciation.trim().toLowerCase();
            }
          });
        }
        
        // Cache the generated sentence
        this.sentenceCache[difficultyLevel] = parsed;
        console.log(`💾 Cached sentence for difficulty ${difficultyLevel}`);
        
        return parsed;
      } catch (parseError) {
        console.error('❌ JSON parsing failed:', parseError.message);
        console.error('❌ Raw content:', content);
        
        throw new Error('Failed to parse AI response');
      }
    } catch (error) {
      console.error(`❌ DeepSeek API error (attempt ${retryCount + 1}):`, error.message);
      
      // Retry logic
      const maxRetries = 3;
      if (retryCount < maxRetries) {
        const baseDelay = 1000; // 1 second base delay
        const delay = baseDelay * Math.pow(2, retryCount); // Exponential backoff
        console.log(`🔄 Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        return this.generateRussianSentence(difficultyLevel, retryCount + 1);
      }
      
      console.error('❌ All DeepSeek attempts failed');
      throw error;
    }
  }
}

module.exports = new DeepSeekService();
