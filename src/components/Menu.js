import React, { useState, useEffect } from 'react';

function Menu({
  onStartStudy,
  onStartTimedListening, // New callback for Timed Listening mode
  onShowCardsTable,
  onShowSettings, // New callback for Settings
  cardLimit: initialCardLimit,
  reading: initialReading,
  listening: initialListening,
  picture: initialPicture,
  blacklist: initialBlacklist,
  important: initialImportant,
  gradedMode: initialGradedMode,
  maxCards,
  originalCards, // Receive originalCards as a prop
}) {
  const [cardLimit, setCardLimit] = useState(initialCardLimit);
  const [reading, setReading] = useState(initialReading);
  const [listening, setListening] = useState(initialListening);
  const [picture, setPicture] = useState(initialPicture);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('blacklist');
  const [blacklist, setBlacklist] = useState(initialBlacklist);
  const [important, setImportant] = useState(initialImportant);
  const [gradedMode, setGradedMode] = useState(initialGradedMode);
  // New state for Timed Listening
  const [timeLimit, setTimeLimit] = useState(2); // default time limit in seconds

  useEffect(() => {
    setCardLimit(initialCardLimit);
    setReading(initialReading);
    setListening(initialListening);
    setPicture(initialPicture);
    setBlacklist(initialBlacklist);
    setImportant(initialImportant);
    setGradedMode(initialGradedMode);
  }, [initialCardLimit, initialReading, initialListening, initialPicture, initialBlacklist, initialImportant, initialGradedMode]);

  const handleStartStudy = () => {
    const totalQuestions = reading + listening + picture;
    if (totalQuestions < 1) {
      setError('The total number of questions must be at least one.');
      return;
    }

    const blacklistArray = parseCardNumbers(blacklist);
    const filteredCards = originalCards.filter(card => !blacklistArray.includes(card.originalIndex));
    
    if (filteredCards.length === 0) {
      setError('No cards left to study after applying the blacklist.');
      return;
    }

    onStartStudy(cardLimit, reading, listening, picture, blacklist, important, gradedMode);
  };

  // (Only showing the updated handler)
  
  // New handler for Timed Listening start
  const handleStartTimedListening = () => {
    if (timeLimit < 1) {
      setError('Time limit must be at least one second.');
      return;
    }
    // First, apply the cardLimit filter
    const limitedCards = originalCards.filter(card => card.originalIndex <= cardLimit);
    // Then filter out only cards that have listening audio
    // Helper to access card fields (handles both old array format and new object format)
    const getField = (card, index) => (card.fields ? card.fields[index] : card[index]);
    const listeningCards = limitedCards.filter(card => {
      const field3 = getField(card, 3);
      return field3 && field3.includes('[sound:');
    });
    if (listeningCards.length === 0) {
      setError('No listening cards available with the current selection.');
      return;
    }
    onStartTimedListening(listeningCards, timeLimit);
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

  const parseRange = (range) => {
    const [start, end] = range.split('-').map(Number);
    return Array.from({ length: end - start + 1 }, (_, i) => start + i);
  };

  const handleCardLimitChange = (e) => {
    const value = Math.min(Number(e.target.value), maxCards);
    setCardLimit(value);
  };

  const handleCardLimitBlur = () => {
    if (reading > cardLimit) setReading(cardLimit);
    if (listening > cardLimit) setListening(cardLimit);
    if (picture > cardLimit) setPicture(cardLimit);
  };

  const handleReadingChange = (e) => {
    const value = Number(e.target.value);
    setReading(value > cardLimit ? cardLimit : value);
  };

  const handleListeningChange = (e) => {
    const value = Number(e.target.value);
    setListening(value > cardLimit ? cardLimit : value);
  };

  const handlePictureChange = (e) => {
    const value = Number(e.target.value);
    setPicture(value > cardLimit ? cardLimit : value);
  };

  const handleTabChange = (tab) => {
    setActiveTab(tab);
  };

  const handleBlacklistChange = (e) => {
    setBlacklist(e.target.value);
  };

  const handleImportantChange = (e) => {
    setImportant(e.target.value);
  };

  const handleGradedModeChange = (e) => {
    setGradedMode(e.target.checked);
  };

  const handleTimeLimitChange = (e) => {
    setTimeLimit(Number(e.target.value));
  };

  return (
    <div className="menu">
      <div className="menu-container">
        <h1>📚 Study Manager</h1>
        
        <div className="menu-section">
          <h2>
            <span>⚙️</span>
            Study Configuration
          </h2>
          
          <div className="form-group">
            <label htmlFor="cardLimit">
              Card Limit
            </label>
            <input
              id="cardLimit"
              type="number"
              value={cardLimit}
              onChange={handleCardLimitChange}
              onBlur={handleCardLimitBlur}
              title="Set the number of cards you want to study."
              max={maxCards}
              className="form-input"
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="reading">
                📖 Reading Questions
              </label>
              <input
                id="reading"
                type="number"
                value={reading}
                onChange={handleReadingChange}
                max={cardLimit}
                min={0}
                title="Set the number of reading questions."
                className="form-input"
              />
            </div>

            <div className="form-group">
              <label htmlFor="listening">
                🎧 Listening Questions
              </label>
              <input
                id="listening"
                type="number"
                value={listening}
                onChange={handleListeningChange}
                max={cardLimit}
                min={0}
                title="Set the number of listening questions."
                className="form-input"
              />
            </div>

            <div className="form-group">
              <label htmlFor="picture">
                🖼️ Picture Questions
              </label>
              <input
                id="picture"
                type="number"
                value={picture}
                onChange={handlePictureChange}
                max={cardLimit}
                min={0}
                title="Set the number of picture questions."
                className="form-input"
              />
            </div>
          </div>

          <div className="form-group">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={gradedMode}
                onChange={handleGradedModeChange}
                title="Enable graded mode."
              />
              🎯 Enable Graded Mode
            </label>
          </div>
        </div>

        <div className="menu-section">
          <h2>
            <span>🎛️</span>
            Card Filters
          </h2>
          
          <div className="tabs">
            <button
              className={`tab-button ${activeTab === 'blacklist' ? 'active' : ''}`}
              onClick={() => handleTabChange('blacklist')}
            >
              🚫 Blacklist
            </button>
            <button
              className={`tab-button ${activeTab === 'important' ? 'active' : ''}`}
              onClick={() => handleTabChange('important')}
            >
              ⭐ Important
            </button>
          </div>

          {activeTab === 'blacklist' && (
            <div className="tab-content">
              <label htmlFor="blacklist">
                Cards to exclude from study
              </label>
              <textarea
                id="blacklist"
                value={blacklist}
                onChange={handleBlacklistChange}
                placeholder="Enter card numbers or ranges (e.g., 2-10, 15, 20-25)"
                title="Enter card numbers or ranges to exclude from the study session."
              />
            </div>
          )}

          {activeTab === 'important' && (
            <div className="tab-content">
              <label htmlFor="important">
                Priority cards to include
              </label>
              <textarea
                id="important"
                value={important}
                onChange={handleImportantChange}
                placeholder="Enter card numbers or ranges (e.g., 20-40, 112, 114)"
                title="Enter card numbers or ranges to include in the study session."
              />
            </div>
          )}
        </div>

        <div className="menu-section">
          <h2>
            <span>⏱️</span>
            Timed Listening Mode
          </h2>
          
          <div className="form-group">
            <label htmlFor="timeLimit">
              Time limit per card (seconds)
            </label>
            <input
              id="timeLimit"
              type="number"
              value={timeLimit}
              onChange={handleTimeLimitChange}
              min="1"
              title="Set the time limit per card in seconds."
              className="form-input"
            />
          </div>
        </div>

        {error && <div className="error">{error}</div>}

        <div className="btn-group">
          <button 
            onClick={handleStartStudy} 
            className="btn btn-primary btn-large"
            title="Start the study session with the selected settings."
          >
            🚀 Start Study Session
          </button>
          
          <button 
            onClick={handleStartTimedListening} 
            className="btn btn-warning btn-large"
            title="Start Timed Listening Mode"
          >
            ⏱️ Start Timed Listening
          </button>
          
          <button 
            onClick={onShowCardsTable} 
            className="btn btn-secondary"
            title="View all cards in table format"
          >
            📊 View Cards Table
          </button>

          <button 
            onClick={onShowSettings} 
            className="btn btn-info"
            title="Manage database and import settings"
          >
            ⚙️ Database Settings
          </button>
        </div>
      </div>
    </div>
  );
}

export default Menu;