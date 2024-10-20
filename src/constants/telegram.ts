export const WordStatuses = {
  ToPractice: 'to_practice',
  Practiced: 'practiced'
} as const;

export type TelegramAction = typeof TelegramActions [keyof typeof TelegramActions];
export const TelegramActions = {
  SelectTopic: '1',
  SelectPracticeAnswer: '2',
  SelectReviewAnswer: '3',
  SelectExerciseType: '4',
  SelectSpeechPart: '5',
} as const;

export type ExerciseType = typeof ExerciseTypes[keyof typeof ExerciseTypes];
export const ExerciseTypes = {
  Practice: 'Practice',
  Review: 'Review',
} as const;

export const TelegramMethods = {
  SendMessage: 'sendMessage'
} as const;

export const TelegramEntityTypes = {
  BotCommand: 'bot_command'
} as const;

export const TelegramParseModes = {
  MarkdownV2: 'MarkdownV2',
  Html: 'HTML',
} as const;

export const ReviewAnswers = {
  Ok: 'Ok',
  ReviewLater: 'Review later',
} as const;

export const TelegramErrors = {
  BadRequestSpecialCharacter: `Bad Request: can't parse entities`,
} as const;