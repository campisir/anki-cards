import React, { useState, useEffect } from 'react';
import initSqlJs from 'sql.js';
import JSZip from 'jszip';
import Menu from './components/Menu';
import Study from './components/Study';
import CardsTable from './components/CardsTable';
import TimedListening from './components/TimedListening';
import { getFrequencyMap } from './utils/getFrequencyMap';
import './App.css';

// Utility function to strip HTML tags from a string
const stripHtmlTags = (html) => {
  const div = document.createElement('div');
  div.innerHTML = html;
  return div.textContent || div.innerText || '';
};

function App() {
  const [originalCards, setOriginalCards] = useState([]); // unsorted, original order
  const [cards, setCards] = useState([]); // sorted by frequency for table view
  const [mediaFiles, setMediaFiles] = useState({});
  const [error, setError] = useState(null);
  const [studyMode, setStudyMode] = useState(false);
  const [loading, setLoading] = useState(true);
  const [cardLimit, setCardLimit] = useState(5999);
  const [reading, setReading] = useState(0);
  const [listening, setListening] = useState(0);
  const [picture, setPicture] = useState(0);
  const [blacklist, setBlacklist] = useState('');
  const [important, setImportant] = useState('');
  const [gradedMode, setGradedMode] = useState(false);
  const [showTable, setShowTable] = useState(false);
  const [timedListeningMode, setTimedListeningMode] = useState(false);
  const [timedListeningCards, setTimedListeningCards] = useState([]);
  const [timedListeningTimeLimit, setTimedListeningTimeLimit] = useState(10);

  // Define onStartTimedListening callback
  const handleStartTimedListening = (cardsForListening, timeLimit) => {
    setTimedListeningCards(cardsForListening);
    setTimedListeningTimeLimit(timeLimit);
    setTimedListeningMode(true);
  };

  useEffect(() => {
    let isMounted = true;

    const loadDeck = async () => {
      try {
        const response = await fetch('deck.apkg');
        const arrayBuffer = await response.arrayBuffer();
        const zip = await JSZip.loadAsync(arrayBuffer);

        // Load media
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

          // Find the DB file
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
          const notesRes = db.exec("SELECT id, flds FROM notes");
          const cardsRes = db.exec("SELECT nid, due, ivl, factor, reps, lapses FROM cards");
          const revlogRes = db.exec("SELECT id, cid, ease, ivl, lastIvl, factor, time, type FROM revlog");

          if (notesRes.length === 0 || cardsRes.length === 0 || revlogRes.length === 0) {
            throw new Error("No data found in the notes, cards, or revlog table.");
          }

          const notesData = notesRes[0].values.reduce((acc, row) => {
            acc[row[0]] = row[1].split('\x1f');
            return acc;
          }, {});

          const cardsData = cardsRes[0].values.map((row, index) => ({
            ...notesData[row[0]],
            nid: row[0],
            due: row[1],
            interval: row[2],
            factor: row[3],
            repetitions: row[4],
            lapses: row[5],
            originalIndex: index + 1
          }));

          const revlogData = revlogRes[0].values.reduce((acc, row) => {
            const [id, cid, ease, ivl, lastIvl, factor, time, type] = row;
            if (!acc[cid]) acc[cid] = [];
            acc[cid].push({
              timestamp: new Date(id).toLocaleString(),
              ease,
              interval: ivl,
              lastInterval: lastIvl,
              factor,
              time: time / 1000, // convert to seconds
              type
            });
            return acc;
          }, {});

          const cardsWithRevlog = cardsData.map(card => ({
            ...card,
            reviews: revlogData[card.nid] || []
          }));

          // Get the frequency map from the Excel file.
          // The frequency map keys are Japanese words (without HTML tags) and the value is the rank (lower means higher frequency).
          const uniqueCardsWithRevlog = [];
const seenNotes = new Set();
cardsWithRevlog.forEach(card => {
  if (!seenNotes.has(card.nid)) {
    seenNotes.add(card.nid);
    uniqueCardsWithRevlog.push(card);
  }
});

// Get the frequency map from the Excel file.
const frequencyMap = await getFrequencyMap();

// Compute unsorted cards with a rank property (using stripped text)
const unsortedCardsWithRevlog = uniqueCardsWithRevlog.map(card => ({
  ...card,
  rank: frequencyMap[stripHtmlTags(card[0])] || 'N/A'
}));

// Compute a sorted copy (by frequency rank) for table display.
const sortedCardsWithRevlog = [...unsortedCardsWithRevlog].sort((a, b) => {
  const aRank = frequencyMap[stripHtmlTags(a[0])] || Infinity;
  const bRank = frequencyMap[stripHtmlTags(b[0])] || Infinity;
  return aRank - bRank;
});

if (isMounted) {
  // Preserve original (unsorted) order and also store the sorted copy.
  setOriginalCards(unsortedCardsWithRevlog);
  setCards(sortedCardsWithRevlog);
  setCardLimit(sortedCardsWithRevlog.length);
  setReading(sortedCardsWithRevlog.length);
  setError(null);
}
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

    // Filter cards based on the card limit (using original, unsorted cards)
    const limitedCards = originalCards.filter(card => card.originalIndex <= cardLimit);

    // Apply blacklist and important card logic
    const filteredCards = limitedCards.filter(card => !blacklist.includes(card.originalIndex));
    const importantCards = filteredCards.filter(card => important.includes(card.originalIndex));
    const remainingCards = filteredCards.filter(card => !important.includes(card.originalIndex));

    // Shuffle the remaining cards
    const shuffledRemainingCards = shuffleArray(remainingCards);

    // Select the required number of cards
    const selectedCards = [
      ...importantCards,
      ...shuffledRemainingCards.slice(0, reading + listening + picture - importantCards.length)
    ];

    // Shuffle the selected cards for the study session
    const shuffledSelectedCards = shuffleArray(selectedCards);

    setCardLimit(cardLimit);
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
    setShowTable(false);
    setTimedListeningMode(false);
  };

  const handleShowCardsTable = () => {
    // Filter the original cards based on the current card limit.
    const filteredCards = originalCards.filter(card => card.originalIndex <= cardLimit);
    // Sort the filtered cards by rank. (Assuming card.rank is a number or 'N/A')
    const sortedFilteredCards = [...filteredCards].sort((a, b) => {
      const aRank = typeof a.rank === 'number' ? a.rank : Infinity;
      const bRank = typeof b.rank === 'number' ? b.rank : Infinity;
      return aRank - bRank;
    });
    // Update the cards state that is passed to the table.
    setCards(sortedFilteredCards);
    setShowTable(true);
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
      ) : timedListeningMode ? (
        <TimedListening
          cards={timedListeningCards}
          mediaFiles={mediaFiles}
          timeLimit={timedListeningTimeLimit}
          onBackToMenu={handleBackToMenu}
        />
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
      ) : showTable ? (
        // Pass the sorted cards (cards state) so the table shows frequency order.
        <CardsTable
          cards={cards}
          mediaFiles={mediaFiles}
          onBackToMenu={handleBackToMenu}
        />
      ) : (
        <Menu
          onStartStudy={handleStartStudy}
          onShowCardsTable={handleShowCardsTable}
          onStartTimedListening={handleStartTimedListening} // <-- here is your onStartTimedListening prop
          cardLimit={cardLimit}
          reading={reading}
          listening={listening}
          picture={picture}
          blacklist={blacklist}
          important={important}
          gradedMode={gradedMode}
          maxCards={originalCards.length}
          originalCards={originalCards}
        />
      )}
    </div>
  );
}

export default App;