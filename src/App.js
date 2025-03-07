import React, { useState, useEffect } from 'react';
import initSqlJs from 'sql.js';
import JSZip from 'jszip';
import Menu from './components/Menu';
import Study from './components/Study';
import './App.css';

function App() {
  const [cards, setCards] = useState([]);
  const [mediaFiles, setMediaFiles] = useState({});
  const [error, setError] = useState(null);
  const [studyMode, setStudyMode] = useState(false);
  const [loading, setLoading] = useState(true);
  const [numCardsToStudy, setNumCardsToStudy] = useState(1300);
  const [reading, setReading] = useState(1300);
  const [listening, setListening] = useState(0);
  const [picture, setPicture] = useState(0);
  const [blacklist, setBlacklist] = useState('');
  const [important, setImportant] = useState('');

  useEffect(() => {
    let isMounted = true;

    const loadDeck = async () => {
      try {
        const response = await fetch('deck.apkg');
        const arrayBuffer = await response.arrayBuffer();
        const zip = await JSZip.loadAsync(arrayBuffer);

        const mediaJson = zip.file(/^media$/);
        let mediaMap = {};
        if (mediaJson && mediaJson.length > 0) {
          const rawMediaJson = await mediaJson[0].async("string");
          mediaMap = JSON.parse(rawMediaJson); 
        }

        const loadedMedia = {};
        for (const [numericId, realFilename] of Object.entries(mediaMap)) {
          const mediaFileInZip = zip.file(numericId);
          if (mediaFileInZip) {
            const mediaBlob = await mediaFileInZip.async("blob");
            loadedMedia[realFilename] = URL.createObjectURL(mediaBlob);
          }
        }

        if (isMounted) {
          setMediaFiles(loadedMedia);

          const dbFiles = zip.file(/collection\.anki2.*/);
          if (!dbFiles || dbFiles.length === 0) {
            throw new Error("Invalid Anki deck file. Could not find 'collection.anki2*' database.");
          }

          const dbFile = dbFiles[0];
          const dbArrayBuffer = await dbFile.async("arraybuffer");

          const SQL = await initSqlJs({
            locateFile: file => `https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.5.0/sql-wasm.wasm`
          });

          const db = new SQL.Database(new Uint8Array(dbArrayBuffer));
          const res = db.exec("SELECT flds FROM notes");

          if (res.length === 0) {
            throw new Error("No cards found in the notes table.");
          }

          const cardsData = res[0].values.map(row => row[0].split('\x1f'));

          setCards(cardsData);
          setError(null);
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

  const parseRange = (range) => {
    const [start, end] = range.split('-').map(Number);
    return Array.from({ length: end - start + 1 }, (_, i) => start + i);
  };

  const parseCardNumbers = (input) => {
    const numbers = input.split(/[\s,]+/).filter(Boolean);
    const result = [];
    numbers.forEach(num => {
      if (num.includes('-')) {
        result.push(...parseRange(num));
      } else {
        result.push(Number(num));
      }
    });
    return result;
  };

  const handleStartStudy = (numCards, reading, listening, picture, blacklistInput, importantInput) => {
    const blacklist = parseCardNumbers(blacklistInput);
    const important = parseCardNumbers(importantInput);

    const filteredCards = cards.filter((_, index) => !blacklist.includes(index + 1));
    const importantCards = filteredCards.filter((_, index) => important.includes(index + 1));
    const remainingCards = filteredCards.filter((_, index) => !important.includes(index + 1));

    const selectedCards = [...importantCards, ...remainingCards.slice(0, numCards - importantCards.length)];

    setNumCardsToStudy(numCards);
    setReading(reading);
    setListening(listening);
    setPicture(picture);
    setStudyMode(true);
    setCards(selectedCards);
  };

  const handleBackToMenu = () => {
    setStudyMode(false);
  };

  return (
    <div className="App">
      {loading ? (
        <div className="loading">
          <p>Loading Cards...</p>
          <div className="loading-bar">
            <div className="loading-progress"></div>
          </div>
        </div>
      ) : studyMode ? (
        <Study
          cards={cards.slice(0, numCardsToStudy)}
          mediaFiles={mediaFiles}
          reading={reading}
          listening={listening}
          picture={picture}
          onBackToMenu={handleBackToMenu}
        />
      ) : (
        <Menu onStartStudy={handleStartStudy} />
      )}
    </div>
  );
}

export default App;