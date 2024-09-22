import { request } from 'undici';
import { getSecret, SSMParameter } from './ssm';
import { shuffleArray } from './utils';
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
    const { chatId, text, reply_markup, parse_mode } = message;

    // prevent sending empty messages
    if (!text) {
      return;
    }

    const method: TelegramMethod = TelegramConstants.TelegramMethods.SendMessage;
    const url = `${this.baseUrl}${token}/${method}`;

    const { statusCode, headers, body } = await request(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text, reply_markup, parse_mode })
    });

    if (statusCode !== 200) {

      const payload = await body.json() as TelegramError;

      // handle the case when the error is due to the length
      if (payload.error_code === 400) {
        const tooLongWords = reply_markup.inline_keyboard
          .filter(row => row.some(button => button.text.length > 30))
          .map(row => row.map(button => button.text));

        await this.sendMessage({
          chatId,
          text: `The length of "${tooLongWords.join(',')}" is too long. It should be maximum of 30 characters. Please shorten the text and try again.`
        });
      }
    }

    // handle the general case when the message is not sent
    else {
      logger.error('Error sending message to Telegram', { url, statusCode, headers, body: payload });
      await this.sendMessage({
        chatId,
        text: 'Error sending message to Telegram. Please try again.'
      });
    }
  }

  public async sendMessageWithButtons(message: SendMessageRequest) {
    const { items, action, shouldShuffleArray, parse_mode } = message;

    const request = {
      chatId: message.chatId,
      text: message.text,
      reply_markup: this.createButtons(action, items, shouldShuffleArray),
      parse_mode
    }

    logger.info('Sending message with buttons', { request });
    await this.sendMessage(request);
  }
}

export const client = new TelegramClient();