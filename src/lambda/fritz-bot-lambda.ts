import { APIGatewayProxyEvent, Context } from 'aws-lambda';
import { logger } from 'src/lib/logger';
import { handleEvent } from 'src/lib/fritz-bot';

export const handler = async (event: APIGatewayProxyEvent, context: Context) => {
  try {
    const body: TelegramEvent = JSON.parse(event.body);
    await handleEvent(body);
  } catch (error) {
    logger.error('Error handling message', { error });
    return { statusCode: 500 };
  }
};
