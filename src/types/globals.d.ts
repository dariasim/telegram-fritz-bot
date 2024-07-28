declare global {
  interface FritzInput {
    chatId: number;
    text?: string;
    username: string;
    command?: TelegramEntityType;
    selectedItem?: string;
    selectedAction?: TelegramAction;
  }
}

export { };