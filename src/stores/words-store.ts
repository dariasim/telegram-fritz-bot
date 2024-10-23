import { getSecret, SSMParameter } from '../lib/ssm';
import { request } from 'undici';
import { parse } from 'papaparse';
import * as TelegramConstants from '../constants/telegram';
import { logger } from '../lib/logger';
import * as cache from '../lib/cache';

export const getGoogleSheetUrl = (spreadsheetId: string, sheetName: SheetName) => {
  return `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:csv&sheet=${sheetName}`;
};

const fetchSheetData = async <T>(sheetName: SheetName): Promise<T> => {
  const cachedData = await cache.get(sheetName);

  if (cachedData) {
    logger.debug('Retrieved data from cache:', { sheetName });
    return JSON.parse(cachedData) as T;
  }

  const spreadsheetId = await getSecret(SSMParameter.SpreadsheetId);
  const url = getGoogleSheetUrl(spreadsheetId, sheetName);
  const response = await request(url);
  const csvText = await response.body.text();
  const parsedData = parse(csvText, { header: true }).data;

  // cache the data for future use
  await cache.set(sheetName, JSON.stringify(parsedData));

  return parsedData as T;
};

export const getTopics = async () => {
  const cachedData = await cache.get('topics');

  if (cachedData) {
    logger.debug('Retrieved data from cache:', { sheetName: 'topics' });
    return JSON.parse(cachedData) as string[];
  }

  const entries = await fetchSheetData<SheetOneEntry[]>('Sheet1');
  const topics = Array.from(new Set(entries.map((entry) => entry.topic)));

  await cache.set('topics', JSON.stringify(topics));

  return topics;
};

export const getSpeechParts = async () => {
  const cachedData = await cache.get('speechParts');

  if (cachedData) {
    logger.debug('Retrieved data from cache:', { sheetName: 'speechParts' });
    return JSON.parse(cachedData) as string[];
  }

  const entries = await fetchSheetData<SheetTwoEntry[]>('Sheet2');
  const speechParts = Array.from(new Set(entries.map((entry) => entry.speech_part)));

  await cache.set('speechParts', JSON.stringify(speechParts));

  return speechParts;
};

export const getWords = async (topic: string, speechPart: string): Promise<Word[]> => {
  const cachedData = await cache.get('words');

  let entries: SheetTwoEntry[] = [];

  if (cachedData) {
    entries = JSON.parse(cachedData) as SheetTwoEntry[];
  } else {
    entries = await fetchSheetData<SheetTwoEntry[]>('Sheet2');
    await cache.set('words', JSON.stringify(entries));
  }

  const words = entries
    .filter((entry) => entry.topic === topic)
    .filter((entry) => entry.speech_part === speechPart)
    .map((entry) => ({
      english: entry.english,
      german: entry.german,
      speech_part: entry.speech_part,
      status: TelegramConstants.WordStatuses.ToPractice,
    }));

  logger.info('Words for topic:', { topic, words });

  return words;
};
