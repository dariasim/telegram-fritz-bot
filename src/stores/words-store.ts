import { getSecret, SSMParameter } from "../lib/ssm";
import { request } from "undici";
import { parse } from "papaparse";
import * as TelegramConstants from "../constants/telegram";
import { logger } from "../lib/logger";

export const getGoogleSheetUrl = (spreadsheetId: string, sheetName: SheetName) => {
  return `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:csv&sheet=${sheetName}`;
}
 
const fetchSheetData = async <T>(sheetName: SheetName): Promise<T> => {

  const spreadsheetId = await getSecret(SSMParameter.SpreadsheetId);
  const url = getGoogleSheetUrl(spreadsheetId, sheetName);
  const response = await request(url);
  const csvText = await response.body.text();
  const parsedData = parse(csvText, { header: true }).data;
  return parsedData as T;
}

export const getTopics = async () => {
  const entries = await fetchSheetData<SheetOneEntry[]>('Sheet1');
  const topics = Array.from(new Set(entries.map(entry => entry.topic)));

  logger.info('Available topics:', { topics});

  return topics;
}

export const getSpeechParts = async () => {
  const entries = await fetchSheetData<SheetTwoEntry[]>('Sheet2');
  const speechParts = Array.from(new Set(entries.map(entry => entry.speech_part)));

  logger.info('Available speech parts:', { speechParts });

  return speechParts;
}

export const getWords = async (topic: string, speechPart: string): Promise<Word[]> => {
  const entries = await fetchSheetData<SheetTwoEntry[]>('Sheet2');

  const words = entries
    .filter(entry => entry.topic === topic)
    .filter(entry => entry.speech_part === speechPart)
    .map(entry => ({ 
      english: entry.english,
      german: entry.german,
      speech_part: entry.speech_part,
      status: TelegramConstants.WordStatuses.ToPractice
     }));

  logger.info('Words for topic:', { topic, words });

  return words;
}