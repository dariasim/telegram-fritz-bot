export const WordStatuses = {
  ToPractice: 'to_practice' as const,
  Practiced: 'practiced' as const
};

export const TelegramActions = {
  SelectTopic: 'select_topic' as const,
  SelectAnswer: 'select_answer' as const
};

export const TelegramMethods = {
  SendMessage: 'sendMessage' as const,
};

export const TelegramEntityTypes = {
  BotCommand: 'bot_command' as const
};

export const TelegramParseModes = {
  MarkdownV2: 'MarkdownV2' as const
};