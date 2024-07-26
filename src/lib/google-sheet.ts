import { getGoogleSheetUrl, SheetName } from "./constants";
import { getSecret, SSMParameter } from "./ssm";
import { request } from "undici";
import { parse } from "papaparse";

const enum WordStatus {
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

  console.log(`Fetching data from Google Sheet ${sheetName}`);
  const spreadsheetId = await getSecret(SSMParameter.SpreadsheetId);

  console.log(`Spreadsheet ID: ${spreadsheetId}`);

  const url = getGoogleSheetUrl(spreadsheetId, sheetName);

  console.log(`Fetching data from URL: ${url}`);

  const response = await request(url);

  console.log(`Response status: ${response.statusCode}`);
  console.log(`Response body: ${response.body}`);

  const csvText = await response.body.text();
  const parsedData = parse(csvText, { header: true }).data;

  console.log(`Parsed data: ${JSON.stringify(parsedData)}`);

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

  console.log(`Words for topic "${topic}": ${JSON.stringify(words)}`);

  return words;
}