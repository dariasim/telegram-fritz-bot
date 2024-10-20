export const shuffleArray = <T>(array: T[]): T[] => {
  const newArray = array.slice();
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
}

/**
 * Escapes special characters in a string for Telegram's MarkdownV2 format.
 * 
 * @param {string} text - The input string to escape
 * @returns {string} The escaped string
 */
export const escapeString = (text: string): string => {
  return text
    .replaceAll(/\(/g, '\\(')  // escape (
    .replaceAll(/\)/g, '\\)')  // escape )
    .replaceAll(/\./g, '\\.'); // escape .
};