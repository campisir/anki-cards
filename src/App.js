import React, { useState, useEffect } from 'react';
import initSqlJs from 'sql.js';
import JSZip from 'jszip';
import Study from './components/Study';
import './App.css';

const NUM_CARDS_TO_STUDY = 1300; // Define the number of cards to study

function App() {
  const [cards, setCards] = useState([]);
  const [mediaFiles, setMediaFiles] = useState({});
  const [error, setError] = useState(null);
  const [studyMode, setStudyMode] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const loadDeck = async () => {
      try {
        const response = await fetch('deck.apkg');
        const arrayBuffer = await response.arrayBuffer();
        const zip = await JSZip.loadAsync(arrayBuffer);

        // See what's in the ZIP (for debugging)
        const zipEntries = zip.file(/.*/g).map(fileObj => fileObj.name);
        console.log("Files in the ZIP:", zipEntries);

        // ---------------------------------------------------------------------
        // 1) Parse the "media" JSON file at the root, which maps numeric IDs to filenames
        // ---------------------------------------------------------------------
        // A standard .apkg has:
        //   - collection.anki2 (or .anki21b)
        //   - media (a JSON file, no extension)
        //   - numeric files (0, 1, 2, etc.) for each piece of media
        // Check for a file named exactly "media" (no extension).
        const mediaJson = zip.file(/^media$/);
        let mediaMap = {};
        if (mediaJson && mediaJson.length > 0) {
          const rawMediaJson = await mediaJson[0].async("string");
          mediaMap = JSON.parse(rawMediaJson); 
          // e.g. { "0": "audio1.mp3", "1": "image.png", ... }
        }

        // ---------------------------------------------------------------------
        // 2) Build an object that maps "actualFilename" -> Blob URL
        // ---------------------------------------------------------------------
        const loadedMedia = {};

        // For each numeric ID: "0", "1", "2", etc. => real filename like "audio1.mp3"
        for (const [numericId, realFilename] of Object.entries(mediaMap)) {
          // The Anki .apkg has a file named exactly numericId, e.g. "0", "1", etc.
          const mediaFileInZip = zip.file(numericId);
          if (mediaFileInZip) {
            // Convert it to a Blob and make a browser URL
            const mediaBlob = await mediaFileInZip.async("blob");
            loadedMedia[realFilename] = URL.createObjectURL(mediaBlob);
          }
        }

        if (isMounted) {
          setMediaFiles(loadedMedia);

          // ---------------------------------------------------------------------
          // 3) Find the Anki DB (collection.anki2 / collection.anki21b / etc.)
          // ---------------------------------------------------------------------
          const dbFiles = zip.file(/collection\.anki2.*/);
          if (!dbFiles || dbFiles.length === 0) {
            throw new Error("Invalid Anki deck file. Could not find 'collection.anki2*' database.");
          }

          const dbFile = dbFiles[0];
          const dbArrayBuffer = await dbFile.async("arraybuffer");

          // ---------------------------------------------------------------------
          // 4) Initialize and query the Anki database
          // ---------------------------------------------------------------------
          const SQL = await initSqlJs({
            locateFile: file => `https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.5.0/sql-wasm.wasm`
          });

          const db = new SQL.Database(new Uint8Array(dbArrayBuffer));
          const res = db.exec("SELECT flds FROM notes");

          if (res.length === 0) {
            throw new Error("No cards found in the notes table.");
          }

          // Split fields by the '\x1f' separator
          const cardsData = res[0].values.map(row => row[0].split('\x1f'));
          console.log("Extracted cards data:", cardsData);

          setCards(cardsData);
          setError(null);
          setStudyMode(true); // Switch to study mode
        }
      } catch (err) {
        console.error("Error loading the database:", err);
        if (isMounted) {
          setError("Failed to load the database. Please make sure the file is a valid Anki deck.");
          setCards([]);
          setMediaFiles({});
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadDeck();

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <div className="App">
      {loading ? (
        <div className="loading">
          <p>Loading...</p>
          <div className="loading-bar">
            <div className="loading-progress"></div>
          </div>
        </div>
      ) : studyMode ? (
        <Study cards={cards.slice(0, NUM_CARDS_TO_STUDY)} mediaFiles={mediaFiles} />
      ) : (
        <header className="App-header">
          <h1>Anki Deck Viewer</h1>
          {error && <p className="error">{error}</p>}
        </header>
      )}
    </div>
  );
}

export default App;