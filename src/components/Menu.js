import React, { useState } from 'react';

function Menu({ onStartStudy }) {
  const [numCardsToStudy, setNumCardsToStudy] = useState(1300);
  const [reading, setReading] = useState(1300);
  const [listening, setListening] = useState(0);
  const [picture, setPicture] = useState(0);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('blacklist');
  const [blacklist, setBlacklist] = useState('');
  const [important, setImportant] = useState('');

  const handleStartStudy = () => {
    const totalQuestions = reading + listening + picture;
    if (totalQuestions < 1 || totalQuestions > 3 * numCardsToStudy) {
      setError('The total number of questions must be at least one.');
      return;
    }
    onStartStudy(numCardsToStudy, reading, listening, picture, blacklist, important);
  };

  const handleNumCardsToStudyChange = (e) => {
    setNumCardsToStudy(Number(e.target.value));
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