import { WordStatuses, TelegramActions, TelegramMethods, TelegramEntityTypes } from '../constants/telegram';

declare global {
  type WordStatus = typeof WordStatuses[keyof typeof WordStatuses];
  type TelegramAction = typeof TelegramActions[keyof typeof TelegramActions];
  type TelegramMethod = typeof TelegramMethods[keyof typeof TelegramMethods];
  type TelegramEntityType = typeof TelegramEntityTypes[keyof typeof TelegramEntityTypes];

  interface TelegramEntity {
    offset: number;
    length: number;
    type: TelegramEntityType;
  }

  interface TelegramMessageFrom {
    id: number;
    is_bot: boolean;
    first_name: string;
    last_name?: string;
    username: string;
    language_code?: string;
  }

  interface TelegramMessageChat {
    id: number;
    first_name: string;
    last_name: string;
    username: string;
    type: string;
  }

  interface TelegramMessage {
    message_id: number;
    from: TelegramMessageFrom;
    chat: TelegramMessageChat;
    date: number;
    text: string;
    entities?: TelegramEntity[];
    reply_markup?: TelegramReplyMarkup;
  }

  interface TelegramCallbackQuery {
    id: string;
    from: TelegramMessageFrom;
    message: TelegramMessage;
    chat_instance: string;
    data: string; // this is a stringified JSON of TelegramCallbackQueryData
  }

  interface TelegramCallbackQueryData {
    action: TelegramAction;
    item: string;
  }

  interface TelegramReplyMarkup {
    inline_keyboard: InlineKeyboardButton[][];
  }

  interface TelegramEvent {
    update_id: number;
    message?: TelegramMessage;
    callback_query?: TelegramCallbackQuery;
  }

  interface InlineKeyboardButton {
    text: string;
    callback_data: string;
  }

  interface SendMessageRequest {
    chatId: number;
    text: string;
    items?: string[];
    reply_markup?: TelegramReplyMarkup;
    action?: TelegramAction;
    shouldShuffleArray?: boolean;
  }

  interface Word {
    german: string;
    russian: string;
    status: WordStatus;
  }

  interface TelegramSession {
    id: number;
    words: Word[];
    word: Word;
    answers: string[];
    topic: string;
  }
}

export {};