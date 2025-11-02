# Conversion Prompt: English Speakers Learning Russian

Use this prompt with an AI assistant to convert this Thai learning bot into a bot that helps English speakers learn Russian.

## Conversion Prompt

```
Convert this Thai language learning Telegram bot into a Russian language learning bot for English speakers.

CHANGES NEEDED:

1. LANGUAGE TARGET:
   - Change from: Thai lessons for English speakers
   - Change to: Russian lessons for English speakers

2. ALL TEXT CONTENT:
   - Keep user-facing messages in English (since users are English speakers)
   - Update all bot messages, descriptions, and UI text to reflect Russian learning
   - Change lesson content from Thai to Russian
   - Update help messages, status messages, subscription messages

3. FILES TO UPDATE:
   - src/telegramBot.js: All bot messages, commands, and lesson content
   - public/index.html: Title, description, headings, content
   - README.md: Project description
   - Any configuration files with language-specific content

4. EXAMPLE LESSON FORMAT:
   - The bot should send Russian sentences (Cyrillic script)
   - Provide English translations
   - Word-by-word breakdowns: Russian word → English meaning → pronunciation
   - Include Cyrillic script properly
   - Example:
     Russian: "Я люблю есть пиццу."
     English: I like to eat pizza.
     Breakdown:
     Я - I - ya
     люблю - love/like - lyublyu
     есть - to eat - yest'
     пиццу - pizza - pitstsu

5. SEO & METADATA:
   - Update public/index.html title: "Learn Russian Language Online | Daily Russian Lessons via Telegram Bot"
   - Update meta descriptions: "Learn Russian language online with daily Russian lessons..."
   - Update keywords: "learn Russian", "Russian language learning", "Russian lessons", "Russian for beginners", "learn Russian online"
   - Keep language tag: <html lang="en">

6. BOT BRANDING:
   - Change bot name/description from "Thai Learning Bot" to "Russian Learning Bot"
   - Update Telegram bot commands (keep in English)
   - Update difficulty levels for Russian learning progression

7. CURRENCY & PAYMENTS:
   - Keep payment system as-is (TON/USDT)
   - Update payment button text if needed

8. TIMEZONE:
   - Consider UTC or US timezones instead of Bangkok time
   - Update "9am BKK time" to appropriate time for English-speaking users
   - Or keep flexible: "Daily at 9am" with timezone option

9. DIFFICULTY LEVELS:
   - Adapt 5 difficulty levels for English speakers learning Russian:
     - Level 1: Very basic Russian (simple greetings, basic words)
     - Level 2: Basic Russian (simple sentences, present tense)
     - Level 3: Intermediate Russian (past/future tense, cases introduction)
     - Level 4: Advanced Russian (complex sentences, all cases)
     - Level 5: Advanced Russian (complex grammar, idioms, literary Russian)

10. COMMAND STRUCTURE:
    - Keep command structure in English:
      - /help - Help
      - /status - Status
      - /subscribe - Subscribe
      - /difficulty - Difficulty

11. CYRILLIC SCRIPT HANDLING:
    - Ensure proper encoding for Cyrillic characters
    - Test that Russian text displays correctly in Telegram
    - Make sure database can store Cyrillic characters

12. GRAMMAR NOTES:
    - Russian has complex grammar (cases, verb aspects, etc.)
    - Include grammar explanations in breakdowns
    - Explain grammatical cases when relevant (Nominative, Accusative, Genitive, Dative, Instrumental, Prepositional)

MAKE SURE TO:
- Keep all technical functionality intact (database, scheduler, payment processing)
- Only change language content, not code structure
- Test that Cyrillic characters display correctly
- Maintain the same subscription model and payment flow
- Keep all backend services and API integrations working
- Ensure proper UTF-8 encoding throughout the application
```

## Notes

- The bot will send Russian lessons daily to help English speakers learn Russian
- English explanations and translations will help learners understand the Russian content
- Cyrillic script must be properly encoded and displayed
- Russian grammar is complex, so explanations should include grammatical concepts
- The timezone should be updated to suit English-speaking users (UTC or US timezones)
