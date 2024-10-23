import { getSpeechParts, getTopics, getWords } from '../stores/words-store';
import { SessionStore } from '../stores/session-store';
import { logger } from './logger';
import { client } from './telegram';
import {
  helloMessage,
  topicsMessage,
  wordToReviewMessage,
  reviewWordLaterMessage,
  incorrectAnswerMessage,
  speechPartMessage,
  exerciseTypeMessage,
} from './messages';
import * as TelegramConstants from '../constants/telegram';

const store = new SessionStore();

let chatId: number;
let topic: string;
let exerciseType: TelegramConstants.ExerciseType;
let speechPart: string;
let allWords: Word[];
let wordsToPractice: Word[];
let session: TelegramSession;

const getWordsToPractice = async () => {
  const session = await store.getSession(chatId);
  const googleSheetWords = await getWords(topic, speechPart);

  // get all words for the selected topic
  allWords = session?.words ? session.words : googleSheetWords;

  // get the words to practice
  return allWords.filter((word) => word.status === TelegramConstants.WordStatuses.ToPractice);
};

const getRandomWordToPractice = () => {
  return wordsToPractice[Math.floor(Math.random() * wordsToPractice.length)];
};

const getNextReviewQuestion = async () => {
  // get words to practice
  wordsToPractice = await getWordsToPractice();
  logger.debug('Words to review', { wordsToPractice });

  // handle the case when there are no words to practice
  if (wordsToPractice.length === 0) {
    return await client.sendMessage({ chatId, text: 'Congrats! You reviewed all the words.' });
  }

  // get a random word to review
  const wordToReview = getRandomWordToPractice();

  // items are composed of two options: "Ok" and "Review later"
  const items = [TelegramConstants.ReviewAnswers.ReviewLater, TelegramConstants.ReviewAnswers.Ok];

  // save current state in db
  const session = {
    id: chatId,
    topic,
    words: allWords,
    speech_part: speechPart,
    word: wordToReview,
    answers: items,
  };

  logger.info('Saving the current session', { session });
  await store.insertSession(session);

  const request = {
    chatId,
    text: `Please review the following words: \n\nGerman: *${wordToReview.german}* \n\nEnglish: *${wordToReview.english}*`,
    items,
    action: TelegramConstants.TelegramActions.SelectReviewAnswer,
  };

  logger.info('Sending the next question', { request });
  return await client.sendMessageWithButtons(request);
};

const getNextPracticeQuestion = async () => {
  // get words to practice
  wordsToPractice = await getWordsToPractice();
  logger.info('Words to practice', { wordsToPractice });

  // handle the case when there are no words to practice
  if (wordsToPractice.length === 0) {
    return await client.sendMessage({ chatId, text: 'Congrats! You practiced all the words correctly!' });
  }

  // get a random word to practice
  const wordToPractice = getRandomWordToPractice();

  // get 3 other incorrect random words
  const wrongWords = allWords.filter((word) => word.german !== wordToPractice.german).slice(0, 3);

  // items are composed of the correct word and 3 incorrect words (options for the user to select)
  const items = [wordToPractice.english, ...wrongWords.map((word) => word.english)];

  // save current state in db
  const session = {
    id: chatId,
    topic,
    words: allWords,
    speech_part: speechPart,
    word: wordToPractice,
    answers: items,
  };

  logger.info('Saving the current session', { session });
  await store.insertSession(session);

  const request = {
    chatId: chatId,
    text: `Select translation for: ${wordToPractice.german}`,
    items,
    action: TelegramConstants.TelegramActions.SelectPracticeAnswer,
    shouldShuffleArray: true,
  };

  logger.info('Sending the next question', { request });
  return await client.sendMessageWithButtons(request);
};

const updateWordStatus = async () => {
  // update the word status to practiced
  allWords = allWords.map((word) => {
    if (word.german === session.word.german) {
      return { ...word, status: TelegramConstants.WordStatuses.Practiced };
    }

    return word;
  });

  // save the updated session
  const request = {
    id: chatId,
    topic: session.topic,
    words: allWords,
    word: session.word,
    speech_part: speechPart,
    answers: session.answers,
  };

  logger.debug(`Updating the word status for word "${session.word}" to "${TelegramConstants.WordStatuses.Practiced}"`, {
    request,
  });
  await store.insertSession(request);
};

const getExerciseType = async () => {
  const request = {
    chatId,
    text: exerciseTypeMessage,
    items: [TelegramConstants.ExerciseTypes.Review, TelegramConstants.ExerciseTypes.Practice],
    action: TelegramConstants.TelegramActions.SelectExerciseType,
  };

  return await client.sendMessageWithButtons(request);
};

const getSpeechPart = async () => {
  const speechParts = await getSpeechParts();

  const request: SendMessageRequest = {
    chatId,
    text: speechPartMessage,
    items: speechParts,
    action: TelegramConstants.TelegramActions.SelectSpeechPart,
    shouldShuffleArray: false,
  };

  return await client.sendMessageWithButtons(request);
};

const handleSelectedAction = async (input: TelegramEvent) => {
  // callback query is the data that is sent when the user selects an option
  const { action, item } = JSON.parse(input.callback_query.data) as TelegramCallbackQueryData;

  // handle the selected action from user
  switch (action) {
    // this case is triggered the first time when the user selects a topic
    case TelegramConstants.TelegramActions.SelectTopic: {
      topic = item;
      logger.debug('Selected topic', { topic });
      return await getSpeechPart();
    }

    // this case is triggered when the user selects the exercise type
    case TelegramConstants.TelegramActions.SelectExerciseType: {
      exerciseType = item as TelegramConstants.ExerciseType;
      logger.debug('Selected exercise type', { exerciseType });
      switch (exerciseType) {
        case TelegramConstants.ExerciseTypes.Practice:
          return await getNextPracticeQuestion();
        case TelegramConstants.ExerciseTypes.Review:
          return await getNextReviewQuestion();
        default:
          return;
      }
    }

    // this case is triggered when the user selects the speech part
    case TelegramConstants.TelegramActions.SelectSpeechPart: {
      speechPart = item;
      logger.info('Selected speech part', { speechPart });
      return await getExerciseType();
    }

    // this case is triggered when the user selects an answer for the review question
    case TelegramConstants.TelegramActions.SelectReviewAnswer: {
      // get the current session for the current user
      session = await store.getSession(chatId);
      topic = session.topic;

      const shouldReviewLater = item === TelegramConstants.ReviewAnswers.ReviewLater;

      // handle the case when the user selects to "Ok"
      if (!shouldReviewLater) {
        // send a message to the user that the selected word is correct
        const request = { chatId, text: wordToReviewMessage };

        await updateWordStatus();
        await client.sendMessage(request);
        return await getNextReviewQuestion();
      }

      // handle the case when the user selects to "Review later"
      else {
        // send a message to the user that the selected word is incorrect
        const request = { chatId, text: reviewWordLaterMessage };
        await client.sendMessage(request);
        return await getNextReviewQuestion();
      }
    }

    // this case is triggered when the user selects an answer for the practice question
    case TelegramConstants.TelegramActions.SelectPracticeAnswer: {
      // get the current session for the current user
      session = await store.getSession(chatId);
      topic = session.topic;

      // check if the selected word is correct
      const isCorrect = item === session.word.english;

      // handle the case when the selected word is correct
      if (isCorrect) {
        // send a message to the user that the selected word is correct
        const request = { chatId, text: 'Correct' };

        await updateWordStatus();
        await client.sendMessage(request);
        return await getNextPracticeQuestion();
      }

      // if the selected word is incorrect
      else {
        // send a message to the user that the selected word is incorrect
        const request = { chatId, text: incorrectAnswerMessage };
        await client.sendMessage(request);
        return await getNextPracticeQuestion();
      }
    }
  }
};

const handleMessage = (input: TelegramEvent) => {
  const { first_name, username } = input.message.from;
  const request = { chatId, text: helloMessage(first_name || username) };
  return client.sendMessage(request);
};

const handleCommand = async () => {
  // reset any current ongoing sessions
  await store.deleteSession(chatId);

  // get topics from the google sheet
  const topics = await getTopics();

  // send a message with the topics for the user to select
  const request: SendMessageRequest = {
    chatId: chatId,
    text: topicsMessage,
    items: topics,
    action: TelegramConstants.TelegramActions.SelectTopic,
    shouldShuffleArray: false,
  };

  logger.debug('Starting the session', { request });
  return await client.sendMessageWithButtons(request);
};

export const handleEvent = (input: TelegramEvent) => {
  logger.debug('Handling event', { input });

  chatId = input?.message?.chat?.id || input?.callback_query?.message?.chat?.id;

  // handle command (start bot)
  if (input?.message?.entities?.[0]) return handleCommand();

  // handle message
  if (input.message) return handleMessage(input);

  // handle selected action
  if (input.callback_query) return handleSelectedAction(input);
};
