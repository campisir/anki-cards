import React, { useState, useEffect } from 'react';
import Menu from './components/Menu';
import Study from './components/Study';
import CardsTable from './components/CardsTable';
import TimedListening from './components/TimedListening';
import ExampleSentences from './components/ExampleSentences';
import Settings from './components/Settings';
import { getAllCards } from './utils/cardService';
import { isDatabaseInitialized, importAnkiDeck } from './utils/ankiImportService';
import { getMetadata } from './utils/cardService';
import { getExampleSentencesForStudy } from './utils/tatoebaService';
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
  const [showSettings, setShowSettings] = useState(false);
  const [timedListeningMode, setTimedListeningMode] = useState(false);
  const [timedListeningCards, setTimedListeningCards] = useState([]);
  const [timedListeningTimeLimit, setTimedListeningTimeLimit] = useState(10);
  const [exampleSentencesMode, setExampleSentencesMode] = useState(false);
  const [exampleSentences, setExampleSentences] = useState([]);
  const [sentenceStudyType, setSentenceStudyType] = useState('reading');
  const [loadingSentences, setLoadingSentences] = useState(false);
  const [dbInitialized, setDbInitialized] = useState(false);

  // Cleanup blob URLs on unmount to prevent memory leaks
  useEffect(() => {
    return () => {
      Object.values(mediaFiles).forEach(url => {
        if (typeof url === 'string' && url.startsWith('blob:')) {
          URL.revokeObjectURL(url);
        }
      });
    };
  }, [mediaFiles]);

  // Define onStartTimedListening callback
  const handleStartTimedListening = (cardsForListening, timeLimit) => {
    setTimedListeningCards(cardsForListening);
    setTimedListeningTimeLimit(timeLimit);
    setTimedListeningMode(true);
  };

  // Define onStartExampleSentences callback
  const handleStartExampleSentences = async (cardLimit, studyType) => {
    setLoadingSentences(true);
    setSentenceStudyType(studyType);
    
    try {
      console.log(`Fetching example sentences for ${cardLimit} cards...`);
      const sentences = await getExampleSentencesForStudy(originalCards, cardLimit, {
        limit: 100,
        wordCount: '-15', // Max 15 words
        hasAudio: studyType === 'listening' || studyType === 'both'
      });
      
      if (sentences.length === 0) {
        alert('Could not find any sentences matching your known words. Try increasing the card limit or adjusting filters.');
        setLoadingSentences(false);
        return;
      }
      
      console.log(`Found ${sentences.length} example sentences`);
      setExampleSentences(sentences);
      setExampleSentencesMode(true);
      setLoadingSentences(false);
    } catch (error) {
      console.error('Error fetching example sentences:', error);
      alert('Failed to fetch example sentences from Tatoeba. Please check your internet connection and try again.');
      setLoadingSentences(false);
    }
  };

  useEffect(() => {
    let isMounted = true;

    const loadData = async () => {
      try {
        // Check if database is initialized
        const initialized = await isDatabaseInitialized();
        setDbInitialized(initialized);

        if (!initialized) {
          // First time setup - automatically import the default deck
          // Try .colpkg first (has complete review history), then fall back to .apkg
          console.log('Database not initialized. Importing default deck...');
          try {
            await importAnkiDeck('deck-collection.colpkg', (progress, message) => {
              console.log(`Import progress: ${progress}% - ${message}`);
            });
          } catch (error) {
            console.log('No .colpkg found, trying .apkg...');
            await importAnkiDeck('deck.apkg', (progress, message) => {
              console.log(`Import progress: ${progress}% - ${message}`);
            });
          }
        }

        // Load cards from IndexedDB
        const cardsFromDB = await getAllCards();
        
        // Load media files from metadata
        const mediaFromDB = await getMetadata('mediaFiles');
        
        console.log('Media files loaded from DB:', mediaFromDB ? Object.keys(mediaFromDB).length : 0, 'files');

        if (isMounted && cardsFromDB.length > 0) {
          // Check review history completeness
          const allReviews = [];
          
          cardsFromDB.forEach(card => {
            if (card.reviews && Array.isArray(card.reviews)) {
              card.reviews.forEach(review => {
                if (review.timestamp) {
                  const date = new Date(review.timestamp);
                  // Anki day boundary: reviews before 4 AM count as previous day
                  const adjustedDate = new Date(date);
                  if (adjustedDate.getHours() < 4) {
                    adjustedDate.setDate(adjustedDate.getDate() - 1);
                  }
                  
                  const year = adjustedDate.getFullYear();
                  const month = String(adjustedDate.getMonth() + 1).padStart(2, '0');
                  const day = String(adjustedDate.getDate()).padStart(2, '0');
                  const dateStr = `${year}-${month}-${day}`;
                  allReviews.push(dateStr);
                }
              });
            }
          });

          if (allReviews.length > 0) {
            const uniqueDates = [...new Set(allReviews)].sort();
            const firstDate = new Date(uniqueDates[0]);
            const lastDate = new Date(uniqueDates[uniqueDates.length - 1]);
            
            // Check for review history gaps
            const daysWithZeroReviews = [];
            let currentDate = new Date(firstDate);
            
            while (currentDate <= lastDate) {
              const dateStr = currentDate.toISOString().split('T')[0];
              if (!uniqueDates.includes(dateStr)) {
                daysWithZeroReviews.push(dateStr);
              }
              currentDate.setDate(currentDate.getDate() + 1);
            }
            
            console.log(`Review History: ${uniqueDates[0]} to ${uniqueDates[uniqueDates.length - 1]} (${allReviews.length} total reviews)`);
            
            if (daysWithZeroReviews.length > 0) {
              console.warn(`⚠️ ${daysWithZeroReviews.length} day(s) with no reviews`);
            } else {
              console.log('✅ Complete review history - no gaps!');
            }
          }

          // Separate unsorted (original order) and sorted (by frequency) cards
          const unsortedCards = [...cardsFromDB].sort((a, b) => a.originalIndex - b.originalIndex);
          const sortedCards = [...cardsFromDB].sort((a, b) => {
            const aRank = typeof a.rank === 'number' ? a.rank : Infinity;
            const bRank = typeof b.rank === 'number' ? b.rank : Infinity;
            return aRank - bRank;
          });

          setOriginalCards(unsortedCards);
          setCards(sortedCards);
          setCardLimit(sortedCards.length);
          setReading(sortedCards.length);
          
          // Convert stored blobs to blob URLs for use in the app
          if (mediaFromDB && typeof mediaFromDB === 'object') {
            const mediaUrls = {};
            for (const [filename, blob] of Object.entries(mediaFromDB)) {
              if (blob instanceof Blob) {
                mediaUrls[filename] = URL.createObjectURL(blob);
              }
            }
            console.log('Created blob URLs for', Object.keys(mediaUrls).length, 'media files');
            setMediaFiles(mediaUrls);
          } else {
            console.warn('No media files found in metadata, setting empty object');
            setMediaFiles({});
          }
          
          setError(null);
          setDbInitialized(true);
        } else if (isMounted) {
          setError("No cards found in database. Please import your deck in Settings.");
        }
      } catch (err) {
        console.error("Error loading data:", err);
        if (isMounted) {
          setError("Failed to load data from database. Please try importing your deck in Settings.");
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

    loadData();

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
    setShowSettings(false);
    setTimedListeningMode(false);
    setExampleSentencesMode(false);
    setExampleSentences([]);
  };

  const handleShowSettings = () => {
    setShowSettings(true);
  };

  const handleSettingsClosed = async () => {
    setShowSettings(false);
    
    // Reload cards from database in case they were updated
    try {
      const cardsFromDB = await getAllCards();
      const mediaFromDB = await getMetadata('mediaFiles');
      
      console.log('Reloading after settings - Media files:', mediaFromDB ? Object.keys(mediaFromDB).length : 0, 'files');
      
      if (cardsFromDB.length > 0) {
        const unsortedCards = [...cardsFromDB].sort((a, b) => a.originalIndex - b.originalIndex);
        const sortedCards = [...cardsFromDB].sort((a, b) => {
          const aRank = typeof a.rank === 'number' ? a.rank : Infinity;
          const bRank = typeof b.rank === 'number' ? b.rank : Infinity;
          return aRank - bRank;
        });

        setOriginalCards(unsortedCards);
        setCards(sortedCards);
        
        // Convert stored blobs to blob URLs
        if (mediaFromDB && typeof mediaFromDB === 'object') {
          const mediaUrls = {};
          for (const [filename, blob] of Object.entries(mediaFromDB)) {
            if (blob instanceof Blob) {
              mediaUrls[filename] = URL.createObjectURL(blob);
            }
          }
          console.log('Created blob URLs for', Object.keys(mediaUrls).length, 'media files after settings');
          setMediaFiles(mediaUrls);
        } else {
          console.warn('No media files in metadata after settings reload');
          setMediaFiles({});
        }
        
        setError(null);
      }
    } catch (err) {
      console.error('Error reloading cards:', err);
    }
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
      {loading || loadingSentences ? (
        <div className="loading">
          <p>{loadingSentences ? 'Fetching Example Sentences from Tatoeba...' : 'Loading Cards...'}</p>
          <div className="loading-bar">
            <div className="loading-progress"></div>
          </div>
        </div>
      ) : showSettings ? (
        <Settings onBackToMenu={handleSettingsClosed} />
      ) : exampleSentencesMode ? (
        <ExampleSentences
          sentences={exampleSentences}
          studyType={sentenceStudyType}
          onExit={handleBackToMenu}
          mediaFiles={mediaFiles}
        />
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
          onStartTimedListening={handleStartTimedListening}
          onStartExampleSentences={handleStartExampleSentences}
          onShowSettings={handleShowSettings}
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