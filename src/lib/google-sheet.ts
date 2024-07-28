import { getSecret, SSMParameter } from "./ssm";
import { request } from "undici";
import { parse } from "papaparse";
import * as TelegramConstants from "../constants/telegram";

export const getGoogleSheetUrl = (spreadsheetId: string, sheetName: SheetName) => {
  return `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:csv&sheet=${sheetName}`;
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
    .map(entry => ({ german: entry.german, russian: entry.russian, status: TelegramConstants.WordStatuses.ToPractice }));

  return words;
}