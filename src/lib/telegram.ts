import { request } from 'undici';
import { getSecret, SSMParameter } from './ssm';
import { escapeString, shuffleArray } from './utils';
import * as TelegramConstants from '../constants/telegram';
import { logger } from './logger';

class TelegramClient {

  private baseUrl = 'https://api.telegram.org/bot';
  private token: string

  private async getToken() {
    if (!this.token) {
      this.token = await getSecret(SSMParameter.FritzBotToken);
    }
    return this.token;
  }

  private createButton(action: TelegramAction, item: string): InlineKeyboardButton {
    return {
      text: item,
      callback_data: JSON.stringify({ action, item })
    }
  }

  private createButtons(action: TelegramAction, items: string[], shouldShuffleArray = false): TelegramReplyMarkup {
    const buttons = items.map(item => [this.createButton(action, item)]);
    return {
      inline_keyboard: shouldShuffleArray ? shuffleArray(buttons) : buttons
    }
  }

  public async sendMessage(message: SendMessageRequest) {
    const token = await this.getToken();
    const { chatId, text, reply_markup } = message;

    // prevent sending empty messages
    if (!text) {
      return;
    }

    const method: TelegramMethod = TelegramConstants.TelegramMethods.SendMessage;
    const url = `${this.baseUrl}${token}/${method}`;

    const req = {
      chat_id: chatId,
      text: escapeString(text),
      reply_markup,
      parse_mode: TelegramConstants.TelegramParseModes.MarkdownV2
    };

    logger.info('Sending message to Telegram', { url, req });

    const { statusCode, headers, body } = await request(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req)
    });

    if (statusCode !== 200) {

      const payload = await body.json() as TelegramError;

      // handle the case when the error is due to the length
      if (payload.description.includes(TelegramConstants.TelegramErrors.BadRequestSpecialCharacter)) {
        logger.error('Error sending message to Telegram', { url, statusCode, headers, body: payload });
      }

      // handle the general case when the message is not sent
      else {
        logger.error('Error sending message to Telegram', { url, statusCode, headers, body: payload });
      }
    }
  }

  public async sendMessageWithButtons(message: SendMessageRequest) {
    const { items, action, shouldShuffleArray } = message;

    const request = {
      chatId: message.chatId,
      text: message.text,
      reply_markup: this.createButtons(action, items, shouldShuffleArray)
    }

    await this.sendMessage(request);
  }
}

export const client = new TelegramClient();