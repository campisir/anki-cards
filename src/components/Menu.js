import React, { useState, useEffect } from 'react';
import './Menu.css';

function Menu({
  onStartStudy,
  onStartTimedListening,
  onStartExampleSentences,
  onShowCardsTable,
  onShowSettings,
  cardLimit: initialCardLimit,
  reading: initialReading,
  listening: initialListening,
  picture: initialPicture,
  blacklist: initialBlacklist,
  important: initialImportant,
  gradedMode: initialGradedMode,
  maxCards,
  originalCards,
}) {
  const [currentView, setCurrentView] = useState('main'); // 'main', 'flashcard', 'timed', 'sentences'
  const [cardLimit, setCardLimit] = useState(initialCardLimit);
  const [reading, setReading] = useState(initialReading);
  const [listening, setListening] = useState(initialListening);
  const [picture, setPicture] = useState(initialPicture);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('blacklist');
  const [blacklist, setBlacklist] = useState(initialBlacklist);
  const [important, setImportant] = useState(initialImportant);
  const [gradedMode, setGradedMode] = useState(initialGradedMode);
  const [timeLimit, setTimeLimit] = useState(2);
  const [sentenceStudyType, setSentenceStudyType] = useState('reading'); // 'reading', 'listening', 'both'
  const [tokenizerType, setTokenizerType] = useState('tiny'); // 'tiny' or 'kuromoji'
  const [sentenceSource, setSentenceSource] = useState('tatoeba'); // 'tatoeba' or 'immersionkit'
  const [minCoverage, setMinCoverage] = useState(0); // 0-100
  const [maxCoverage, setMaxCoverage] = useState(100); // 0-100

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

  // Handler for Example Sentences
  const handleStartExampleSentences = () => {
    if (cardLimit < 1) {
      setError('Card limit must be at least 1.');
      return;
    }
    if (minCoverage > maxCoverage) {
      setError('Minimum coverage cannot be greater than maximum coverage.');
      return;
    }
    onStartExampleSentences(cardLimit, sentenceStudyType, tokenizerType, sentenceSource, minCoverage, maxCoverage);
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

  // Main menu render
  const renderMainMenu = () => (
    <div className="menu-grid">
      {/* Study Modes Section */}
      <div className="menu-category">
        <h2 className="category-title">
          <span className="category-icon">📚</span>
          Study Modes
        </h2>
        
        <div className="feature-card" onClick={() => setCurrentView('flashcard')}>
          <div className="feature-icon">🗂️</div>
          <h3>Flashcard Study</h3>
          <p>Classic flashcard review with customizable question types</p>
          <div className="feature-badge active">Ready</div>
        </div>

        <div className="feature-card" onClick={() => setCurrentView('timed')}>
          <div className="feature-icon">⏱️</div>
          <h3>Timed Listening</h3>
          <p>Speed practice with time-limited audio challenges</p>
          <div className="feature-badge active">Ready</div>
        </div>

        <div className="feature-card" onClick={() => setCurrentView('sentences')}>
          <div className="feature-icon">📖</div>
          <h3>Example Sentences</h3>
          <p>Study words in context from Tatoeba sentences</p>
          <div className="feature-badge active">Ready</div>
        </div>
      </div>

      {/* Reading & Tools Section */}
      <div className="menu-category">
        <h2 className="category-title">
          <span className="category-icon">📖</span>
          Reading & Tools
        </h2>
        
        <div className="feature-card disabled">
          <div className="feature-icon">📚</div>
          <h3>Manga Reader</h3>
          <p>Read manga with integrated vocabulary lookup</p>
          <div className="feature-badge coming-soon">Coming Soon</div>
        </div>

        <div className="feature-card" onClick={onShowCardsTable}>
          <div className="feature-icon">📊</div>
          <h3>Cards Table</h3>
          <p>Browse and analyze your entire card collection</p>
          <div className="feature-badge active">Ready</div>
        </div>
      </div>

      {/* Management Section */}
      <div className="menu-category">
        <h2 className="category-title">
          <span className="category-icon">⚙️</span>
          Management
        </h2>
        
        <div className="feature-card" onClick={onShowSettings}>
          <div className="feature-icon">🗄️</div>
          <h3>Database Settings</h3>
          <p>Import decks and manage your card database</p>
          <div className="feature-badge active">Ready</div>
        </div>
      </div>
    </div>
  );

  // Flashcard configuration view
  const renderFlashcardConfig = () => (
    <div className="config-view">
      <button className="back-button" onClick={() => setCurrentView('main')}>
        ← Back to Menu
      </button>
      
      <h1 className="config-title">🗂️ Flashcard Study Configuration</h1>
      
      <div className="config-section">
        <h2>Study Parameters</h2>
        
        <div className="form-group">
          <label htmlFor="cardLimit">Card Limit</label>
          <input
            id="cardLimit"
            type="number"
            value={cardLimit}
            onChange={handleCardLimitChange}
            onBlur={handleCardLimitBlur}
            max={maxCards}
            className="form-input"
          />
        </div>

        <div className="form-row">
          <div className="form-group">
            <label htmlFor="reading">📖 Reading</label>
            <input
              id="reading"
              type="number"
              value={reading}
              onChange={handleReadingChange}
              max={cardLimit}
              min={0}
              className="form-input"
            />
          </div>

          <div className="form-group">
            <label htmlFor="listening">🎧 Listening</label>
            <input
              id="listening"
              type="number"
              value={listening}
              onChange={handleListeningChange}
              max={cardLimit}
              min={0}
              className="form-input"
            />
          </div>

          <div className="form-group">
            <label htmlFor="picture">🖼️ Picture</label>
            <input
              id="picture"
              type="number"
              value={picture}
              onChange={handlePictureChange}
              max={cardLimit}
              min={0}
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
            />
            🎯 Enable Graded Mode
          </label>
        </div>
      </div>

      <div className="config-section">
        <h2>Card Filters</h2>
        
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
            <label htmlFor="blacklist">Cards to exclude from study</label>
            <textarea
              id="blacklist"
              value={blacklist}
              onChange={handleBlacklistChange}
              placeholder="e.g., 2-10, 15, 20-25"
            />
          </div>
        )}

        {activeTab === 'important' && (
          <div className="tab-content">
            <label htmlFor="important">Priority cards to include</label>
            <textarea
              id="important"
              value={important}
              onChange={handleImportantChange}
              placeholder="e.g., 20-40, 112, 114"
            />
          </div>
        )}
      </div>

      {error && <div className="error">{error}</div>}

      <button 
        onClick={handleStartStudy} 
        className="btn btn-primary btn-large"
      >
        🚀 Start Study Session
      </button>
    </div>
  );

  // Timed listening configuration view
  const renderTimedListeningConfig = () => (
    <div className="config-view">
      <button className="back-button" onClick={() => setCurrentView('main')}>
        ← Back to Menu
      </button>
      
      <h1 className="config-title">⏱️ Timed Listening Configuration</h1>
      
      <div className="config-section">
        <h2>Time Settings</h2>
        
        <div className="form-group">
          <label htmlFor="cardLimit">Card Limit</label>
          <input
            id="cardLimit"
            type="number"
            value={cardLimit}
            onChange={handleCardLimitChange}
            max={maxCards}
            className="form-input"
          />
        </div>

        <div className="form-group">
          <label htmlFor="timeLimit">Time limit per card (seconds)</label>
          <input
            id="timeLimit"
            type="number"
            value={timeLimit}
            onChange={handleTimeLimitChange}
            min="1"
            className="form-input"
          />
        </div>
      </div>

      {error && <div className="error">{error}</div>}

      <button 
        onClick={handleStartTimedListening} 
        className="btn btn-warning btn-large"
      >
        ⏱️ Start Timed Listening
      </button>
    </div>
  );

  // Example sentences configuration view
  const renderExampleSentencesConfig = () => (
    <div className="config-view">
      <button className="back-button" onClick={() => setCurrentView('main')}>
        ← Back to Menu
      </button>
      
      <h1 className="config-title">📖 Example Sentences Configuration</h1>
      
      <div className="config-section">
        <h2>Study Parameters</h2>
        
        <div className="form-group">
          <label htmlFor="cardLimit">Card Limit (Words to Include)</label>
          <input
            id="cardLimit"
            type="number"
            value={cardLimit}
            onChange={handleCardLimitChange}
            max={maxCards}
            className="form-input"
          />
          <p className="form-hint">
            Sentences will contain words from cards 1 to {cardLimit}
          </p>
        </div>

        <div className="form-group">
          <label>Study Type</label>
          <div className="radio-group">
            <label className="radio-label">
              <input
                type="radio"
                name="sentenceStudyType"
                value="reading"
                checked={sentenceStudyType === 'reading'}
                onChange={(e) => setSentenceStudyType(e.target.value)}
              />
              <span>📖 Reading Only</span>
              <p className="radio-description">See the sentence, reveal translation</p>
            </label>

            <label className="radio-label">
              <input
                type="radio"
                name="sentenceStudyType"
                value="listening"
                checked={sentenceStudyType === 'listening'}
                onChange={(e) => setSentenceStudyType(e.target.value)}
              />
              <span>🎧 Listening Only</span>
              <p className="radio-description">Hear the sentence, reveal text and translation</p>
            </label>

            <label className="radio-label">
              <input
                type="radio"
                name="sentenceStudyType"
                value="both"
                checked={sentenceStudyType === 'both'}
                onChange={(e) => setSentenceStudyType(e.target.value)}
              />
              <span>📖🎧 Both</span>
              <p className="radio-description">Mix of reading and listening</p>
            </label>
          </div>
        </div>

        <div className="form-group">
          <label>Coverage Filter (% of words you know)</label>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <div style={{ flex: 1 }}>
              <label htmlFor="minCoverage" style={{ fontSize: '0.9rem', display: 'block', marginBottom: '0.5rem' }}>
                Minimum: {minCoverage}%
              </label>
              <input
                id="minCoverage"
                type="range"
                min="0"
                max="100"
                value={minCoverage}
                onChange={(e) => setMinCoverage(Number(e.target.value))}
                className="form-input"
                style={{ width: '100%' }}
              />
            </div>
            <div style={{ flex: 1 }}>
              <label htmlFor="maxCoverage" style={{ fontSize: '0.9rem', display: 'block', marginBottom: '0.5rem' }}>
                Maximum: {maxCoverage}%
              </label>
              <input
                id="maxCoverage"
                type="range"
                min="0"
                max="100"
                value={maxCoverage}
                onChange={(e) => setMaxCoverage(Number(e.target.value))}
                className="form-input"
                style={{ width: '100%' }}
              />
            </div>
          </div>
          <p className="form-hint">
            {minCoverage === 0 && maxCoverage === 100 
              ? 'Showing all sentences (no filter)'
              : minCoverage === maxCoverage
              ? `Showing sentences with exactly ${minCoverage}% coverage`
              : `Showing sentences with ${minCoverage}%-${maxCoverage}% coverage`}
          </p>
        </div>

        <div className="form-group">
          <label>Sentence Source</label>
          <div className="radio-group">
            <label className="radio-label">
              <input
                type="radio"
                name="sentenceSource"
                value="tatoeba"
                checked={sentenceSource === 'tatoeba'}
                onChange={(e) => setSentenceSource(e.target.value)}
              />
              <span>📝 Tatoeba</span>
              <p className="radio-description">User-generated sentences with translations</p>
            </label>

            <label className="radio-label">
              <input
                type="radio"
                name="sentenceSource"
                value="immersionkit"
                checked={sentenceSource === 'immersionkit'}
                onChange={(e) => setSentenceSource(e.target.value)}
              />
              <span>🎬 Immersion Kit</span>
              <p className="radio-description">Real sentences from anime, dramas, and games</p>
            </label>
          </div>
        </div>

        <div className="form-group">
          <label>Tokenizer (Word Splitting)</label>
          <div className="radio-group">
            <label className="radio-label">
              <input
                type="radio"
                name="tokenizerType"
                value="tiny"
                checked={tokenizerType === 'tiny'}
                onChange={(e) => setTokenizerType(e.target.value)}
              />
              <span>⚡ TinySegmenter (Fast)</span>
              <p className="radio-description">Lightweight, ~85-90% accurate, instant loading</p>
            </label>

            <label className="radio-label">
              <input
                type="radio"
                name="tokenizerType"
                value="kuromoji"
                checked={tokenizerType === 'kuromoji'}
                onChange={(e) => setTokenizerType(e.target.value)}
              />
              <span>🎯 Kuromoji (Accurate)</span>
              <p className="radio-description">Dictionary-based, 95%+ accurate, slower initial load</p>
            </label>
          </div>
        </div>
      </div>

      <div className="config-info">
        <div className="info-box">
          <div className="info-icon">ℹ️</div>
          <div className="info-content">
            <h3>About Sentence Sources</h3>
            <p>
              <strong>Tatoeba:</strong> Community-contributed sentences with direct translations. Great variety, may include some unnatural phrasing.
            </p>
            <p>
              <strong>Immersion Kit:</strong> Sentences extracted from anime, dramas, movies, and games. 
              More natural, real-world Japanese with native audio from actual shows.
            </p>
          </div>
        </div>
      </div>

      {error && <div className="error">{error}</div>}

      <button 
        onClick={handleStartExampleSentences} 
        className="btn btn-primary btn-large"
      >
        📖 Start Example Sentences Study
      </button>
    </div>
  );

  return (
    <div className="menu">
      <div className="menu-container">
        {currentView === 'main' && (
          <>
            <h1 className="menu-title">Japanese Study Hub</h1>
            <p className="menu-subtitle">Choose a study mode or tool to get started</p>
            {renderMainMenu()}
          </>
        )}
        {currentView === 'flashcard' && renderFlashcardConfig()}
        {currentView === 'timed' && renderTimedListeningConfig()}
        {currentView === 'sentences' && renderExampleSentencesConfig()}
      </div>
    </div>
  );
}

export default Menu;