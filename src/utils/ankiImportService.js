/**
 * Service for importing Anki .apkg and .colpkg files into the local database
 * .apkg = deck package (may have incomplete review history)
 * .colpkg = collection package (complete review history)
 * 
 * Supports both old format (zip) and new format (zstd compression)
 */

import initSqlJs from 'sql.js';
import JSZip from 'jszip';
import { unzlib } from 'fflate';
import { decompress as decompressZstd } from 'fzstd';
import { saveMultipleCards, updateAnkiStats, getCard, setMetadata, getMetadata } from './cardService';
import { getFrequencyMap } from './getFrequencyMap';

// Utility function to strip HTML tags from a string
const stripHtmlTags = (html) => {
  const div = document.createElement('div');
  div.innerHTML = html;
  return div.textContent || div.innerText || '';
};

/**
 * Check if data is zstd compressed by checking the magic number
 */
const isZstdCompressed = (data) => {
  if (data.length < 4) return false;
  const view = new DataView(data.buffer || data, data.byteOffset || 0, Math.min(4, data.length));
  const magic = view.getUint32(0, true);
  return magic === 0xFD2FB528; // zstd magic number (little-endian)
};

/**
 * Try to decompress data if it's compressed
 */
const tryDecompress = (data) => {
  const uint8Data = new Uint8Array(data);
  
  // Check for zstd compression
  if (isZstdCompressed(uint8Data)) {
    console.log('Detected zstd compression, decompressing...');
    try {
      return decompressZstd(uint8Data);
    } catch (e) {
      console.error('Zstd decompression failed:', e);
    }
  }
  
  // Try zlib/gzip decompression
  try {
    const decompressed = unzlib(uint8Data);
    console.log('Successfully decompressed with zlib');
    return decompressed;
  } catch (e) {
    // Not compressed or different format, return as-is
    console.log('Data not compressed or using original format');
    return uint8Data;
  }
};

/**
 * Import an Anki .apkg or .colpkg file into the database (full import)
 * This creates new cards or replaces existing ones completely
 * @param {File|string} source - File object or URL to .apkg or .colpkg file
 * @param {Function} progressCallback - Called with progress updates (0-100)
 * @returns {Promise<{cards: number, media: Object}>}
 */
export const importAnkiDeck = async (source, progressCallback = null) => {
  try {
    if (progressCallback) progressCallback(0, 'Loading .apkg file...');

    // Load the .apkg file
    let arrayBuffer;
    if (typeof source === 'string') {
      const response = await fetch(source);
      arrayBuffer = await response.arrayBuffer();
    } else {
      arrayBuffer = await source.arrayBuffer();
    }

    if (progressCallback) progressCallback(10, 'Extracting archive...');

    const zip = await JSZip.loadAsync(arrayBuffer);

    // Load media files
    if (progressCallback) progressCallback(20, 'Loading media files...');
    const mediaJson = zip.file(/^media$/);
    let mediaMap = {};
    if (mediaJson && mediaJson.length > 0) {
      try {
        // Try as string first (old format)
        const rawMediaJson = await mediaJson[0].async("string");
        mediaMap = JSON.parse(rawMediaJson);
        console.log('Loaded media map (old format):', Object.keys(mediaMap).length, 'files');
      } catch (e) {
        console.log('Old format failed, trying decompression...');
        try {
          // If string parsing fails, try decompressing (new format)
          const mediaBuffer = await mediaJson[0].async("arraybuffer");
          const decompressed = tryDecompress(mediaBuffer);
          const decoder = new TextDecoder('utf-8');
          const jsonString = decoder.decode(decompressed);
          mediaMap = JSON.parse(jsonString);
          console.log('Loaded media map (compressed format):', Object.keys(mediaMap).length, 'files');
        } catch (e2) {
          console.warn('Could not parse media file, skipping media:', e2.message);
          // Continue without media - not critical for card data
          mediaMap = {};
        }
      }
    } else {
      console.log('No media file found in archive');
    }

    const loadedMedia = {};
    const mediaEntries = Object.entries(mediaMap);
    for (let i = 0; i < mediaEntries.length; i++) {
      const [numericId, realFilename] = mediaEntries[i];
      const mediaFileInZip = zip.file(numericId);
      if (mediaFileInZip) {
        const mediaBlob = await mediaFileInZip.async("blob");
        // Store the actual blob data, not blob URLs (blob URLs don't persist)
        loadedMedia[realFilename] = mediaBlob;
      }
      
      if (progressCallback && i % 10 === 0) {
        const progress = 20 + Math.floor((i / mediaEntries.length) * 20);
        progressCallback(progress, `Loading media ${i + 1}/${mediaEntries.length}...`);
      }
    }

    console.log('Loaded media files:', Object.keys(loadedMedia).length);
    
    // Save media blobs to metadata (not blob URLs)
    await setMetadata('mediaFiles', loadedMedia);
    console.log('Saved media files to metadata');

    if (progressCallback) progressCallback(40, 'Loading database...');

    // Find and load the database
    const dbFiles = zip.file(/collection\.anki2.*/);
    if (!dbFiles || dbFiles.length === 0) {
      throw new Error("Invalid Anki deck file. Could not find 'collection.anki2*' database.");
    }

    const dbFile = dbFiles[0];
    let dbArrayBuffer = await dbFile.async("arraybuffer");

    // Try to decompress if it's compressed
    if (progressCallback) progressCallback(45, 'Decompressing database if needed...');
    const dbData = tryDecompress(dbArrayBuffer);

    if (progressCallback) progressCallback(50, 'Parsing Anki database...');

    const SQL = await initSqlJs({
      locateFile: file => `https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.5.0/sql-wasm.wasm`
    });

    const db = new SQL.Database(dbData);

    // Extract data from Anki database
    const notesRes = db.exec("SELECT id, flds FROM notes");
    const cardsRes = db.exec("SELECT id, nid, due, ivl, factor, reps, lapses FROM cards");
    const revlogRes = db.exec("SELECT id, cid, ease, ivl, lastIvl, factor, time, type FROM revlog");

    if (notesRes.length === 0 || cardsRes.length === 0 || revlogRes.length === 0) {
      throw new Error("No data found in the notes, cards, or revlog table.");
    }

    if (progressCallback) progressCallback(60, 'Processing cards...');

    // Build notes data map
    const notesData = notesRes[0].values.reduce((acc, row) => {
      acc[row[0]] = row[1].split('\x1f');
      return acc;
    }, {});

    // Build cards data
    const cardsData = cardsRes[0].values.map((row, index) => ({
      cid: row[0], // card ID - needed to match with revlog
      fields: notesData[row[1]],
      nid: row[1],
      due: row[2],
      interval: row[3],
      factor: row[4],
      repetitions: row[5],
      lapses: row[6],
      originalIndex: index + 1
    }));

    // Build review log data - keyed by card ID (cid)
    // Note: revlog ID is in milliseconds since epoch
    const revlogData = revlogRes[0].values.reduce((acc, row) => {
      const [id, cid, ease, ivl, lastIvl, factor, time, type] = row;
      if (!acc[cid]) acc[cid] = [];
      
      // Store timestamp as ISO string for consistent parsing
      const reviewDate = new Date(id);
      
      acc[cid].push({
        timestamp: reviewDate.toISOString(), // ISO format for consistency
        timestampMs: id, // Keep original timestamp for reference
        ease,
        interval: ivl,
        lastInterval: lastIvl,
        factor,
        time: time / 1000,
        type
      });
      return acc;
    }, {});
    
    // Add reviews to cards using card ID (cid)
    const cardsWithRevlog = cardsData.map(card => ({
      ...card,
      reviews: revlogData[card.cid] || []
    }));

    // Merge cards with the same note ID (e.g., listening and reading versions)
    // Keep one card per note, but combine all reviews from all card types
    const uniqueCards = [];
    const cardsByNote = new Map();
    
    cardsWithRevlog.forEach(card => {
      if (!cardsByNote.has(card.nid)) {
        // First card for this note - keep it
        cardsByNote.set(card.nid, card);
        uniqueCards.push(card);
      } else {
        // Another card for the same note (e.g., listening vs reading)
        // Merge its reviews into the first card
        const existingCard = cardsByNote.get(card.nid);
        existingCard.reviews = [...existingCard.reviews, ...card.reviews];
        
        // Also sum up the repetition counts
        existingCard.repetitions += card.repetitions;
        existingCard.lapses += card.lapses;
      }
    });

    if (progressCallback) progressCallback(70, 'Loading frequency data...');

    // Get frequency map
    const frequencyMap = await getFrequencyMap();

    if (progressCallback) progressCallback(80, 'Creating card records...');

    // Create full card objects with app-specific fields initialized
    const cards = uniqueCards.map(card => ({
      ...card,
      rank: frequencyMap[stripHtmlTags(card.fields[0])] || 'N/A',
      // Initialize app-specific fields
      appAnswerRate: 0,
      appTotalAttempts: 0,
      appCorrectAttempts: 0,
      confusedWith: [],
      lastAnkiSync: Date.now(),
      lastModified: Date.now()
    }));

    if (progressCallback) progressCallback(90, `Saving ${cards.length} cards to database...`);

    // Save all cards to IndexedDB
    await saveMultipleCards(cards);

    // Save import metadata
    await setMetadata('lastFullImport', Date.now());
    await setMetadata('totalCards', cards.length);

    if (progressCallback) progressCallback(100, 'Import complete!');

    // Convert blobs to URLs for immediate use (caller can access via getMetadata too)
    const mediaUrls = {};
    for (const [filename, blob] of Object.entries(loadedMedia)) {
      if (blob instanceof Blob) {
        mediaUrls[filename] = URL.createObjectURL(blob);
      }
    }

    return {
      cards: cards.length,
      media: mediaUrls
    };

  } catch (error) {
    console.error('Error importing Anki deck:', error);
    throw error;
  }
};

/**
 * Sync only Anki statistics from a new .apkg file
 * This preserves app-specific data (answer rates, confused cards, etc.)
 * @param {File|string} source - File object or URL to .apkg file
 * @param {Function} progressCallback - Called with progress updates (0-100)
 * @returns {Promise<{updated: number, added: number}>}
 */
export const syncAnkiStats = async (source, progressCallback = null) => {
  try {
    if (progressCallback) progressCallback(0, 'Loading .apkg file...');

    // Load the .apkg file
    let arrayBuffer;
    if (typeof source === 'string') {
      const response = await fetch(source);
      arrayBuffer = await response.arrayBuffer();
    } else {
      arrayBuffer = await source.arrayBuffer();
    }

    if (progressCallback) progressCallback(20, 'Extracting archive...');

    const zip = await JSZip.loadAsync(arrayBuffer);

    // Find and load the database
    const dbFiles = zip.file(/collection\.anki2.*/);
    if (!dbFiles || dbFiles.length === 0) {
      throw new Error("Invalid Anki deck file. Could not find 'collection.anki2*' database.");
    }

    const dbFile = dbFiles[0];
    const dbArrayBuffer = await dbFile.async("arraybuffer");

    if (progressCallback) progressCallback(40, 'Parsing Anki database...');

    const SQL = await initSqlJs({
      locateFile: file => `https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.5.0/sql-wasm.wasm`
    });

    const db = new SQL.Database(new Uint8Array(dbArrayBuffer));

    // Extract Anki stats only
    const cardsRes = db.exec("SELECT nid, due, ivl, factor, reps, lapses FROM cards");
    const revlogRes = db.exec("SELECT id, cid, ease, ivl, lastIvl, factor, time, type FROM revlog");

    if (cardsRes.length === 0 || revlogRes.length === 0) {
      throw new Error("No data found in the cards or revlog table.");
    }

    if (progressCallback) progressCallback(60, 'Processing Anki statistics...');

    // Build review log data
    const revlogData = revlogRes[0].values.reduce((acc, row) => {
      const [id, cid, ease, ivl, lastIvl, factor, time, type] = row;
      if (!acc[cid]) acc[cid] = [];
      acc[cid].push({
        timestamp: new Date(id).toLocaleString(),
        ease,
        interval: ivl,
        lastInterval: lastIvl,
        factor,
        time: time / 1000,
        type
      });
      return acc;
    }, {});

    let updatedCount = 0;
    let addedCount = 0;

    // Update each card's Anki stats
    const totalCards = cardsRes[0].values.length;
    for (let i = 0; i < totalCards; i++) {
      const row = cardsRes[0].values[i];
      const [nid, due, interval, factor, repetitions, lapses] = row;

      const ankiData = {
        due,
        interval,
        factor,
        repetitions,
        lapses,
        reviews: revlogData[nid] || []
      };

      const existingCard = await getCard(nid);
      
      if (existingCard) {
        await updateAnkiStats(nid, ankiData);
        updatedCount++;
      } else {
        // Card doesn't exist in our DB, will be added by updateAnkiStats
        await updateAnkiStats(nid, ankiData);
        addedCount++;
      }

      if (progressCallback && i % 100 === 0) {
        const progress = 60 + Math.floor((i / totalCards) * 30);
        progressCallback(progress, `Syncing card ${i + 1}/${totalCards}...`);
      }
    }

    // Save sync metadata
    await setMetadata('lastAnkiSync', Date.now());

    if (progressCallback) progressCallback(100, 'Sync complete!');

    return {
      updated: updatedCount,
      added: addedCount
    };

  } catch (error) {
    console.error('Error syncing Anki stats:', error);
    throw error;
  }
};

/**
 * Check if the database has been initialized
 * @returns {Promise<boolean>}
 */
export const isDatabaseInitialized = async () => {
  const lastImport = await getMetadata('lastFullImport');
  return lastImport !== null;
};

/**
 * Get import history
 * @returns {Promise<Object>}
 */
export const getImportHistory = async () => {
  const lastFullImport = await getMetadata('lastFullImport');
  const lastAnkiSync = await getMetadata('lastAnkiSync');
  const totalCards = await getMetadata('totalCards');

  return {
    lastFullImport,
    lastAnkiSync,
    totalCards
  };
};
