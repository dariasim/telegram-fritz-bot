import { request } from 'undici';
import { getSecret, SSMParameter } from './ssm';
import { shuffleArray } from './utils';

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

  public async sendMessage(message: Message) {
    const token = await this.getToken();
    const { chatId, text, reply_markup } = message;

    // prevent sending empty messages
    if (!text) {
      return;
    }

    const method: TelegramMethod = 'sendMessage';
    const url = `${this.baseUrl}${token}/${method}`;

    const { statusCode, headers, trailers, body } = await request(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text, reply_markup })
    });

    if (statusCode !== 200) {
      console.log('Error sending message to Telegram');
      console.log('Url:', url);
      console.log('Status code:', statusCode);
      console.log('Headers:', headers);
      console.log('Trailers:', trailers);
      console.log('Body:', await body.json());
    }
  }

  public async sendMessageWithButtons(message: Message) {
    const { chatId, text, items, action } = message;
    const reply_markup = {
      inline_keyboard: shuffleArray(items.map(item => [this.createButton(action, item)]))
    };

    await this.sendMessage({ chatId, text, reply_markup });
  }
}

export const client = new TelegramClient();