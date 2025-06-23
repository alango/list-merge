/**
 * Fuzzy matching function that scores how well a query matches text
 * @param query - The search query
 * @param text - The text to match against
 * @returns A score from 0-100, where 100 is a perfect match
 */
export const fuzzyMatch = (query: string, text: string): number => {
  const queryLower = query.toLowerCase();
  const textLower = text.toLowerCase();
  
  // Perfect match
  if (textLower === queryLower) return 100;
  
  // Starts with query (high score)
  if (textLower.startsWith(queryLower)) return 90;
  
  // Contains query (medium score)
  if (textLower.includes(queryLower)) return 70;
  
  // Character-by-character fuzzy match (lower score)
  let queryIndex = 0;
  let score = 0;
  
  for (let i = 0; i < textLower.length && queryIndex < queryLower.length; i++) {
    if (textLower[i] === queryLower[queryIndex]) {
      score += 10;
      queryIndex++;
    }
  }
  
  // Only return score if all query characters were found
  return queryIndex === queryLower.length ? score : 0;
};