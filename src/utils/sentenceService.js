/**
 * Unified service for fetching example sentences from multiple sources
 */

import * as tatoebaService from './tatoebaService';
import * as immersionKitService from './immersionKitService';

/**
 * Get example sentences for study based on user's known words
 * @param {Array} cards - User's card collection
 * @param {number} cardLimit - Card limit for known words
 * @param {Object} options - Additional options
 * @param {string} options.source - 'tatoeba' or 'immersionkit'
 * @param {string} options.tokenizer - 'tiny' or 'kuromoji'
 * @returns {Promise<Array>} Array of filtered sentences
 */
export const getExampleSentencesForStudy = async (cards, cardLimit, options = {}) => {
  try {
    const source = options.source || 'tatoeba';
    const tokenizer = options.tokenizer || 'tiny';
    
    // Extract known words from cards
    const knownWords = tatoebaService.extractKnownWordsFromCards(cards, cardLimit);
    
    console.log(`Found ${knownWords.length} known words from ${cardLimit} cards`);
    console.log(`Using ${source === 'immersionkit' ? 'Immersion Kit (anime/drama)' : 'Tatoeba (user-generated)'} source`);
    console.log(`Using ${tokenizer === 'kuromoji' ? 'Kuromoji (accurate)' : 'TinySegmenter (fast)'} tokenizer`);
    
    let sentences = [];
    
    // Fetch sentences from selected source
    if (source === 'immersionkit') {
      sentences = await immersionKitService.searchByWords(knownWords, {
        limit: options.limit || 100,
        category: options.category || 'all'
      });
    } else {
      sentences = await tatoebaService.searchSentences({
        limit: options.limit || 100,
        wordCount: options.wordCount || '-15', // 15 words or less
        hasAudio: options.hasAudio !== false // Default to true for better experience
      });
    }
    
    console.log(`Fetched ${sentences.length} sentences from ${source}`);
    
    // Filter and sort by known word coverage
    const filtered = await tatoebaService.filterSentencesByKnownWords(sentences, knownWords, cards, tokenizer);
    
    console.log(`Filtered to ${filtered.length} sentences containing known words`);
    
    // Apply coverage filter if specified
    const minCoverage = options.minCoverage !== undefined ? options.minCoverage : 0;
    const maxCoverage = options.maxCoverage !== undefined ? options.maxCoverage : 100;
    
    const coverageFiltered = filtered.filter(sentence => {
      const coverage = sentence.wordAnalysis.coverage;
      return coverage >= minCoverage && coverage <= maxCoverage;
    });
    
    console.log(`After coverage filter (${minCoverage}%-${maxCoverage}%): ${coverageFiltered.length} sentences`);
    
    return coverageFiltered;
  } catch (error) {
    console.error('Error getting example sentences:', error);
    throw error;
  }
};

// Re-export other utilities that might be needed
export { extractKnownWordsFromCards } from './tatoebaService';
