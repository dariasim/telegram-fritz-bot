import { request } from 'undici';

const baseUrl = 'https://api.telegram.org/bot';

type TelegramMethod = 'sendMessage';

interface Message {
  chatId: number;
  text: string;
  token: string;
  items?: string[];
  reply_markup?: any;
}

export const sendMessage = async (message: Message) => {

  const { chatId, text, token, reply_markup } = message;

  // prevent sending empty messages
  if (!text) {
    return;
  }

  const method: TelegramMethod = 'sendMessage';
  const url = `${baseUrl}${token}/${method}`;

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
};

interface InlineKeyboardButton {
  text: string;
  callback_data: string;
}

const createButton = (item: string): InlineKeyboardButton => {
  return {
    text: item,
    callback_data: JSON.stringify({ action: 'select_item', item })
  }
}

export const sendMessageWithButtons = async (message: Message) => {
  const { chatId, text, token, items } = message;
  const reply_markup = {
    inline_keyboard: items.map(item => [createButton(item)])
  };

  await sendMessage({ chatId, text, token, reply_markup });
};