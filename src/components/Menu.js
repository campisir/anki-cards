import React, { useState, useEffect } from 'react';

function Menu({
  onStartStudy,
  numCardsToStudy: initialNumCardsToStudy,
  reading: initialReading,
  listening: initialListening,
  picture: initialPicture,
  blacklist: initialBlacklist,
  important: initialImportant,
  gradedMode: initialGradedMode,
  maxCards,
}) {
  const [numCardsToStudy, setNumCardsToStudy] = useState(initialNumCardsToStudy);
  const [reading, setReading] = useState(initialReading);
  const [listening, setListening] = useState(initialListening);
  const [picture, setPicture] = useState(initialPicture);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('blacklist');
  const [blacklist, setBlacklist] = useState(initialBlacklist);
  const [important, setImportant] = useState(initialImportant);
  const [gradedMode, setGradedMode] = useState(initialGradedMode);

  useEffect(() => {
    setNumCardsToStudy(initialNumCardsToStudy);
    setReading(initialReading);
    setListening(initialListening);
    setPicture(initialPicture);
    setBlacklist(initialBlacklist);
    setImportant(initialImportant);
    setGradedMode(initialGradedMode);
  }, [initialNumCardsToStudy, initialReading, initialListening, initialPicture, initialBlacklist, initialImportant, initialGradedMode]);

  const handleStartStudy = () => {
    const totalQuestions = reading + listening + picture;
    if (totalQuestions < 1) {
      setError('The total number of questions must be at least one.');
      return;
    }
    onStartStudy(numCardsToStudy, reading, listening, picture, blacklist, important, gradedMode);
  };

  const handleNumCardsToStudyChange = (e) => {
    const value = Math.min(Number(e.target.value), maxCards);
    setNumCardsToStudy(value);
  };

  const handleNumCardsToStudyBlur = () => {
    if (reading > numCardsToStudy) setReading(numCardsToStudy);
    if (listening > numCardsToStudy) setListening(numCardsToStudy);
    if (picture > numCardsToStudy) setPicture(numCardsToStudy);
  };

  const handleReadingChange = (e) => {
    const value = Number(e.target.value);
    setReading(value > numCardsToStudy ? numCardsToStudy : value);
  };

  const handleListeningChange = (e) => {
    const value = Number(e.target.value);
    setListening(value > numCardsToStudy ? numCardsToStudy : value);
  };

  const handlePictureChange = (e) => {
    const value = Number(e.target.value);
    setPicture(value > numCardsToStudy ? numCardsToStudy : value);
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

  return (
    <div className="menu">
      <h1>Study Settings</h1>
      <label>
        Pull cards up to card number:
        <input
          type="number"
          value={numCardsToStudy}
          onChange={handleNumCardsToStudyChange}
          onBlur={handleNumCardsToStudyBlur}
          title="Set the number of cards you want to study."
          max={maxCards}
        />
      </label>
      <label>
        Reading:
        <input
          type="number"
          value={reading}
          onChange={handleReadingChange}
          max={numCardsToStudy}
          min={0}
          title="Set the number of reading questions."
        />
      </label>
      <label>
        Listening:
        <input
          type="number"
          value={listening}
          onChange={handleListeningChange}
          max={numCardsToStudy}
          min={0}
          title="Set the number of listening questions."
        />
      </label>
      <label>
        Picture:
        <input
          type="number"
          value={picture}
          onChange={handlePictureChange}
          max={numCardsToStudy}
          min={0}
          title="Set the number of picture questions."
        />
      </label>
      <label>
        Graded Mode:
        <input
          type="checkbox"
          checked={gradedMode}
          onChange={handleGradedModeChange}
          title="Enable graded mode."
        />
      </label>
      <div className="tabs">
        <button
          className={activeTab === 'blacklist' ? 'active' : ''}
          onClick={() => handleTabChange('blacklist')}
        >
          Blacklist
        </button>
        <button
          className={activeTab === 'important' ? 'active' : ''}
          onClick={() => handleTabChange('important')}
        >
          Important
        </button>
      </div>
      {activeTab === 'blacklist' && (
        <div className="tab-content">
          <label>
            Blacklist:
            <textarea
              value={blacklist}
              onChange={handleBlacklistChange}
              placeholder="Enter card numbers or ranges (e.g., 2-10)"
              title="Enter card numbers or ranges to exclude from the study session."
            />
          </label>
        </div>
      )}
      {activeTab === 'important' && (
        <div className="tab-content">
          <label>
            Important:
            <textarea
              value={important}
              onChange={handleImportantChange}
              placeholder="Enter card numbers or ranges (e.g., 20-40, 112, 114)"
              title="Enter card numbers or ranges to include in the study session."
            />
          </label>
        </div>
      )}
      {error && <p className="error">{error}</p>}
      <button onClick={handleStartStudy} title="Start the study session with the selected settings.">Start Study</button>
    </div>
  );
}

export default Menu;