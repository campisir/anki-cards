/**
 * Service for managing card data and operations
 * Now uses backend API instead of IndexedDB
 */

import * as api from './apiService';

/**
 * Card data structure:
 * {
 *   nid: number,                    // Anki note ID (primary key)
 *   // Anki fields (from notes table)
 *   fields: string[],               // The field data from Anki (e.g., [word, reading, meaning, ...])
 *   // Anki stats (synced from .apkg)
 *   due: number,                    // Due date
 *   interval: number,               // Current interval
 *   factor: number,                 // Ease factor
 *   repetitions: number,            // Number of repetitions
 *   lapses: number,                 // Number of lapses
 *   reviews: Array,                 // Review history from revlog
 *   // App-specific fields (preserved during sync)
 *   appAnswerRate: number,          // Success rate in this app (0-100)
 *   appTotalAttempts: number,       // Total attempts in this app
 *   appCorrectAttempts: number,     // Correct attempts in this app
 *   confusedWith: number[],         // Array of nids of confused cards
 *   // Metadata
 *   originalIndex: number,          // Original position in deck
 *   rank: number | 'N/A',           // Frequency rank
 *   lastModified: number,           // Timestamp of last update
 *   lastAnkiSync: number            // Timestamp of last Anki data sync
 * }
 */

/**
 * Get all cards from the backend API (fetches all pages)
 * @returns {Promise<Array>}
 */
export const getAllCards = async () => {
  try {
    let allCards = [];
    let page = 1;
    let hasMore = true;
    const perPage = 500; // Fetch 500 cards per request
    
    while (hasMore) {
      const response = await api.getCards({ page, per_page: perPage });
      const cards = response.cards || [];
      allCards = allCards.concat(cards);
      
      // Check if there are more pages
      hasMore = page < (response.pages || 1);
      page++;
    }
    
    // Transform backend format to frontend format
    return allCards.map(card => ({
      ...card,
      // Add camelCase aliases for snake_case fields
      originalIndex: card.original_index,
      easeFactor: card.ease_factor,
      audioFilename: card.audio_filename,
      sentenceAudioFilename: card.sentence_audio_filename,
      imageFilename: card.image_filename,
      lastReviewed: card.last_reviewed,
      sentenceMeaning: card.sentence_meaning,
      sentenceReading: card.sentence_reading,
      // Create fields array for components that expect it (9 fields to match Anki structure)
      // 0: Word, 1: Meaning, 2: Reading, 3: Word audio, 4: Sentence, 5: Sentence reading, 6: Sentence meaning, 7: Sentence audio, 8: Image
      fields: [
        card.word || '',
        card.meaning || '',
        card.reading || '',
        card.audio_filename ? `[sound:${card.audio_filename}]` : '',
        card.sentence || '',
        card.sentence_reading || '',
        card.sentence_meaning || '',
        card.sentence_audio_filename ? `[sound:${card.sentence_audio_filename}]` : '',
        card.image_filename ? `<img src="${card.image_filename}">` : ''
      ],
      // Anki compatibility fields
      repetitions: card.reps,
      factor: card.ease_factor,
    }));
  } catch (error) {
    console.error('Error fetching cards:', error);
    throw error;
  }
};

/**
 * Get a single card by database ID
 * @param {number} cardId - Backend database ID
 * @returns {Promise<Object>}
 */
export const getCard = async (cardId) => {
  try {
    return await api.getCard(cardId);
  } catch (error) {
    console.error('Error fetching card:', error);
    throw error;
  }
};

/**
 * Save or update a card
 * @param {Object} card 
 * @returns {Promise<void>}
 */
export const saveCard = async (card) => {
  try {
    if (card.id) {
      // Update existing card
      await api.updateCard(card.id, card);
    } else {
      // For new cards, use bulk import
      await api.importCards([card]);
    }
  } catch (error) {
    console.error('Error saving card:', error);
    throw error;
  }
};

/**
 * Save multiple cards at once (bulk import)
 * @param {Array} cards 
 * @returns {Promise<void>}
 */
export const saveMultipleCards = async (cards) => {
  try {
    await api.importCards(cards);
  } catch (error) {
    console.error('Error saving multiple cards:', error);
    throw error;
  }
};

/**
 * Update card's app-specific answer statistics
 * @param {number} cardId - Backend database ID 
 * @param {boolean} wasCorrect 
 * @param {number} responseTime - Response time in milliseconds
 * @param {string} studyMode - Study mode type
 * @returns {Promise<void>}
 */
export const updateCardStats = async (cardId, wasCorrect, responseTime = null, studyMode = 'study') => {
  try {
    // Determine quality rating (0-5 scale for Anki compatibility)
    const quality = wasCorrect ? 4 : 2; // 4 = "Good", 2 = "Hard/Failed"
    
    // Record the review
    await api.recordReview(cardId, quality, responseTime, studyMode, wasCorrect);
  } catch (error) {
    console.error('Error updating card stats:', error);
    throw error;
  }
};

/**
 * Record a confusion between two cards
 * @param {number} cardId1 - Backend database ID
 * @param {number} cardId2 - Backend database ID
 * @returns {Promise<void>}
 */
export const addConfusedCards = async (cardId1, cardId2) => {
  try {
    await api.addConfusedPair(cardId1, cardId2);
  } catch (error) {
    console.error('Error adding confused cards:', error);
    throw error;
  }
};

/**
 * Get all cards confused with a specific card
 * @param {number} cardId - Backend database ID
 * @returns {Promise<Array>}
 */
export const getConfusedCards = async (cardId) => {
  try {
    const response = await api.getConfusedPairs();
    const pairs = response.pairs || [];
    
    // Filter pairs involving this card
    const relevantPairs = pairs.filter(
      pair => pair.card_id_1 === cardId || pair.card_id_2 === cardId
    );
    
    return relevantPairs;
  } catch (error) {
    console.error('Error getting confused cards:', error);
    return [];
  }
};

/**
 * Delete a card
 * @param {number} cardId - Backend database ID
 * @returns {Promise<void>}
 */
export const deleteCard = async (cardId) => {
  try {
    await api.deleteCard(cardId);
  } catch (error) {
    console.error('Error deleting card:', error);
    throw error;
  }
};

/**
 * Get review statistics
 * @returns {Promise<Object>}
 */
export const getReviewStats = async () => {
  try {
    return await api.getReviewStats();
  } catch (error) {
    console.error('Error getting review stats:', error);
    return {
      total_reviews: 0,
      correct_reviews: 0,
      accuracy: 0,
      total_cards: 0,
      average_quality: 0
    };
  }
};

/**
 * Get user preferences (metadata replacement)
 * @returns {Promise<Object>}
 */
export const getMetadata = async () => {
  try {
    return await api.getPreferences();
  } catch (error) {
    console.error('Error getting preferences:', error);
    return null;
  }
};

/**
 * Set user preferences (metadata replacement)
 * @param {Object} preferences 
 * @returns {Promise<void>}
 */
export const setMetadata = async (preferences) => {
  try {
    await api.updatePreferences(preferences);
  } catch (error) {
    console.error('Error setting preferences:', error);
    throw error;
  }
};

/**
 * Get audio URL for a card's word
 * @param {number} cardId - Backend database ID
 * @returns {Promise<string>} - Blob URL for the audio
 */
export const getWordAudioUrl = async (cardId) => {
  try {
    return await api.getWordAudio(cardId);
  } catch (error) {
    console.error('Error fetching word audio:', error);
    return null;
  }
};

/**
 * Get audio URL for a card's sentence
 * @param {number} cardId - Backend database ID
 * @returns {Promise<string>} - Blob URL for the audio
 */
export const getSentenceAudioUrl = async (cardId) => {
  try {
    return await api.getSentenceAudio(cardId);
  } catch (error) {
    console.error('Error fetching sentence audio:', error);
    return null;
  }
};

/**
 * Get image URL for a card
 * @param {number} cardId - Backend database ID
 * @returns {Promise<string>} - Blob URL for the image
 */
export const getCardImageUrl = async (cardId) => {
  try {
    return await api.getCardImage(cardId);
  } catch (error) {
    console.error('Error fetching card image:', error);
    return null;
  }
};
