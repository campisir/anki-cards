/**
 * Service for fetching example sentences from Immersion Kit API
 * Real Japanese sentences from anime, dramas, and movies with native audio
 * Note: Using CORS proxy to bypass browser restrictions
 */

const IMMERSIONKIT_API_BASE = 'https://apiv2.immersionkit.com';
const CORS_PROXY = 'https://corsproxy.io/?';

/**
 * Search for Japanese sentences from anime/drama/movies
 * @param {Object} options - Search options
 * @param {number} options.limit - Maximum number of sentences to return
 * @param {string} options.category - 'anime', 'drama', 'games', or 'all'
 * @returns {Promise<Array>} Array of sentence objects
 */
export const searchSentences = async (options = {}) => {
  const {
    limit = 100,
    category = 'all'
  } = options;

  try {
    const params = new URLSearchParams({
      q: '',
      index: category !== 'all' ? category : '',
      exactMatch: 'false',
      limit: limit.toString(),
      sort: 'sentence_length:asc'
    });

    const url = `${IMMERSIONKIT_API_BASE}/search?${params}`;
    const response = await fetch(`${CORS_PROXY}${encodeURIComponent(url)}`);
    
    if (!response.ok) {
      throw new Error(`API request failed: ${response.status}`);
    }

    const data = await response.json();
    
    // Transform Immersion Kit format to match our internal format
    const sentences = (data.examples || []).map(item => ({
      id: item.id,
      text: item.sentence,
      lang: 'jpn',
      translations: item.translation ? [{ text: item.translation, lang: 'eng' }] : [],
      audios: item.sound ? [{
        id: item.id,
        download_url: `https://objects.immersionkit.com/${item.sound}`
      }] : [],
      source: {
        type: item.title || 'unknown',
        deck_name: item.title || 'Unknown',
        image_url: item.image ? `https://objects.immersionkit.com/${item.image}` : null
      }
    }));

    console.log(`Immersion Kit API response:`, data);
    return sentences;
  } catch (error) {
    console.error('Error searching Immersion Kit sentences:', error);
    throw error;
  }
};

/**
 * Search for sentences containing specific words
 * @param {Array<string>} words - Words to search for
 * @param {Object} options - Additional options
 * @returns {Promise<Array>} Array of sentence objects
 */
export const searchByWords = async (words, options = {}) => {
  const {
    limit = 100,
    category = 'all'
  } = options;

  try {
    // Search for multiple words and combine results
    const allSentences = [];
    const seen = new Set();

    // Sample a few random words to search for
    const sampleSize = Math.min(20, words.length);
    const sampledWords = [];
    for (let i = 0; i < sampleSize; i++) {
      const randomIndex = Math.floor(Math.random() * words.length);
      sampledWords.push(words[randomIndex]);
    }

    for (const word of sampledWords) {
      const params = new URLSearchParams({
        q: word,
        index: category !== 'all' ? category : '',
        exactMatch: 'false',
        limit: '20',
        sort: 'sentence_length:asc'
      });

      const url = `${IMMERSIONKIT_API_BASE}/search?${params}`;
      const response = await fetch(`${CORS_PROXY}${encodeURIComponent(url)}`);
      
      if (!response.ok) {
        continue; // Skip failed requests
      }

      const data = await response.json();
      const examples = data.examples || [];

      // Add unique sentences
      for (const item of examples) {
        if (!seen.has(item.id) && allSentences.length < limit) {
          seen.add(item.id);
          allSentences.push({
            id: item.id,
            text: item.sentence,
            lang: 'jpn',
            translations: item.translation ? [{ text: item.translation, lang: 'eng' }] : [],
            audios: item.sound ? [{
              id: item.id,
              download_url: `https://objects.immersionkit.com/${item.sound}`
            }] : [],
            source: {
              type: item.title || 'unknown',
              deck_name: item.title || 'Unknown',
              image_url: item.image ? `https://objects.immersionkit.com/${item.image}` : null
            }
          });
        }
      }

      if (allSentences.length >= limit) {
        break;
      }
    }

    console.log(`Found ${allSentences.length} unique sentences from Immersion Kit`);
    return allSentences;
  } catch (error) {
    console.error('Error searching Immersion Kit by words:', error);
    throw error;
  }
};
