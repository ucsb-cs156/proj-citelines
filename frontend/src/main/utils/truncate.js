/**
 * Shortens text to at most maxLength characters, appending "..." when it was cut short.
 * @param {string} text - the text to shorten
 * @param {number} maxLength - the maximum number of characters to keep before the "..."
 * @returns {string} - the original text if it fits within maxLength, otherwise the first
 *   maxLength characters followed by "..."
 */
export function truncate(text, maxLength) {
  if (text === null || text === undefined) {
    return "";
  }
  if (text.length <= maxLength) {
    return text;
  }
  return text.slice(0, maxLength) + "...";
}
