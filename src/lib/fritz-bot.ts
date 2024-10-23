import { getSpeechParts, getTopics, getWords } from '../stores/words-store';
import { SessionStore } from '../stores/session-store';
import { logger } from './logger';

import {
  sendGetExerciseTypeMessage,
  sendEndReviewMessage,
  sendReviewQuestionMessage,
  sendEndPracticeMessage,
  sendPracticeQuestionMessage,
  sendSpeechPartMessage,
  sendWordToReviewMessage,
  sendWordToReviewLaterMessage,
  sendCorrectAnswerMessage,
  sendIncorrectAnswerMessage,
  sendHelloMessage,
  sendGetTopicMessage,
} from './messages';
import * as TelegramConstants from '../constants/telegram';
import { getRandomElement } from './utils';

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

const getNextReviewQuestion = async () => {
  // get words to practice
  wordsToPractice = await getWordsToPractice();

  // handle the case when there are no words to practice
  if (wordsToPractice.length === 0) {
    return sendEndReviewMessage(chatId);
  }

  // get a random word to review
  const wordToReview = getRandomElement(wordsToPractice);

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

  return sendReviewQuestionMessage(chatId, wordToReview);
};

const getNextPracticeQuestion = async () => {
  // get words to practice
  wordsToPractice = await getWordsToPractice();
  logger.info('Words to practice', { wordsToPractice });

  // handle the case when there are no words to practice
  if (wordsToPractice.length === 0) {
    return await sendEndPracticeMessage(chatId);
  }

  // get a random word to practice
  const wordToPractice = getRandomElement(wordsToPractice);

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

  await store.insertSession(session);
  return sendPracticeQuestionMessage(chatId, wordToPractice, items, wordsToPractice);
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

const handleSelectedAction = async (input: TelegramEvent) => {
  // callback query is the data that is sent when the user selects an option
  const { action, item } = JSON.parse(input.callback_query.data) as TelegramCallbackQueryData;

  // handle the selected action from user
  switch (action) {
    // this case is triggered the first time when the user selects a topic
    case TelegramConstants.TelegramActions.SelectTopic: {
      topic = item;
      logger.debug('Selected topic', { topic });
      const speechParts = await getSpeechParts();
      return sendSpeechPartMessage(chatId, speechParts);
    }

    // this case is triggered when the user selects the exercise type
    case TelegramConstants.TelegramActions.SelectExerciseType: {
      exerciseType = item as TelegramConstants.ExerciseType;
      logger.debug('Selected exercise type', { exerciseType });
      switch (exerciseType) {
        case TelegramConstants.ExerciseTypes.Practice:
          return getNextPracticeQuestion();
        case TelegramConstants.ExerciseTypes.Review:
          return getNextReviewQuestion();
        default:
          return;
      }
    }

    // this case is triggered when the user selects the speech part
    case TelegramConstants.TelegramActions.SelectSpeechPart: {
      speechPart = item;
      return sendGetExerciseTypeMessage(chatId);
    }

    // this case is triggered when the user selects an answer for the review question
    case TelegramConstants.TelegramActions.SelectReviewAnswer: {
      // get the current session for the current user
      session = await store.getSession(chatId);
      topic = session.topic;

      const shouldReviewLater = item === TelegramConstants.ReviewAnswers.ReviewLater;

      // handle the case when the user selects to "Ok"
      if (!shouldReviewLater) {
        await updateWordStatus();
      }
      // if the selected word is incorrect
      else {
        await sendWordToReviewLaterMessage(chatId);
      }

      return getNextReviewQuestion();
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
        await updateWordStatus();
        await sendCorrectAnswerMessage(chatId);
      }
      // if the selected word is incorrect
      else {
        await sendIncorrectAnswerMessage(chatId);
      }

      return getNextPracticeQuestion();
    }
  }
};

const handleCommand = async () => {
  // reset any current ongoing sessions
  await store.deleteSession(chatId);

  // get topics from the google sheet
  const topics = await getTopics();

  // send a message with the topics for the user to select
  return sendGetTopicMessage(chatId, topics);
};

export const handleEvent = (input: TelegramEvent) => {
  logger.debug('Handling event', { input });

  const name = input?.message?.from?.first_name || input?.message?.from?.username;
  chatId = input?.message?.chat?.id || input?.callback_query?.message?.chat?.id;

  // handle command (start bot)
  if (input?.message?.entities?.[0]) {
    return handleCommand();
  }

  // handle message
  if (input.message) {
    return sendHelloMessage(chatId, name);
  }

  // handle selected action
  if (input.callback_query) {
    return handleSelectedAction(input);
  }
};
