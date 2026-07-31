import type { Tag } from '../types/database';

const HINDI_ENGLISH_STOPWORDS = new Set([
  // Hindi fillers/connectors
  'ke', 'ka', 'ki', 'ko', 'se', 'me', 'mein', 'par', 'par', 'hai', 'hain', 'ho', 'hun',
  'kya', 'kaun', 'kaha', 'kahan', 'kab', 'kaise', 'aur', 'ya', 'to', 'bhi', 'saaf', 'shabd',
  // English fillers/connectors
  'is', 'are', 'was', 'were', 'the', 'a', 'an', 'in', 'on', 'at', 'of', 'for', 'to',
  'and', 'or', 'with', 'by', 'about', 'like', 'from', 'what', 'who', 'where', 'when', 'how'
]);

/**
 * Extracts normalized keywords from user query string, stripping punctuation & stopwords.
 */
export function extractKeywords(query: string): string[] {
  return query
    .toLowerCase()
    .replace(/[^\w\s\u0900-\u097F]/g, ' ') // Preserve English & Devanagari Unicode characters
    .split(/\s+/)
    .filter(word => word.length > 0 && !HINDI_ENGLISH_STOPWORDS.has(word));
}

export interface ScoredTag {
  tag: Tag;
  score: number;
}

/**
 * Ranks tags based on token overlap with the cleaned search query.
 * Even if user inputs a long sentence ("durga ke pati kaun hain saaf shabd me"),
 * it matches tags like "durga pati" based on token overlap ratio.
 */
export function rankTagsByQuery(tags: Tag[], query: string): Tag[] {
  const queryTokens = extractKeywords(query);

  if (queryTokens.length === 0) {
    // If only stopwords or empty query, do substring fallback
    const cleanQuery = query.trim().toLowerCase();
    if (!cleanQuery) return [];
    return tags.filter(t => t.name.toLowerCase().includes(cleanQuery));
  }

  const scored: ScoredTag[] = [];

  for (const tag of tags) {
    const tagTokens = extractKeywords(tag.name);
    if (tagTokens.length === 0) continue;

    // Count how many tag tokens match the query tokens
    let matchCount = 0;
    for (const tagToken of tagTokens) {
      if (queryTokens.some(qt => qt.includes(tagToken) || tagToken.includes(qt))) {
        matchCount++;
      }
    }

    if (matchCount > 0) {
      // Score calculation: fraction of tag tokens matched + bonus for query token matches
      const tagCoverage = matchCount / tagTokens.length;
      const queryCoverage = matchCount / queryTokens.length;
      const combinedScore = (tagCoverage * 0.7) + (queryCoverage * 0.3);

      scored.push({ tag, score: combinedScore });
    }
  }

  // Sort descending by score
  return scored
    .sort((a, b) => b.score - a.score)
    .map(s => s.tag);
}
