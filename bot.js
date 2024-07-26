import { Telegraf } from 'telegraf';
import LocalSession from 'telegraf-session-local';
import fetch from 'node-fetch';
import Papa from 'papaparse';

// Initialize the bot with your token
const bot = new Telegraf('7247551367:AAHB01A-C0ZCLup_fXMtuX1tEAZkLhbSaCs');

// Use the session middleware
const localSession = new LocalSession({ database: 'session_db.json' });
bot.use(localSession.middleware());

// Google Sheets public URL and sheet names
const spreadsheetId = '1Lw_1a_irROHFvSZokVH89SGHdNYbb6IKxWx2NxVjAnw'; // Use the actual Spreadsheet ID
const sheet1Name = 'Sheet1'; // Name of the sheet containing topics
const sheet2Name = 'Sheet2'; // Name of the sheet containing words

// Function to fetch Google Sheet data by sheet name in CSV format
async function fetchSheetData(sheetName) {
  const url = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:csv&sheet=${sheetName}`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch data: ${response.statusText}`);
  }
  const csvText = await response.text();
  const parsedData = Papa.parse(csvText, { header: true }).data;
  return parsedData;
}

// Load topics from Google Sheet
async function getTopics() {
  const entries = await fetchSheetData(sheet1Name);
  const topics = entries.map(entry => entry.topic); // Assuming 'topic' is the column header in Sheet 1
  return topics;
}

// Load words by topic from Google Sheet
async function getWordsByTopic(topic) {
  const entries = await fetchSheetData(sheet2Name);
  return entries
    .filter(entry => entry.topic === topic)
    .map(entry => ({ german: entry.german, russian: entry.russian, status: 'to_practice' })); // Assuming 'topic', 'german', 'russian' are column headers in Sheet 2
}

// Load all words from Google Sheet
async function getAllWords() {
  const entries = await fetchSheetData(sheet2Name);
  return entries.map(entry => ({ topic: entry.topic, german: entry.german, russian: entry.russian })); // Assuming 'topic', 'german', 'russian' are column headers in Sheet 2
}

bot.start(async (ctx) => {
  try {
    const topics = await getTopics();
    const allWords = await getAllWords();
    const topicButtons = topics.map(topic => {
      const count = allWords.filter(word => word.topic === topic).length;
      return [{ text: `${topic} (${count})`, callback_data: JSON.stringify({ action: 'select_topic', topic }) }];
    });

    ctx.reply('Welcome! Which topic would you like to practice?', {
      reply_markup: {
        inline_keyboard: topicButtons
      }
    });
  } catch (error) {
    ctx.reply(`Error fetching topics: ${error.message}`);
  }
});

bot.on('callback_query', async (ctx) => {
  const data = JSON.parse(ctx.callbackQuery.data);

  if (data.action === 'select_topic') {
    const topic = data.topic;
    const words = await getWordsByTopic(topic);

    // Store words and topic in session
    ctx.session.words = words;
    ctx.session.topic = topic;

    // Log the words for debugging
    console.log(`Selected topic: ${topic}`);
    console.log(`Words for the topic: ${JSON.stringify(words, null, 2)}`);

    askQuestion(ctx);
  } else if (data.action === 'answer_question') {
    const { answer } = data;
    const { currentWord, words, topic } = ctx.session;

    let responseMessage;
    if (answer === currentWord.russian) {
      responseMessage = 'Bravo!';
      currentWord.status = 'practiced';
    } else {
      responseMessage = 'Falsch, blin! No worries, we will try again.';
    }

    // Log the answer and updated words for debugging
    console.log(`Answer: ${responseMessage}`);
    console.log(`Updated words: ${JSON.stringify(words, null, 2)}`);

    await ctx.reply(responseMessage);

    const wordToPractice = words.find(word => word.status === 'to_practice');
    if (!wordToPractice) {
      ctx.reply(`Congrats! You have practiced all the words from topic "${topic}".`);
    } else {
      askQuestion(ctx);
    }
  }
});

function askQuestion(ctx) {
  const words = ctx.session.words;
  const wordToPractice = words.find(word => word.status === 'to_practice');

  if (!wordToPractice) {
    ctx.reply(`Congrats! You have practiced all the words from topic "${ctx.session.topic}".`);
    return;
  }

  const options = getShuffledOptions(wordToPractice.russian, words);
  ctx.session.currentWord = wordToPractice;

  ctx.reply(`What is the translation of "${wordToPractice.german}"?`, {
    reply_markup: {
      inline_keyboard: options.map(option => [{ text: option, callback_data: JSON.stringify({ action: 'answer_question', answer: option }) }])
    }
  });
}

function getShuffledOptions(correctAnswer, words) {
  let otherTranslations = words
    .map(word => word.russian)
    .filter(russian => russian !== correctAnswer);

  otherTranslations = shuffleArray(otherTranslations).slice(0, 3);
  let options = [correctAnswer, ...otherTranslations];
  return shuffleArray(options);
}

function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

bot.launch().then(() => {
  console.log('Bot started successfully.');
}).catch((err) => {
  console.error('Error starting bot:', err);
});
