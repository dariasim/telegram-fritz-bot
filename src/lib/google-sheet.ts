import { getGoogleSheetUrl, SheetName } from "./constants";
import { getSecret, SSMParameter } from "./ssm";
import { request } from "undici";
import { parse } from "papaparse";

export const enum WordStatus {
  ToPractice = 'to_practice',
  Practiced = 'practiced'
}

export interface Word {
  german: string;
  russian: string;
  status: WordStatus;
}

interface SheetOneEntry {
  topic: string;
}

interface SheetTwoEntry extends SheetOneEntry {
  german: string;
  russian: string;
}

export const fetchSheetData = async <T>(sheetName: SheetName): Promise<T> => {

  const spreadsheetId = await getSecret(SSMParameter.SpreadsheetId);
  const url = getGoogleSheetUrl(spreadsheetId, sheetName);
  const response = await request(url);
  const csvText = await response.body.text();
  const parsedData = parse(csvText, { header: true }).data;
  return parsedData as T;
}

export const getTopics = async () => {
  const entries = await fetchSheetData<SheetOneEntry[]>('Sheet1');
  return entries.map(entry => entry.topic);
}

export const getWords = async (topic: string): Promise<Word[]> => {
  const entries = await fetchSheetData<SheetTwoEntry[]>('Sheet2');

  const words = entries
    .filter(entry => entry.topic === topic)
    .map(entry => ({ german: entry.german, russian: entry.russian, status: WordStatus.ToPractice }));
    
  return words;
}