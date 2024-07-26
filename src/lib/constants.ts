export type SheetName = 'Sheet1' | 'Sheet2';

export const getGoogleSheetUrl = (spreadsheetId: string, sheetName: SheetName) => {
  return `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:csv&sheet=${sheetName}`;
}

export const enum TelegramEntityType {
  BotCommand = 'bot_command'
}