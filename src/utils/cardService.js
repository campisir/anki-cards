/**
 * Service for managing card data and operations
 */

import { 
  getAllRecords, 
  getRecord, 
  putRecord, 
  putMultipleRecords,
  deleteRecord,
  clearStore,
  getRecordsByIndex,
  STORES 
} from './indexedDB';

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
 * Get all cards from the database
 * @returns {Promise<Array>}
 */
export const getAllCards = async () => {
  return await getAllRecords(STORES.CARDS);
};

/**
 * Get a single card by nid
 * @param {number} nid 
 * @returns {Promise<Object>}
 */
export const getCard = async (nid) => {
  return await getRecord(STORES.CARDS, nid);
};

/**
 * Save or update a card
 * @param {Object} card 
 * @returns {Promise<void>}
 */
export const saveCard = async (card) => {
  const cardData = {
    ...card,
    lastModified: Date.now()
  };
  await putRecord(STORES.CARDS, cardData);
};

/**
 * Save multiple cards at once
 * @param {Array} cards 
 * @returns {Promise<void>}
 */
export const saveMultipleCards = async (cards) => {
  const timestamp = Date.now();
  const cardsWithTimestamp = cards.map(card => ({
    ...card,
    lastModified: timestamp
  }));
  await putMultipleRecords(STORES.CARDS, cardsWithTimestamp);
};

/**
 * Update only Anki-specific fields (for selective sync)
 * @param {number} nid 
 * @param {Object} ankiData - { due, interval, factor, repetitions, lapses, reviews }
 * @returns {Promise<void>}
 */
export const updateAnkiStats = async (nid, ankiData) => {
  const existingCard = await getCard(nid);
  
  if (existingCard) {
    // Preserve app-specific data, update only Anki stats
    const updatedCard = {
      ...existingCard,
      due: ankiData.due,
      interval: ankiData.interval,
      factor: ankiData.factor,
      repetitions: ankiData.repetitions,
      lapses: ankiData.lapses,
      reviews: ankiData.reviews,
      lastAnkiSync: Date.now(),
      lastModified: Date.now()
    };
    await putRecord(STORES.CARDS, updatedCard);
  } else {
    // Card doesn't exist, create new one
    const newCard = {
      nid,
      ...ankiData,
      // Initialize app-specific fields
      appAnswerRate: 0,
      appTotalAttempts: 0,
      appCorrectAttempts: 0,
      confusedWith: [],
      lastAnkiSync: Date.now(),
      lastModified: Date.now()
    };
    await putRecord(STORES.CARDS, newCard);
  }
};

/**
 * Update card's app-specific answer statistics
 * @param {number} nid 
 * @param {boolean} wasCorrect 
 * @returns {Promise<void>}
 */
export const updateCardStats = async (nid, wasCorrect) => {
  const card = await getCard(nid);
  
  if (card) {
    const totalAttempts = (card.appTotalAttempts || 0) + 1;
    const correctAttempts = (card.appCorrectAttempts || 0) + (wasCorrect ? 1 : 0);
    const answerRate = Math.round((correctAttempts / totalAttempts) * 100);

    const updatedCard = {
      ...card,
      appTotalAttempts: totalAttempts,
      appCorrectAttempts: correctAttempts,
      appAnswerRate: answerRate,
      lastModified: Date.now()
    };

    await putRecord(STORES.CARDS, updatedCard);
  }
};

/**
 * Record a confusion between two cards
 * @param {number} cardId1 
 * @param {number} cardId2 
 * @returns {Promise<void>}
 */
export const addConfusedCards = async (cardId1, cardId2) => {
  // Ensure consistent ordering (smaller ID first)
  const [smallerId, largerId] = cardId1 < cardId2 ? [cardId1, cardId2] : [cardId2, cardId1];

  try {
    // Check if this pair already exists
    const existingPairs = await getAllRecords(STORES.CONFUSED_CARDS);
    const existingPair = existingPairs.find(
      pair => pair.cardId1 === smallerId && pair.cardId2 === largerId
    );

    if (existingPair) {
      // Increment count
      const updated = {
        ...existingPair,
        count: existingPair.count + 1,
        lastConfused: Date.now()
      };
      await putRecord(STORES.CONFUSED_CARDS, updated);
    } else {
      // Create new confusion record
      const newPair = {
        cardId1: smallerId,
        cardId2: largerId,
        count: 1,
        lastConfused: Date.now()
      };
      await putRecord(STORES.CONFUSED_CARDS, newPair);
    }
  } catch (error) {
    console.error('Error adding confused cards:', error);
  }
};

/**
 * Get all cards confused with a specific card
 * @param {number} cardId 
 * @returns {Promise<Array>}
 */
export const getConfusedCards = async (cardId) => {
  const allPairs = await getAllRecords(STORES.CONFUSED_CARDS);
  
  // Find pairs where this card is involved
  const confusedPairs = allPairs.filter(
    pair => pair.cardId1 === cardId || pair.cardId2 === cardId
  );

  // Extract the other card IDs
  const confusedCardIds = confusedPairs.map(pair => {
    return pair.cardId1 === cardId ? pair.cardId2 : pair.cardId1;
  });

  // Get the full card data
  const confusedCards = await Promise.all(
    confusedCardIds.map(async (nid) => {
      const card = await getCard(nid);
      const pair = confusedPairs.find(p => p.cardId1 === nid || p.cardId2 === nid);
      return {
        ...card,
        confusionCount: pair.count,
        lastConfused: pair.lastConfused
      };
    })
  );

  return confusedCards;
};

/**
 * Delete a card
 * @param {number} nid 
 * @returns {Promise<void>}
 */
export const deleteCard = async (nid) => {
  await deleteRecord(STORES.CARDS, nid);
};

/**
 * Clear all cards from database
 * @returns {Promise<void>}
 */
export const clearAllCards = async () => {
  await clearStore(STORES.CARDS);
};

/**
 * Clear all confused card relationships
 * @returns {Promise<void>}
 */
export const clearAllConfusedCards = async () => {
  await clearStore(STORES.CONFUSED_CARDS);
};

/**
 * Get metadata value
 * @param {string} key 
 * @returns {Promise<any>}
 */
export const getMetadata = async (key) => {
  const record = await getRecord(STORES.METADATA, key);
  return record ? record.value : null;
};

/**
 * Set metadata value
 * @param {string} key 
 * @param {any} value 
 * @returns {Promise<void>}
 */
export const setMetadata = async (key, value) => {
  await putRecord(STORES.METADATA, { key, value, timestamp: Date.now() });
};
