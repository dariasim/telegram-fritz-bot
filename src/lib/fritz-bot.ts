import { getSpeechParts, getTopics, getWords } from "../stores/words-store";
import { SessionStore } from "../stores/session-store";
import { logger } from "./logger";
import { client } from "./telegram";
import * as TelegramConstants from "../constants/telegram";

const store = new SessionStore();

export class FritzBot {

  private chatId: number;
  private topic: string;
  private exerciseType: TelegramConstants.ExerciseType;
  private speechPart: string;
  private allWords: Word[];
  private wordsToPractice: Word[];
  private session: TelegramSession;

  private async getWordsToPractice() {

    const session = await store.getSession(this.chatId);
    const googleSheetWords = await getWords(this.topic, this.speechPart);

    // get all words for the selected topic
    this.allWords = session?.words ? session.words : googleSheetWords;

    // get the words to practice
    return this.allWords
      .filter(word => word.status === TelegramConstants.WordStatuses.ToPractice);
  }

  private getRandomWordToPractice() {
    return this.wordsToPractice[Math.floor(Math.random() * this.wordsToPractice.length)];
  }

  private async getNextReviewQuestion() {
    // get words to practice
    this.wordsToPractice = await this.getWordsToPractice();
    logger.info('Words to review', { wordsToPractice: this.wordsToPractice });

    // handle the case when there are no words to practice
    if (this.wordsToPractice.length === 0) {
      return await client.sendMessage({ chatId: this.chatId, text: 'Congrats! You reviewed all the words.' });
    }

    // get a random word to review
    const wordToReview = this.getRandomWordToPractice();

    // items are composed of two options: "Ok" and "Review later"
    const items = [TelegramConstants.ReviewAnswers.ReviewLater, TelegramConstants.ReviewAnswers.Ok];

    // save current state in db
    const session = {
      id: this.chatId,
      topic: this.topic,
      words: this.allWords,
      speech_part: this.speechPart,
      word: wordToReview,
      answers: items
    }

    logger.info('Saving the current session', { session });
    await store.insertSession(session);

    const request = {
      chatId: this.chatId,
      text: `Please review the following words: \n\nGerman: *${wordToReview.german}* \n\nEnglish: *${wordToReview.english}*`,
      items,
      action: TelegramConstants.TelegramActions.SelectReviewAnswer
    }

    logger.info('Sending the next question', { request });
    return await client.sendMessageWithButtons(request);
  }

  private async getNextPracticeQuestion() {

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
    const items = [wordToPractice.english, ...wrongWords.map(word => word.english)];

    // save current state in db
    const session = {
      id: this.chatId,
      topic: this.topic,
      words: this.allWords,
      speech_part: this.speechPart,
      word: wordToPractice,
      answers: items
    }

    logger.info('Saving the current session', { session });
    await store.insertSession(session);

    const request = {
      chatId: this.chatId,
      text: `Select translation for: ${wordToPractice.german}`,
      items,
      action: TelegramConstants.TelegramActions.SelectPracticeAnswer,
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
      speech_part: this.speechPart,
      answers: this.session.answers
    }

    logger.info(`Updating the word status for word "${this.session.word}" to "${TelegramConstants.WordStatuses.Practiced}"`, { request });
    await store.insertSession(request);
  }

  private async getExerciseType() {
    const request = {
      chatId: this.chatId,
      text: `What kind of exercise would you like to do?`,
      items: [TelegramConstants.ExerciseTypes.Review, TelegramConstants.ExerciseTypes.Practice],
      action: TelegramConstants.TelegramActions.SelectExerciseType
    }

    logger.info('Sending exercise types', { request });
    return await client.sendMessageWithButtons(request);
  }

  private async getSpeechPart() {

    const speechParts = await getSpeechParts();

    const request: SendMessageRequest = {
      chatId: this.chatId,
      text: 'Select which part of the speech you would like to practice:',
      items: speechParts,
      action: TelegramConstants.TelegramActions.SelectSpeechPart,
      shouldShuffleArray: false
    };

    logger.info('Sending speech parts', { request });
    return await client.sendMessageWithButtons(request);
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
        return await this.getSpeechPart();
      }

      // this case is triggered when the user selects the exercise type
      case TelegramConstants.TelegramActions.SelectExerciseType: {
        this.exerciseType = item as TelegramConstants.ExerciseType;
        logger.info('Selected exercise type', { exerciseType: this.exerciseType });
        switch (this.exerciseType) {
          case TelegramConstants.ExerciseTypes.Practice: return await this.getNextPracticeQuestion();
          case TelegramConstants.ExerciseTypes.Review: return await this.getNextReviewQuestion();
          default: return;
        }
      }

      // this case is triggered when the user selects the speech part
      case TelegramConstants.TelegramActions.SelectSpeechPart: {
        this.speechPart = item;
        logger.info('Selected speech part', { speechPart: this.speechPart });
        return await this.getExerciseType();
      }

      // this case is triggered when the user selects an answer for the review question
      case TelegramConstants.TelegramActions.SelectReviewAnswer: {
        // get the current session for the current user
        this.session = await store.getSession(this.chatId);
        this.topic = this.session.topic;

        const shouldReviewLater = item === TelegramConstants.ReviewAnswers.ReviewLater;

        // handle the case when the user selects to "Ok"
        if (!shouldReviewLater) {

          // send a message to the user that the selected word is correct
          const request = {
            chatId: this.chatId,
            text: 'Ok. Here is your next word to review.',
          }

          logger.info('Selected word is ok', { word: this.session.word });
          await this.updateWordStatus();
          await client.sendMessage(request);
          return await this.getNextReviewQuestion();
        }

        // handle the case when the user selects to "Review later"
        else {

          // send a message to the user that the selected word is incorrect
          const request = {
            chatId: this.chatId,
            text: 'Ok, we will review this word later.',
          }

          logger.info('Selected word is review later', { request });
          await client.sendMessage(request);
          return await this.getNextReviewQuestion();
        }
      }

      // this case is triggered when the user selects an answer for the practice question
      case TelegramConstants.TelegramActions.SelectPracticeAnswer: {

        // get the current session for the current user
        this.session = await store.getSession(this.chatId);
        this.topic = this.session.topic;

        // check if the selected word is correct
        const isCorrect = item === this.session.word.english;

        // handle the case when the selected word is correct
        if (isCorrect) {

          // send a message to the user that the selected word is correct
          const request = {
            chatId: this.chatId,
            text: 'Correct',
          }

          logger.info('Selected word is correct', { word: this.session.word });
          await this.updateWordStatus();
          await client.sendMessage(request);
          return await this.getNextPracticeQuestion();
        }

        // if the selected word is incorrect
        else {

          // send a message to the user that the selected word is incorrect
          const request = {
            chatId: this.chatId,
            text: 'Incorrect. We will try again later.',
          }

          logger.info('Selected word is incorrect', { request });
          await client.sendMessage(request);
          return await this.getNextPracticeQuestion();
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
