import * as TelegramConstants from '../constants/telegram';

import { client } from './telegram';

export const topicsMessage = `Select a topic to practice.`;
export const wordToReviewMessage = `Here is a word to review.`;
export const reviewWordLaterMessage = 'Ok, we will review this word later.';
export const incorrectAnswerMessage = 'Incorrect. We will try again later.';
export const speechPartMessage = 'Select which part of the speech you would like to practice:';
export const exerciseTypeMessage = 'What kind of exercise would you like to do?';

export const sendGetExerciseTypeMessage = async (chatId: number) => {
  const request = {
    chatId,
    text: exerciseTypeMessage,
    items: [TelegramConstants.ExerciseTypes.Review, TelegramConstants.ExerciseTypes.Practice],
    action: TelegramConstants.TelegramActions.SelectExerciseType,
  };

  return client.sendMessageWithButtons(request);
};

export const sendEndReviewMessage = async (chatId: number) => {
  return client.sendMessage({ chatId, text: 'Congrats! You reviewed all the words.' });
};

export const sendEndPracticeMessage = async (chatId: number) => {
  return client.sendMessage({ chatId, text: 'Congrats! You practiced all the words.' });
};

export const sendReviewQuestionMessage = async (chatId: number, word: Word) => {
  const request = {
    chatId,
    text: `Please review the following words: \n\nGerman: *${word.german}* \n\nEnglish: *${word.english}*`,
    items: [TelegramConstants.ReviewAnswers.ReviewLater, TelegramConstants.ReviewAnswers.Ok],
    action: TelegramConstants.TelegramActions.SelectReviewAnswer,
  };

  return client.sendMessageWithButtons(request);
};

export const sendPracticeQuestionMessage = async (chatId: number, word: Word, items: string[], debug: any) => {
  const request = {
    chatId: chatId,
    text: `Select translation for: ${word.german} (Words left: ${debug.length})`,
    items,
    action: TelegramConstants.TelegramActions.SelectPracticeAnswer,
    shouldShuffleArray: true,
  };

  return client.sendMessageWithButtons(request);
};

export const sendGetTopicMessage = async (chatId: number, topics: string[]) => {
  const request = {
    chatId,
    text: topicsMessage,
    items: topics,
    action: TelegramConstants.TelegramActions.SelectTopic,
    shouldShuffleArray: false,
  };

  return client.sendMessageWithButtons(request);
};

export const sendSpeechPartMessage = async (chatId: number, speechParts: string[]) => {
  const request = {
    chatId,
    text: speechPartMessage,
    items: speechParts,
    action: TelegramConstants.TelegramActions.SelectSpeechPart,
    shouldShuffleArray: false,
  };

  return client.sendMessageWithButtons(request);
};

export const sendWordToReviewMessage = async (chatId: number) => {
  return client.sendMessage({
    chatId,
    text: `Here is a word to review:`,
  });
};

export const sendWordToReviewLaterMessage = async (chatId: number) => {
  return client.sendMessage({
    chatId,
    text: reviewWordLaterMessage,
  });
};

export const sendCorrectAnswerMessage = async (chatId: number) => {
  return client.sendMessage({
    chatId,
    text: 'Correct!',
  });
};

export const sendIncorrectAnswerMessage = async (chatId: number) => {
  return client.sendMessage({
    chatId,
    text: incorrectAnswerMessage,
  });
};

export const sendHelloMessage = async (chatId: number, name: string) => {
  return client.sendMessage({
    chatId,
    text: `Hello ${name || 'user'} I am Fritz Bot. I can help you practice German words. Select an option from the menu to start.`,
  });
};
