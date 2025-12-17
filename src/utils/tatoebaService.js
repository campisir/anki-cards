/**
 * Service for fetching example sentences from Tatoeba API
 */

import TinySegmenter from 'tiny-segmenter';

const TATOEBA_API_BASE = 'https://api.tatoeba.org/unstable';
const segmenter = new TinySegmenter();

/**
 * Search for Japanese sentences with English translations
 * @param {Object} options - Search options
 * @param {number} options.limit - Maximum number of sentences to return
 * @param {string} options.wordCount - Word count range (e.g., "-10" for 10 or fewer)
 * @param {boolean} options.hasAudio - Whether sentences must have audio
 * @returns {Promise<Array>} Array of sentence objects
 */
export const searchSentences = async (options = {}) => {
  const {
    limit = 100,
    wordCount = null,
    hasAudio = false,
    query = null
  } = options;

  // Build query parameters
  const params = new URLSearchParams({
    lang: 'jpn',
    sort: 'random',
    limit: limit.toString(),
    'showtrans:lang': 'eng',
    'showtrans:is_direct': 'yes',
    'trans:lang': 'eng',
    'trans:is_direct': 'yes'
  });

  if (wordCount) {
    params.append('word_count', wordCount);
  }

  if (hasAudio) {
    params.append('has_audio', 'yes');
  }

  if (query) {
    params.append('q', query);
  }

  try {
    const response = await fetch(`${TATOEBA_API_BASE}/sentences?${params.toString()}`);
    
    if (!response.ok) {
      throw new Error(`Tatoeba API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return data.data || [];
  } catch (error) {
    console.error('Error fetching sentences from Tatoeba:', error);
    throw error;
  }
};

/**
 * Get audio file for a specific sentence
 * @param {number} audioId - The audio ID from Tatoeba
 * @returns {Promise<Blob>} Audio file as blob
 */
export const getAudioFile = async (audioId) => {
  try {
    const response = await fetch(`${TATOEBA_API_BASE}/audio/${audioId}/file`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch audio: ${response.status}`);
    }

    return await response.blob();
  } catch (error) {
    console.error('Error fetching audio:', error);
    throw error;
  }
};

/**
 * Extract Japanese words from a sentence using proper tokenization
 * @param {string} text - Japanese sentence
 * @returns {Array<string>} Array of tokenized words
 */
export const extractJapaneseWords = (text) => {
  // Remove common punctuation but keep the text structure
  const cleaned = text.replace(/[。、！？\s]/g, '');
  
  // Use TinySegmenter to tokenize the sentence
  const tokens = segmenter.segment(cleaned);
  
  // Filter out empty tokens and single character particles
  const meaningfulTokens = tokens.filter(token => 
    token.length > 0 && 
    !/^[はがをにへとでやのもからまでより]$/.test(token) // Common single-char particles
  );
  
  return meaningfulTokens;
};

/**
 * Check if a sentence contains known words using proper tokenization
 * @param {string} sentenceText - The Japanese sentence text
 * @param {Array<string>} knownWords - Array of known words/kanji from deck
 * @returns {Object} { containsOnly: boolean, knownWords: Array, unknownWords: Array }
 */
export const analyzeSentenceWords = (sentenceText, knownWords) => {
  // Tokenize the sentence into words
  const tokens = extractJapaneseWords(sentenceText);
  
  // Create a set of known words for fast lookup (case-insensitive)
  const knownSet = new Set(knownWords.map(w => w.toLowerCase().trim()));
  
  const found = [];
  const unknown = [];
  
  // Check each token against known words (exact match only)
  tokens.forEach(token => {
    const normalizedToken = token.toLowerCase().trim();
    if (knownSet.has(normalizedToken)) {
      // Exact match with a word from deck
      found.push(token);
    } else {
      // Not a known word
      unknown.push(token);
    }
  });
  
  // Remove duplicates
  const uniqueFound = [...new Set(found)];
  const uniqueUnknown = [...new Set(unknown)];
  
  // Calculate coverage (percentage of tokens that are known)
  const coverage = tokens.length > 0 ? (uniqueFound.length / tokens.length) * 100 : 0;
  
  return {
    containsOnly: uniqueUnknown.length === 0 && tokens.length > 0,
    knownWords: uniqueFound,
    unknownWords: uniqueUnknown,
    coverage: coverage
  };
};

/**
 * Filter sentences that contain at least one known word
 * @param {Array} sentences - Array of Tatoeba sentence objects
 * @param {Array<string>} knownWords - Array of known words from user's deck
 * @returns {Array} Filtered sentences with word analysis
 */
export const filterSentencesByKnownWords = (sentences, knownWords) => {
  return sentences
    .map(sentence => {
      const analysis = analyzeSentenceWords(sentence.text, knownWords);
      return {
        ...sentence,
        wordAnalysis: analysis
      };
    })
    .filter(sentence => sentence.wordAnalysis.knownWords.length > 0)
    .sort((a, b) => b.wordAnalysis.coverage - a.wordAnalysis.coverage);
};

/**
 * Extract words/kanji from user's Anki cards
 * @param {Array} cards - Array of card objects
 * @param {number} cardLimit - Maximum card index to include
 * @returns {Array<string>} Array of unique words/kanji
 */
export const extractKnownWordsFromCards = (cards, cardLimit) => {
  const words = new Set();
  
  cards
    .filter(card => card.originalIndex <= cardLimit)
    .forEach(card => {
      // Assuming field 0 is the word/kanji
      const getField = (card, index) => (card.fields ? card.fields[index] : card[index]);
      const word = getField(card, 0);
      
      if (word) {
        // Clean HTML tags if present
        const cleaned = word.replace(/<[^>]*>/g, '').trim();
        if (cleaned) {
          words.add(cleaned);
          
          // Also add individual kanji
          for (const char of cleaned) {
            if (char.match(/[\u4e00-\u9faf]/)) { // Kanji range
              words.add(char);
            }
          }
        }
      }
    });
  
  return Array.from(words);
};

/**
 * Get example sentences for study based on user's known words
 * @param {Array} cards - User's card collection
 * @param {number} cardLimit - Card limit for known words
 * @param {Object} options - Additional options
 * @returns {Promise<Array>} Array of sentences suitable for study
 */
export const getExampleSentencesForStudy = async (cards, cardLimit, options = {}) => {
  try {
    // Extract known words from cards
    const knownWords = extractKnownWordsFromCards(cards, cardLimit);
    
    console.log(`Found ${knownWords.length} known words from ${cardLimit} cards`);
    
    // Fetch sentences from Tatoeba
    const sentences = await searchSentences({
      limit: options.limit || 100,
      wordCount: options.wordCount || '-15', // 15 words or less
      hasAudio: options.hasAudio || false
    });
    
    console.log(`Fetched ${sentences.length} sentences from Tatoeba`);
    
    // Filter and sort by known word coverage
    const filtered = filterSentencesByKnownWords(sentences, knownWords);
    
    console.log(`Filtered to ${filtered.length} sentences containing known words`);
    
    return filtered;
  } catch (error) {
    console.error('Error getting example sentences:', error);
    throw error;
  }
};
