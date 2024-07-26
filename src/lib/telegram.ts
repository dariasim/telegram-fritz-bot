import { request } from 'undici';

const baseUrl = 'https://api.telegram.org/bot';

type TelegramMethod = 'sendMessage';

export const sendMessage = async (chatId: number, text: string, token: string) => {
  // prevent sending empty messages
  if (!text) {
    return;
  }

  const method: TelegramMethod = 'sendMessage';
  const url = `${baseUrl}${token}/${method}?chat_id=${chatId}&text=${encodeURI(text)}`;

  const {
    statusCode,
    headers,
    trailers,
    body
  } = await request(url);

  if (statusCode !== 200) {
    console.log('Error sending message to Telegram');
    console.log('Url:', url);
    console.log('Status code:', statusCode);
    console.log('Headers:', headers);
    console.log('Trailers:', trailers);
    console.log('Body:', await body.json());
  }
};
