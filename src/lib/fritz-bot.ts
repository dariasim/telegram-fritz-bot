import { getTopics, getWords } from "./google-sheet";
import { SessionStore } from "./db";
import { logger } from "./logger";
import { client } from "./telegram";
import * as TelegramConstants from "../constants/telegram";

const store = new SessionStore();

export class FritzBot {

  private chatId: number;
  private topic: string;
  private allWords: Word[];
  private wordsToPractice: Word[];
  private session: TelegramSession;

  private async getWordsToPractice() {

    const session = await store.getSession(this.chatId);
    const googleSheetWords = await getWords(this.topic);

    // get all words for the selected topic
    this.allWords = session?.words ? session.words : googleSheetWords;

    // get the words to practice
    return this.allWords.filter(word => word.status === TelegramConstants.WordStatuses.ToPractice);
  }

  private getRandomWordToPractice() {
    return this.wordsToPractice[Math.floor(Math.random() * this.wordsToPractice.length)];
  }

  private async getNextQuestion() {

    // get words to practice
    this.wordsToPractice = await this.getWordsToPractice();
    logger.info('Words to practice', { wordsToPractice: this.wordsToPractice });

    // handle the case when there are no words to practice
    if (this.wordsToPractice.length === 0) {
      return await client.sendMessage({ chatId: this.chatId, text: 'Congrats! You practiced all the words correctly!' });
    }

    // get a random word to practice
    const wordToPractice = this.getRandomWordToPractice();

    // get 3 other incorrect random words
    const wrongWords = this.allWords.filter(word => word.german !== wordToPractice.german).slice(0, 3);

    // items are composed of the correct word and 3 incorrect words (options for the user to select)
    const items = [wordToPractice.russian, ...wrongWords.map(word => word.russian)];

    // save current state in db
    const session = {
      id: this.chatId,
      topic: this.topic,
      words: this.allWords,
      word: wordToPractice,
      answers: items
    }

    logger.info('Saving the current session', { session });
    await store.insertSession(session);

    const request = {
      chatId: this.chatId,
      text: `What is the translation of the word: "${wordToPractice.german}"?`,
      items,
      action: TelegramConstants.TelegramActions.SelectAnswer,
      shouldShuffleArray: true
    }

    logger.info('Sending the next question', { request });
    return await client.sendMessageWithButtons(request);
  }

  private async handleMessage(input: TelegramEvent) {

    const { first_name, username } = input.message.from;

    // send a default message when the user sends a message
    const request = {
      chatId: this.chatId,
      text: `Hello ${first_name || username} I am Fritz Bot. I can help you practice German words. Select an option from the menu to start.`
    };

    logger.info('Sending a default message', { request });
    return await client.sendMessage(request);
  }

  private async handleCommand() {

    // reset any current ongoing sessions
    await store.deleteSession(this.chatId);

    // get topics from the google sheet
    const topics = await getTopics();

    // handle the case when there are no topics in the google sheet
    if (!topics || topics.length === 0) {
      return await client.sendMessage({ chatId: this.chatId, text: 'No topics found.' });
    }

    // send a message with the topics for the user to select
    const request: SendMessageRequest = {
      chatId: this.chatId,
      text: 'Select which topic you would like to practice:',
      items: topics,
      action: TelegramConstants.TelegramActions.SelectTopic,
      shouldShuffleArray: false
    };

    logger.info('Starting the session', { request });
    return await client.sendMessageWithButtons(request);
  }

  private async updateWordStatus() {

    // update the word status to practiced
    this.allWords = this.allWords.map(word => {
      if (word.german === this.session.word.german) {
        return { ...word, status: TelegramConstants.WordStatuses.Practiced };
      }

      return word;
    });

    // save the updated session
    const request = {
      id: this.chatId,
      topic: this.session.topic,
      words: this.allWords,
      word: this.session.word,
      answers: this.session.answers
    }

    logger.info(`Updating the word status for word "${this.session.word}" to "${TelegramConstants.WordStatuses.Practiced}"`, { request });
    await store.insertSession(request);
  }

  private async handleSelectedAction(input: TelegramEvent) {

    // callback query is the data that is sent when the user selects an option
    const { action, item } = JSON.parse(input.callback_query.data) as TelegramCallbackQueryData;

    // handle the selected action from user
    switch (action) {

      // this case is triggered the first time when the user selects a topic
      case TelegramConstants.TelegramActions.SelectTopic: {
        this.topic = item;
        logger.info('Selected topic', { topic: this.topic });
        return await this.getNextQuestion();
      }
      // this case is triggered everytime when the user selects an answer
      case TelegramConstants.TelegramActions.SelectAnswer: {

        // get the current session for the current user
        this.session = await store.getSession(this.chatId);
        this.topic = this.session.topic;

        // check if the selected word is correct
        const isCorrect = item === this.session.word.russian;

        // handle the case when the selected word is correct
        if (isCorrect) {
          logger.info('Selected word is correct', { word: this.session.word });
          await this.updateWordStatus();
          return await this.getNextQuestion();
        }

        // if the selected word is incorrect
        else {

          // send a message to the user that the selected word is incorrect
          const request = {
            chatId: this.chatId,
            text: 'Incorrect. Try again.',
            items: this.session.answers,
            action: TelegramConstants.TelegramActions.SelectAnswer
          }

          logger.info('Selected word is incorrect', { request });
          return await client.sendMessageWithButtons(request);
        }
      }
    }
  }

  public async handleEvent(input: TelegramEvent) {

    logger.info('Handling event', { input });

    // save chat id
    this.chatId = input?.message?.chat?.id || input?.callback_query?.message?.chat?.id;

    // handle command (start bot)
    if (input?.message?.entities?.[0]) return this.handleCommand();

    // handle message
    if (input.message) return this.handleMessage(input);

    // handle selected action
    if (input.callback_query) return this.handleSelectedAction(input);
  }
}
