import { getTopics, getWords, Word, WordStatus } from "../lib/google-sheet";
import { deleteSession, getSession, insertSession } from "./db";
import { logger } from "./logger";
import { client } from "./telegram";

export class FritzBot {

  private chatId: number;
  private topics: string[];
  private topic: string;
  private item: string;
  private action: string;
  private allWords: Word[];
  private wordsToPractice: Word[];
  private session: any;

  private async getWordsToPractice() {

    const session = await getSession(this.chatId);
    const googleSheetWords = await getWords(this.topic);

    logger.info('Session', { session });
    logger.info('Google Sheet words', { googleSheetWords });

    // get all words for the selected topic
    this.allWords = session?.words ? session.words as Word[] : googleSheetWords;

    // get the words to practice
    return this.allWords.filter(word => word.status === WordStatus.ToPractice);
  }

  private getRandomWordToPractice() {
    return this.wordsToPractice[Math.floor(Math.random() * this.wordsToPractice.length)];
  }

  private async getNextQuestion() {

    // get words to practice
    this.wordsToPractice = await this.getWordsToPractice();
    logger.info('Words to practice', { wordsToPractice: this.wordsToPractice });

    // if there are no words to practice, send a message
    if (this.wordsToPractice.length === 0) {
      await deleteSession(this.chatId);
      return await client.sendMessage({ chatId: this.chatId, text: 'Congrats! You practiced all the words correctly!' });
    }

    // get a random word to practice
    const wordToPractice = this.getRandomWordToPractice();
    const text = `What is the translation of the word: "${wordToPractice.german}"?`;
    const action = 'select_answer';

    // get 3 other incorrect random words
    const wrongWords = this.allWords.filter(word => word.german !== wordToPractice.german).slice(0, 3);

    // send a message with the word to practice and the wrong words
    const items = [wordToPractice.russian, ...wrongWords.map(word => word.russian)];

    // save current state in db
    const session = {
      id: this.chatId,
      topic: this.topic,
      words: this.allWords,
      currentWord: wordToPractice,
      currentAnswers: items
    }

    logger.info('Saving the current state', { session });
    await insertSession(session);

    const request = {
      chatId: this.chatId,
      text,
      items,
      action: action as TelegramAction
    }

    logger.info('Sending the next question', { request });
    return await client.sendMessageWithButtons(request);
  }

  private async handleMessage(input: TelegramEvent) {
    this.chatId = input.message.chat.id;

    const request = {
      chatId: this.chatId,
      text: 'Hello, I am Fritz Bot',
    };

    logger.info('Sending a default message', { request });

    return await client.sendMessage(request);
  }

  private async handleCommand(input: TelegramEvent) {
    this.chatId = input.message.chat.id;
    this.topics = await getTopics();

    const request = {
      chatId: this.chatId,
      text: 'Select which topic you would like to practice:',
      items: this.topics,
      action: 'select_topic' as TelegramAction
    };

    logger.info('Starting the session', { request });

    return await client.sendMessageWithButtons(request);
  }

  private async updateWordStatus() {
    this.allWords = this.allWords.map(word => {
      if (word.german === this.session.currentWord.german) {
        return { ...word, status: WordStatus.Practiced };
      }

      return word;
    });

    const request = {
      id: this.chatId,
      topic: this.session.topic,
      words: this.allWords,
      currentWord: this.session.currentWord,
      currentAnswers: this.session.currentAnswers
    }

    logger.info('Updating the word status', { request });
    await insertSession(request);
  }

  private async handleSelectedAction(input: TelegramEvent) {

    const callbackQueryData = JSON.parse(input.callback_query.data);

    this.action = callbackQueryData.action;
    this.item = callbackQueryData.item;

    switch (this.action) {
      case 'select_topic': {
        this.topic = this.item;
        logger.info('Selected topic', { topic: this.topic });
        return await this.getNextQuestion();
      }
      case 'select_answer': {
        this.session = await getSession(this.chatId);
        this.topic = this.session.topic;

        // check if the selected word is correct
        const isCorrect = this.item === this.session.currentWord.russian;

        if (isCorrect) {
          logger.info('Selected word is correct', { word: this.session.currentWord });
          await this.updateWordStatus();
          return await this.getNextQuestion();
        }

        // if the selected word is incorrect
        else {
          const items = this.session.currentAnswers;
          const action = 'select_answer';
          const text = 'Incorrect! Try again!';
          return await client.sendMessageWithButtons({ chatId: this.chatId, text, items, action });
        }
      }
    }
  }

  public async handleEvent(input: TelegramEvent) {
    // handle command (start bot)
    if (input?.message?.entities?.[0]) return this.handleCommand(input);

    // handle message
    if (input.message) return this.handleMessage(input);

    // handle selected action
    if (input.callback_query) return this.handleSelectedAction(input);
  }
}
