/**
 * IndexedDB utility for managing the local card database
 */

const DB_NAME = 'AnkiCardsDB';
const DB_VERSION = 1;

// Store names
export const STORES = {
  CARDS: 'cards',
  CONFUSED_CARDS: 'confusedCards',
  METADATA: 'metadata'
};

/**
 * Initialize the IndexedDB database
 * @returns {Promise<IDBDatabase>}
 */
export const initDB = () => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      reject(new Error('Failed to open database'));
    };

    request.onsuccess = (event) => {
      resolve(event.target.result);
    };

    request.onupgradeneeded = (event) => {
      const db = event.target.result;

      // Create cards object store
      if (!db.objectStoreNames.contains(STORES.CARDS)) {
        const cardsStore = db.createObjectStore(STORES.CARDS, { keyPath: 'nid' });
        
        // Create indexes for efficient querying
        cardsStore.createIndex('originalIndex', 'originalIndex', { unique: false });
        cardsStore.createIndex('rank', 'rank', { unique: false });
        cardsStore.createIndex('due', 'due', { unique: false });
      }

      // Create confused cards object store (many-to-many relationship)
      // Each entry: { id, cardId1, cardId2, count }
      if (!db.objectStoreNames.contains(STORES.CONFUSED_CARDS)) {
        const confusedStore = db.createObjectStore(STORES.CONFUSED_CARDS, { 
          keyPath: 'id', 
          autoIncrement: true 
        });
        
        confusedStore.createIndex('cardId1', 'cardId1', { unique: false });
        confusedStore.createIndex('cardId2', 'cardId2', { unique: false });
        confusedStore.createIndex('pair', ['cardId1', 'cardId2'], { unique: true });
      }

      // Create metadata store for tracking import history, settings, etc.
      if (!db.objectStoreNames.contains(STORES.METADATA)) {
        db.createObjectStore(STORES.METADATA, { keyPath: 'key' });
      }
    };
  });
};

/**
 * Get all records from a store
 * @param {string} storeName 
 * @returns {Promise<Array>}
 */
export const getAllRecords = async (storeName) => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([storeName], 'readonly');
    const store = transaction.objectStore(storeName);
    const request = store.getAll();

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onerror = () => {
      reject(new Error(`Failed to get records from ${storeName}`));
    };
  });
};

/**
 * Get a single record by key
 * @param {string} storeName 
 * @param {*} key 
 * @returns {Promise<any>}
 */
export const getRecord = async (storeName, key) => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([storeName], 'readonly');
    const store = transaction.objectStore(storeName);
    const request = store.get(key);

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onerror = () => {
      reject(new Error(`Failed to get record from ${storeName}`));
    };
  });
};

/**
 * Add or update a record
 * @param {string} storeName 
 * @param {*} data 
 * @returns {Promise<void>}
 */
export const putRecord = async (storeName, data) => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([storeName], 'readwrite');
    const store = transaction.objectStore(storeName);
    const request = store.put(data);

    request.onsuccess = () => {
      resolve();
    };

    request.onerror = () => {
      reject(new Error(`Failed to put record in ${storeName}`));
    };
  });
};

/**
 * Add multiple records in a single transaction
 * @param {string} storeName 
 * @param {Array} records 
 * @returns {Promise<void>}
 */
export const putMultipleRecords = async (storeName, records) => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([storeName], 'readwrite');
    const store = transaction.objectStore(storeName);

    let completed = 0;
    const total = records.length;

    records.forEach(record => {
      const request = store.put(record);
      
      request.onsuccess = () => {
        completed++;
        if (completed === total) {
          resolve();
        }
      };

      request.onerror = () => {
        reject(new Error(`Failed to put records in ${storeName}`));
      };
    });

    if (total === 0) {
      resolve();
    }
  });
};

/**
 * Delete a record by key
 * @param {string} storeName 
 * @param {*} key 
 * @returns {Promise<void>}
 */
export const deleteRecord = async (storeName, key) => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([storeName], 'readwrite');
    const store = transaction.objectStore(storeName);
    const request = store.delete(key);

    request.onsuccess = () => {
      resolve();
    };

    request.onerror = () => {
      reject(new Error(`Failed to delete record from ${storeName}`));
    };
  });
};

/**
 * Clear all records from a store
 * @param {string} storeName 
 * @returns {Promise<void>}
 */
export const clearStore = async (storeName) => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([storeName], 'readwrite');
    const store = transaction.objectStore(storeName);
    const request = store.clear();

    request.onsuccess = () => {
      resolve();
    };

    request.onerror = () => {
      reject(new Error(`Failed to clear ${storeName}`));
    };
  });
};

/**
 * Delete the entire database
 * @returns {Promise<void>}
 */
export const deleteDatabase = () => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.deleteDatabase(DB_NAME);

    request.onsuccess = () => {
      resolve();
    };

    request.onerror = () => {
      reject(new Error('Failed to delete database'));
    };

    request.onblocked = () => {
      console.warn('Database deletion blocked. Close all tabs using this database.');
    };
  });
};

/**
 * Get records by index
 * @param {string} storeName 
 * @param {string} indexName 
 * @param {*} value 
 * @returns {Promise<Array>}
 */
export const getRecordsByIndex = async (storeName, indexName, value) => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([storeName], 'readonly');
    const store = transaction.objectStore(storeName);
    const index = store.index(indexName);
    const request = index.getAll(value);

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onerror = () => {
      reject(new Error(`Failed to get records by index from ${storeName}`));
    };
  });
};
