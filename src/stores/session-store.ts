import { Entity } from 'electrodb';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { logger } from '../lib/logger';

export class SessionStore {

  private dynamoDBClient: DynamoDBClient;
  private tableName: string;
  private sessionEntity;

  constructor() {
    this.dynamoDBClient = new DynamoDBClient({ region: 'eu-central-1' });
    this.tableName = 'fritz-bot';
    this.sessionEntity = new Entity({
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
        speech_part: {
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
              english: { type: "string", required: true },
              status: { type: "string", required: true }
            }
          }
        },
        word: {
          type: "map",
          properties: {
            german: { type: "string", required: true },
            english: { type: "string", required: true },
            status: { type: "string", required: true }
          }
        },
        answers: {
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
    }, { client: this.dynamoDBClient, table: this.tableName });
  }

  public async insertSession(session: TelegramSession) {
    try {
      await this.sessionEntity.put(session).go();
    } catch (error) {
      logger.error(error);
      throw error;
    }
  }

  public async getSession(id: number) {
    try {
      const session = await this.sessionEntity.get({ id }).go();
      return session.data as TelegramSession;

    } catch (error) {
      logger.error(error);
      throw error;
    }
  }

  public async deleteSession(id: number) {
    try {
      await this.sessionEntity.delete({ id }).go();

    } catch (error) {
      logger.error(error);
      throw error;
    }
  }
}