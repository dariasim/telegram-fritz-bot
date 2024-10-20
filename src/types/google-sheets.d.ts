declare global {
  type SheetName = 'Sheet1' | 'Sheet2';

  interface SheetOneEntry {
    topic: string;
  }

  interface SheetTwoEntry extends SheetOneEntry {
    german: string;
    english: string;
    speech_part: string;
  }
}

export { };