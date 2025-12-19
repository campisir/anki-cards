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
import { saveMultipleCards, getMetadata, setMetadata } from './cardService';
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
    // Include 'ord' (card ordinal/type) to differentiate between reading and listening cards
    const cardsRes = db.exec("SELECT id, nid, ord, due, ivl, factor, reps, lapses FROM cards");
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
      cardOrd: row[2], // card ordinal/type (0 = first card type, 1 = second card type, etc.)
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
        // Tag reviews with study mode based on card ordinal (0 = reading, 1 = listening)
        card.reviews = card.reviews.map(review => ({
          ...review,
          studyMode: card.cardOrd === 0 ? 'reading' : 'listening'
        }));
        cardsByNote.set(card.nid, card);
        uniqueCards.push(card);
      } else {
        // Another card for the same note (e.g., listening vs reading)
        // Merge its reviews into the first card, preserving the card type
        const existingCard = cardsByNote.get(card.nid);
        const taggedReviews = card.reviews.map(review => ({
          ...review,
          studyMode: card.cardOrd === 0 ? 'reading' : 'listening'
        }));
        existingCard.reviews = [...existingCard.reviews, ...taggedReviews];
        
        // Sum up the repetition counts and lapses
        existingCard.repetitions += card.repetitions;
        existingCard.lapses += card.lapses;
        
        // Take the maximum interval and factor (most mature card state)
        existingCard.interval = Math.max(existingCard.interval || 0, card.interval || 0);
        existingCard.factor = Math.max(existingCard.factor || 2500, card.factor || 2500);
        
        // Keep the most recent due date
        if (card.due && (!existingCard.due || card.due > existingCard.due)) {
          existingCard.due = card.due;
        }
      }
    });

    if (progressCallback) progressCallback(70, 'Loading frequency data...');

    // Get frequency map (optional - gracefully handle failure)
    let frequencyMap = {};
    try {
      frequencyMap = await getFrequencyMap();
    } catch (error) {
      console.warn('Could not load frequency map, skipping frequency ranks:', error.message);
      // Continue without frequency data - not critical for import
    }

    if (progressCallback) progressCallback(80, 'Creating card records...');

    // Helper function to convert blob to base64
    const blobToBase64 = (blob) => {
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result.split(',')[1]); // Get base64 part only
        reader.readAsDataURL(blob);
      });
    };

    // Create full card objects formatted for backend API
    const cards = await Promise.all(uniqueCards.map(async card => {
      // Log first card to debug field structure
      if (card.originalIndex === 1) {
        console.log('First card fields:', card.fields);
        console.log('First card stats:', {
          interval: card.interval,
          factor: card.factor,
          repetitions: card.repetitions,
          lapses: card.lapses
        });
        console.log('First card reviews count:', card.reviews?.length || 0);
        if (card.reviews && card.reviews.length > 0) {
          console.log('First review sample:', card.reviews[0]);
        }
      }
      
      // Anki card fields structure (9 fields):
      // 0: Word, 1: Meaning, 2: Reading (with pitch accent), 3: Word audio
      // 4: Example sentence, 5: Sentence reading, 6: Sentence meaning, 7: Sentence audio, 8: Image
      const fields = card.fields || [];
      const [word, meaning, reading, wordAudio, sentence, sentenceReading, sentenceMeaning, sentenceAudio, image] = fields;
      
      // Clean reading field (remove pitch accent SVG and HTML)
      let cleanReading = stripHtmlTags(reading || '');
      
      // De-duplicate reading field if it's repeated (e.g., "さんさん" -> "さん")
      if (cleanReading.length > 0 && cleanReading.length % 2 === 0) {
        const halfLength = cleanReading.length / 2;
        const firstHalf = cleanReading.substring(0, halfLength);
        const secondHalf = cleanReading.substring(halfLength);
        if (firstHalf === secondHalf) {
          cleanReading = firstHalf;
        }
      }
      
      // Extract audio filenames from [sound:xxx.mp3] format
      let audioFilename = null;
      const audioMatch = wordAudio?.match(/\[sound:([^\]]+)\]/);
      if (audioMatch) {
        audioFilename = audioMatch[1];
      }
      
      // Extract sentence audio filename
      let sentenceAudioFilename = null;
      const sentenceAudioMatch = sentenceAudio?.match(/\[sound:([^\]]+)\]/);
      if (sentenceAudioMatch) {
        sentenceAudioFilename = sentenceAudioMatch[1];
      }
      
      // Extract image filename
      let imageFilename = null;
      const imageMatch = image?.match(/src="([^"]+)"/);
      if (imageMatch) {
        imageFilename = imageMatch[1];
      }
      
      // Clean text fields
      const cleanSentence = stripHtmlTags(sentence || '');
      const cleanSentenceMeaning = stripHtmlTags(sentenceMeaning || '');
      
      // Convert media blobs to base64 for upload
      let wordAudioBase64 = null;
      let sentenceAudioBase64 = null;
      let imageBase64 = null;
      
      if (audioFilename && loadedMedia[audioFilename]) {
        wordAudioBase64 = await blobToBase64(loadedMedia[audioFilename]);
      }
      
      if (sentenceAudioFilename && loadedMedia[sentenceAudioFilename]) {
        sentenceAudioBase64 = await blobToBase64(loadedMedia[sentenceAudioFilename]);
      }
      
      if (imageFilename && loadedMedia[imageFilename]) {
        imageBase64 = await blobToBase64(loadedMedia[imageFilename]);
      }
      
      return {
        nid: card.nid,
        word: stripHtmlTags(word || ''),
        reading: cleanReading,
        meaning: stripHtmlTags(meaning || ''),
        sentence: cleanSentence,
        sentence_reading: stripHtmlTags(sentenceReading || ''),
        sentence_meaning: cleanSentenceMeaning,
        audio_filename: audioFilename,
        sentence_audio_filename: sentenceAudioFilename,
        image_filename: imageFilename,
        word_audio: wordAudioBase64,
        sentence_audio: sentenceAudioBase64,
        image: imageBase64,
        original_index: card.originalIndex,
        rank: frequencyMap[stripHtmlTags(word || '')] || null,
        due: card.due ? new Date(card.due).toISOString() : null,
        interval: card.interval || 0,
        ease_factor: (card.factor || 2500) / 1000, // Anki stores as integer (2500 = 2.5)
        reps: card.repetitions || 0,
        lapses: card.lapses || 0,
        tags: '',
        // Include review history from Anki
        reviews: (card.reviews || []).map(review => ({
          timestamp: review.timestamp,
          ease: review.ease,
          interval: review.interval,
          response_time: review.time,
          review_type: review.type,
          ease_factor: review.factor,
          studyMode: review.studyMode // Preserve reading/listening differentiation
        }))
      };
    }));

    if (progressCallback) progressCallback(90, `Saving ${cards.length} cards to backend...`);

    // Debug: Log first card being sent to backend
    if (cards.length > 0) {
      console.log('First card being sent to backend:', cards[0]);
      console.log('First card reviews being sent:', cards[0].reviews?.length || 0);
      if (cards[0].reviews && cards[0].reviews.length > 0) {
        console.log('First review being sent:', cards[0].reviews[0]);
      }
    }

    // Save cards in batches to avoid timeout (100 cards per batch)
    const batchSize = 100;
    const totalBatches = Math.ceil(cards.length / batchSize);
    
    for (let i = 0; i < cards.length; i += batchSize) {
      const batch = cards.slice(i, i + batchSize);
      const batchNum = Math.floor(i / batchSize) + 1;
      
      if (progressCallback) {
        const progress = 90 + Math.floor((batchNum / totalBatches) * 9);
        progressCallback(progress, `Saving batch ${batchNum}/${totalBatches} (${batch.length} cards)...`);
      }
      
      await saveMultipleCards(batch);
    }

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
