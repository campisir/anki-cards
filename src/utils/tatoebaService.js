/**
 * Service for fetching example sentences from Tatoeba API
 */

import TinySegmenter from 'tiny-segmenter';
import kuromoji from 'kuromoji';

const TATOEBA_API_BASE = 'https://api.tatoeba.org/unstable';
const tinySegmenter = new TinySegmenter();

// Kuromoji tokenizer (lazy loaded)
let kuromojiTokenizer = null;
let kuromojiLoading = false;

/**
 * Initialize Kuromoji tokenizer (async)
 * @returns {Promise<Object>} Kuromoji tokenizer instance
 */
const getKuromojiTokenizer = async () => {
  if (kuromojiTokenizer) {
    return kuromojiTokenizer;
  }

  if (kuromojiLoading) {
    // Wait for existing load to complete
    while (kuromojiLoading) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    return kuromojiTokenizer;
  }

  kuromojiLoading = true;
  
  return new Promise((resolve, reject) => {
    kuromoji.builder({ dicPath: '/dict/' }).build((err, tokenizer) => {
      kuromojiLoading = false;
      if (err) {
        console.error('Failed to load Kuromoji:', err);
        reject(err);
      } else {
        kuromojiTokenizer = tokenizer;
        resolve(tokenizer);
      }
    });
  });
};

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
    const url = `${TATOEBA_API_BASE}/sentences?${params}`;
    console.log('Tatoeba API URL:', url);
    
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`API request failed: ${response.status}`);
    }

    const data = await response.json();
    console.log('Tatoeba API response:', data);
    return data.data || [];
  } catch (error) {
    console.error('Error searching sentences:', error);
    throw error;
  }
};

/**
 * Extract Japanese words from a sentence using TinySegmenter
 * @param {string} text - Japanese sentence
 * @returns {Array<Object>} Array of token objects (TinySegmenter can't get basic forms, so both are the same)
 */
export const extractJapaneseWordsTiny = (text) => {
  // Remove common punctuation but keep the text structure
  const cleaned = text.replace(/[。、！？\s]/g, '');
  
  // Use TinySegmenter to tokenize the sentence
  const tokens = tinySegmenter.segment(cleaned);
  
  // Filter out empty tokens and return as objects for consistency
  return tokens
    .filter(token => token.length > 0)
    .map(token => ({
      surface: token,
      basic: token  // TinySegmenter doesn't provide dictionary forms
    }));
};

/**
 * Extract Japanese words from a sentence using Kuromoji
 * @param {string} text - Japanese sentence
 * @returns {Promise<Array<Object>>} Array of token objects with surface_form and basic_form
 */
export const extractJapaneseWordsKuromoji = async (text) => {
  const tokenizer = await getKuromojiTokenizer();
  
  // Remove common punctuation
  const cleaned = text.replace(/[。、！？\s]/g, '');
  
  // Tokenize with Kuromoji
  const rawTokens = tokenizer.tokenize(cleaned);
  
  // Combine verb stems with auxiliaries to form complete words
  const combinedTokens = [];
  let i = 0;
  
  while (i < rawTokens.length) {
    const token = rawTokens[i];
    const nextToken = rawTokens[i + 1];
    
    // Check if this is a verb followed by auxiliary verbs or auxiliaries
    const isVerb = token.pos === '動詞';
    const isNounVerb = token.pos === '名詞' && nextToken && nextToken.pos === '動詞';
    const hasAuxiliary = nextToken && (
      nextToken.pos === '助動詞' || 
      (nextToken.pos === '動詞' && nextToken.pos_detail_1 === '非自立') ||
      (nextToken.pos === '動詞' && nextToken.pos_detail_1 === '接尾')
    );
    
    if ((isVerb || isNounVerb) && hasAuxiliary) {
      // Combine them
      let combinedSurface = token.surface_form + nextToken.surface_form;
      let combinedBasic = token.basic_form;
      let skip = 1;
      
      // Keep combining if there are more auxiliaries (ます, た, れる, etc.)
      let j = i + 2;
      while (j < rawTokens.length) {
        const auxToken = rawTokens[j];
        const isAux = auxToken.pos === '助動詞' || 
                     (auxToken.pos === '動詞' && auxToken.pos_detail_1 === '非自立') ||
                     (auxToken.pos === '動詞' && auxToken.pos_detail_1 === '接尾');
        
        if (isAux) {
          combinedSurface += auxToken.surface_form;
          skip++;
          j++;
        } else {
          break;
        }
      }
      
      combinedTokens.push({
        surface: combinedSurface,
        basic: combinedBasic || combinedSurface
      });
      
      i += skip + 1;
    } else {
      combinedTokens.push({
        surface: token.surface_form,
        basic: token.basic_form || token.surface_form
      });
      i++;
    }
  }
  
  return combinedTokens.filter(t => t.surface.length > 0);
};

/**
 * Extract Japanese words from a sentence using selected tokenizer
 * @param {string} text - Japanese sentence
 * @param {string} tokenizer - 'tiny' or 'kuromoji'
 * @returns {Promise<Array<Object>>|Array<Object>} Array of token objects with surface and basic forms
 */
export const extractJapaneseWords = (text, tokenizer = 'tiny') => {
  if (tokenizer === 'kuromoji') {
    return extractJapaneseWordsKuromoji(text);
  }
  return extractJapaneseWordsTiny(text);
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
 * Check if a sentence contains known words using proper tokenization
 * @param {string} sentenceText - The Japanese sentence text
 * @param {Array<string>} knownWords - Array of known words/kanji from deck
 * @param {Array} cards - Full card collection to find matching cards
 * @param {string} tokenizer - 'tiny' or 'kuromoji'
 * @returns {Promise<Object>} { containsOnly: boolean, knownWords: Array, unknownWords: Array }
 */
export const analyzeSentenceWords = async (sentenceText, knownWords, cards, tokenizer = 'tiny') => {
  // Get all tokens including particles (returns array of {surface, basic} objects)
  const allTokens = await extractJapaneseWords(sentenceText, tokenizer);
  
  // Create a map of known words to their cards for lookup
  const knownWordsMap = new Map();
  cards.forEach(card => {
    const getField = (card, index) => (card.fields ? card.fields[index] : card[index]);
    const word = getField(card, 0);
    if (word) {
      const cleaned = word.replace(/<[^>]*>/g, '').trim();
      if (cleaned) {
        knownWordsMap.set(cleaned.toLowerCase(), card);
        // Also map individual kanji
        for (const char of cleaned) {
          if (char.match(/[\u4e00-\u9faf]/)) {
            if (!knownWordsMap.has(char.toLowerCase())) {
              knownWordsMap.set(char.toLowerCase(), card);
            }
          }
        }
      }
    }
  });
  
  // Particle pattern for identifying omitted tokens
  const particlePattern = /^[はがをにへとでやのもからまでより]$/;
  
  const found = [];
  const unknown = [];
  const allTokensWithStatus = [];
  
  // Check each token and assign status
  allTokens.forEach(tokenObj => {
    const surface = tokenObj.surface;
    const basic = tokenObj.basic;
    const normalizedSurface = surface.toLowerCase().trim();
    const normalizedBasic = basic.toLowerCase().trim();
    let status;
    let matchedCard = null;
    
    if (particlePattern.test(surface)) {
      // Particle or common omitted token
      status = 'omitted';
    } else if (knownWordsMap.has(normalizedBasic) || knownWordsMap.has(normalizedSurface)) {
      // Match either the dictionary form or surface form
      status = 'known';
      matchedCard = knownWordsMap.get(normalizedBasic) || knownWordsMap.get(normalizedSurface);
      found.push(surface);
    } else {
      // Unknown word
      status = 'unknown';
      unknown.push(surface);
    }
    
    allTokensWithStatus.push({ 
      token: surface, 
      basicForm: basic,
      status,
      matchedCard
    });
  });
  
  // Remove duplicates from found/unknown lists
  const uniqueFound = [...new Set(found)];
  const uniqueUnknown = [...new Set(unknown)];
  
  // Calculate coverage (percentage of meaningful tokens that are known)
  const meaningfulTokens = allTokensWithStatus.filter(t => t.status !== 'omitted');
  const coverage = meaningfulTokens.length > 0 
    ? (uniqueFound.length / meaningfulTokens.length) * 100 
    : 0;
  
  return {
    containsOnly: uniqueUnknown.length === 0 && meaningfulTokens.length > 0,
    knownWords: uniqueFound,
    unknownWords: uniqueUnknown,
    coverage: coverage,
    allTokens: allTokensWithStatus
  };
};

/**
 * Filter sentences that contain at least one known word
 * @param {Array} sentences - Array of Tatoeba sentence objects
 * @param {Array<string>} knownWords - Array of known words from user's deck
 * @param {Array} cards - Full card collection
 * @param {string} tokenizer - 'tiny' or 'kuromoji'
 * @returns {Promise<Array>} Filtered sentences with word analysis
 */
export const filterSentencesByKnownWords = async (sentences, knownWords, cards, tokenizer = 'tiny') => {
  const analyzed = await Promise.all(
    sentences.map(async (sentence) => {
      const analysis = await analyzeSentenceWords(sentence.text, knownWords, cards, tokenizer);
      return {
        ...sentence,
        wordAnalysis: analysis
      };
    })
  );
  
  return analyzed
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
 * @returns {Promise<Array>} Array of filtered sentences
 */
export const getExampleSentencesForStudy = async (cards, cardLimit, options = {}) => {
  try {
    const tokenizer = options.tokenizer || 'tiny';
    
    // Extract known words from cards
    const knownWords = extractKnownWordsFromCards(cards, cardLimit);
    
    console.log(`Found ${knownWords.length} known words from ${cardLimit} cards`);
    console.log(`Using ${tokenizer === 'kuromoji' ? 'Kuromoji (accurate)' : 'TinySegmenter (fast)'} tokenizer`);
    
    // Fetch sentences from Tatoeba
    const sentences = await searchSentences({
      limit: options.limit || 100,
      wordCount: options.wordCount || '-15', // 15 words or less
      hasAudio: options.hasAudio || false
    });
    
    console.log(`Fetched ${sentences.length} sentences from Tatoeba`);
    
    // Filter and sort by known word coverage
    const filtered = await filterSentencesByKnownWords(sentences, knownWords, cards, tokenizer);
    
    console.log(`Filtered to ${filtered.length} sentences containing known words`);
    
    return filtered;
  } catch (error) {
    console.error('Error getting example sentences:', error);
    throw error;
  }
};
