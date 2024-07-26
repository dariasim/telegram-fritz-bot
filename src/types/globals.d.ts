type TelegramEntityType = 'bot_command';

declare global {

  interface TelegramEntity {
    offset: number;
    length: number;
    type: TelegramEntityType;
  }

  interface TelegramEvent {
    update_id: number;
    message: {
      message_id: number;
      from: {
        id: number;
        is_bot: boolean;
        first_name: string;
        last_name: string;
        username: string;
        language_code: string;
      };
      chat: {
        id: number;
        first_name: string;
        last_name: string;
        username: string;
        type: string;
      };
      date: number;
      text: string;
      entities?: TelegramEntity[];
    };
  }

  interface FritzInput {
    chatId: number;
    text: string;
    username: string;
    command: TelegramEntityType;
  }
}

export { };