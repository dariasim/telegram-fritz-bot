import { APIGatewayProxyEvent, Context } from 'aws-lambda';
import { FritzBot } from 'src/lib/fritz';
import { logger } from 'src/lib/logger';

const bot = new FritzBot();

export const handler = async (event: APIGatewayProxyEvent, context: Context) => {
  try {
    const body: TelegramEvent = JSON.parse(event.body);
    await bot.handleEvent(body);
  } catch (error) {
    logger.error('Error handling message', { error });
    return { statusCode: 500 };
  }
};
