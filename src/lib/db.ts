import { Entity } from 'electrodb';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { logger } from './logger';

const client = new DynamoDBClient({ region: 'eu-central-1' });
const table = 'fritz-bot';

const BotSession = new Entity({
  model: {
    entity: 'BotSession',
    service: 'fritz-bot',
    version: '1',
  },
  attributes: {
    id: {
      type: "number",
      required: true
    },
    topic: {
      type: "string",
      required: true
    },
    words: {
      type: "list",
      required: true,
      items: {
        type: "map",
        properties: {
          german: { type: "string", required: true },
          russian: { type: "string", required: true },
          status: { type: "string", required: true }
        }
      }
    },
    currentWord: {
      type: "map",
      properties: {
        german: { type: "string", required: true },
        russian: { type: "string", required: true },
        status: { type: "string", required: true }
      }
    },
    currentAnswers: {
      type: "list",
      required: true,
      items: {
        type: "string", required: true
      }
    }
  },
  indexes: {
    primary: {
      pk: { field: "pk", composite: ["id"] },
      sk: { field: "sk", composite: ["id"] }
    }
  }
}, { client, table });

export const insertSession = async (session: any) => {
  try {
    await BotSession.put(session).go();

  } catch (error) {
    logger.error(error);
    throw error;
  }
}

export const getSession = async (id: number) => {
  try {
    const session = await BotSession.get({ id }).go();
    return session.data;

  } catch (error) {
    logger.error(error);
    throw error;
  }
}

export const deleteSession = async (id: number) => {
  try {
    await BotSession.delete({ id }).go();

  } catch (error) {
    logger.error(error);
    throw error;
  }
}