import React, { useState, useEffect } from 'react';
import initSqlJs from 'sql.js';
import JSZip from 'jszip';
import Menu from './components/Menu';
import Study from './components/Study';
import './App.css';

function App() {
  const [originalCards, setOriginalCards] = useState([]);
  const [cards, setCards] = useState([]);
  const [mediaFiles, setMediaFiles] = useState({});
  const [error, setError] = useState(null);
  const [studyMode, setStudyMode] = useState(false);
  const [loading, setLoading] = useState(true);
  const [cardLimit, setCardLimit] = useState(5999); // Default to 5999
  const [reading, setReading] = useState(0);
  const [listening, setListening] = useState(0);
  const [picture, setPicture] = useState(0);
  const [blacklist, setBlacklist] = useState('');
  const [important, setImportant] = useState('');
  const [gradedMode, setGradedMode] = useState(false);

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

          const cardsData = res[0].values.map((row, index) => ({
            ...row[0].split('\x1f'),
            originalIndex: index + 1
          }));

          setOriginalCards(cardsData);
          setCards(cardsData);
          setCardLimit(cardsData.length);
          setReading(cardsData.length);
          setError(null);
        }
      } catch (err) {
        console.error("Error loading the database:", err);
        if (isMounted) {
          setError("Failed to load the database. Please make sure the file is a valid Anki deck.");
          setOriginalCards([]);
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

  const shuffleArray = (array) => {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  };

  const handleStartStudy = (cardLimit, reading, listening, picture, blacklistInput, importantInput, gradedMode) => {
    const blacklist = parseCardNumbers(blacklistInput);
    const important = parseCardNumbers(importantInput);

    // Filter cards based on the card limit
    const limitedCards = originalCards.filter(card => card.originalIndex <= cardLimit);

    // Apply blacklist and important card logic
    const filteredCards = limitedCards.filter(card => !blacklist.includes(card.originalIndex));
    const importantCards = filteredCards.filter(card => important.includes(card.originalIndex));
    const remainingCards = filteredCards.filter(card => !important.includes(card.originalIndex));

    // Shuffle the remaining cards
    const shuffledRemainingCards = shuffleArray(remainingCards);

    // Select the required number of cards
    const selectedCards = [...importantCards, ...shuffledRemainingCards.slice(0, reading + listening + picture - importantCards.length)];

    // Shuffle the selected cards for the study session
    const shuffledSelectedCards = shuffleArray(selectedCards);

    // Debug logging
    console.log("Selected card original indices:", shuffledSelectedCards.map(card => card.originalIndex));

    setCardLimit(cardLimit); // Update cardLimit state
    setReading(reading);
    setListening(listening);
    setPicture(picture);
    setBlacklist(blacklistInput);
    setImportant(importantInput);
    setGradedMode(gradedMode);
    setStudyMode(true);
    setCards(shuffledSelectedCards);
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
          cards={cards}
          mediaFiles={mediaFiles}
          reading={reading}
          listening={listening}
          picture={picture}
          gradedMode={gradedMode}
          onBackToMenu={handleBackToMenu}
        />
      ) : (
        <Menu
          onStartStudy={handleStartStudy}
          cardLimit={cardLimit}
          reading={reading}
          listening={listening}
          picture={picture}
          blacklist={blacklist}
          important={important}
          gradedMode={gradedMode}
          maxCards={originalCards.length}
          originalCards={originalCards} // Pass originalCards to Menu
        />
      )}
    </div>
  );
}

export default App;