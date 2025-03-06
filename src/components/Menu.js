import React, { useState } from 'react';

function Menu({ onStartStudy }) {
  const [numCardsToStudy, setNumCardsToStudy] = useState(1300);
  const [reading, setReading] = useState(1300);
  const [listening, setListening] = useState(0);
  const [picture, setPicture] = useState(0);
  const [error, setError] = useState('');

  const handleStartStudy = () => {
    const totalQuestions = reading + listening + picture;
    if (totalQuestions < 1 || totalQuestions > 3 * numCardsToStudy) {
      setError('The total number of questions must be at least 1 and at most three times the number of cards to study.');
      return;
    }
    onStartStudy(numCardsToStudy, reading, listening, picture);
  };

  return (
    <div className="menu">
      <h1>Study Settings</h1>
      <label>
        Number of Cards to Study:
        <input
          type="number"
          value={numCardsToStudy}
          onChange={(e) => setNumCardsToStudy(Number(e.target.value))}
        />
      </label>
      <label>
        Reading:
        <input
          type="number"
          value={reading}
          onChange={(e) => setReading(Number(e.target.value))}
          max={numCardsToStudy}
          min={0}
        />
      </label>
      <label>
        Listening:
        <input
          type="number"
          value={listening}
          onChange={(e) => setListening(Number(e.target.value))}
          max={numCardsToStudy}
          min={0}
        />
      </label>
      <label>
        Picture:
        <input
          type="number"
          value={picture}
          onChange={(e) => setPicture(Number(e.target.value))}
          max={numCardsToStudy}
          min={0}
        />
      </label>
      {error && <p className="error">{error}</p>}
      <button onClick={handleStartStudy}>Start Study</button>
    </div>
  );
}

export default Menu;