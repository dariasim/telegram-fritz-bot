import { getSecret, SSMParameter } from "../lib/ssm";
import { sendMessage } from "../lib/telegram";

const parseLambdaEvent = (event: any) => {

  const body = JSON.parse(event.body);

  console.log('Received new message', body);

  const chatId = body.message.chat.id;
  const text = body.message.text.toLowerCase();
  const username = body.message.from.username;

  return { chatId, text, username };
};

export const handler = async (event: any, context: any) => {
  try {
    console.log('EVENT', event);
    console.log('CONTEXT', context);

    const { chatId, text, username } = parseLambdaEvent(event);
    const token = await getSecret(SSMParameter.FritzBotToken);

    await sendMessage(chatId, `Hello ${username}, you said: ${text}`, token);

    return { body: JSON.stringify({ message: 'ok' }), statusCode: 200 };
  } catch (error) {
    console.log('ERROR', JSON.stringify(error));
    return { statusCode: 500, message: 'error' };
  }
};
