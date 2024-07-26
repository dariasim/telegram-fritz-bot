import { APIGatewayProxyEvent, Context } from 'aws-lambda';
import { handleMessage } from 'src/lib/fritz';

const parseLambdaEvent = (event: APIGatewayProxyEvent): FritzInput => {
  const body: TelegramEvent = JSON.parse(event.body);
  const chatId = body.message.chat.id;
  const text = body.message.text;
  const username = body.message.from.username;
  const command = body?.message?.entities?.[0]?.type;
  return { chatId, text, username, command };
};

export const handler = async (event: APIGatewayProxyEvent, context: Context) => {
  try {
    const input = parseLambdaEvent(event);
    await handleMessage(input);

  } catch (error) {
    console.log('ERROR', JSON.stringify(error));
    return { statusCode: 500 };
  }
};
