type TelegramEntityType = 'bot_command';

declare global {

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
    reply_markup?: {
      inline_keyboard: {
        text: string;
        callback_data: string;
      }[];
    }
  }

  interface TelegramCallbackQuery {
    id: string;
    from: TelegramMessageFrom;
    message: TelegramMessage;
    chat_instance: string;
    data: string;
  }

  interface TelegramEvent {
    update_id: number;
    message?: TelegramMessage;
    callback_query?: TelegramCallbackQuery;
  }

  interface FritzInput {
    chatId: number;
    text?: string;
    username: string;
    command?: TelegramEntityType;
    selectedItem?: string;
    selectedAction?: TelegramAction;
  }

  interface InlineKeyboardButton {
    text: string;
    callback_data: string;
  }

  interface Message {
    chatId: number;
    text: string;
    items?: string[];
    reply_markup?: any;
    action?: TelegramAction;
  }

  type TelegramAction = 'select_topic' | 'select_answer';
  type TelegramMethod = 'sendMessage';
}

export { };