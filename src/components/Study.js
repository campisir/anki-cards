import React, { useState, useEffect, useRef } from 'react';
import './Study.css';

function Study({ cards, mediaFiles, reading, listening, picture, gradedMode, onBackToMenu }) {
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [showBack, setShowBack] = useState(false);
  const [showPronunciation, setShowPronunciation] = useState(false);
  const [shuffledCards, setShuffledCards] = useState([]);
  const [userAnswer, setUserAnswer] = useState('');
  const [isCorrect, setIsCorrect] = useState(null);
  const wordAudioRef = useRef(null);
  const sentenceAudioRef = useRef(null);
  const listeningAudioRef = useRef(null);
  const frontAudioRef = useRef(null);

  useEffect(() => {
    if (cards.length === 0) return;

    const shuffled = [...cards];
    const readingCards = shuffled.slice(0, reading);
    const listeningCards = shuffled.slice(0, listening).sort(() => Math.random() - 0.5);
    const pictureCards = shuffled.slice(0, picture).sort(() => Math.random() - 0.5);

    const combinedCards = [
      ...readingCards.map(card => ({ ...card, type: 'reading' })),
      ...listeningCards.map(card => ({ ...card, type: 'listening' })),
      ...pictureCards.map(card => ({ ...card, type: 'picture' })),
    ].sort(() => Math.random() - 0.5);

    setShuffledCards(combinedCards);
  }, [cards, reading, listening, picture]);

  useEffect(() => {
    if (shuffledCards.length > 0 && shuffledCards[currentCardIndex].type === 'listening' && listeningAudioRef.current) {
      listeningAudioRef.current.play();
    }
  }, [currentCardIndex, shuffledCards]);

  useEffect(() => {
    return () => {
      if (wordAudioRef.current) wordAudioRef.current.pause();
      if (sentenceAudioRef.current) sentenceAudioRef.current.pause();
      if (listeningAudioRef.current) listeningAudioRef.current.pause();
      if (frontAudioRef.current) frontAudioRef.current.pause();
    };
  }, [currentCardIndex, showBack]);

  const handleNextCard = () => {
    setShowBack(false);
    setShowPronunciation(false);
    setUserAnswer('');
    setIsCorrect(null);
    setCurrentCardIndex((prevIndex) => (prevIndex + 1) % shuffledCards.length);
  };

  const handlePreviousCard = () => {
    setShowBack(false);
    setShowPronunciation(false);
    setUserAnswer('');
    setIsCorrect(null);
    setCurrentCardIndex((prevIndex) => (prevIndex - 1 + shuffledCards.length) % shuffledCards.length);
  };

  const handleFlipCard = () => {
    setShowBack((prevShowBack) => !prevShowBack);
  };

  const handleShuffleCards = () => {
    const shuffled = [...shuffledCards].sort(() => Math.random() - 0.5);
    setShuffledCards(shuffled);
    setCurrentCardIndex(0);
    setShowBack(false);
    setShowPronunciation(false);
    setUserAnswer('');
    setIsCorrect(null);
  };

  const handleTogglePronunciation = (event) => {
    event.stopPropagation();
    setShowPronunciation((prevShowPronunciation) => !prevShowPronunciation);
  };

  const handlePlayAudio = (audioRef, event) => {
    event.stopPropagation();
    if (audioRef.current && document.contains(audioRef.current)) {
      audioRef.current.play();
    }
  };

  const handleAnswerChange = (e) => {
    setUserAnswer(e.target.value);
  };

  const handleSubmitAnswer = (e) => {
    e.preventDefault();
    const currentCard = shuffledCards[currentCardIndex];
    let correct = false;

    if (currentCard.type === 'reading' || currentCard.type === 'listening') {
      correct = currentCard[1].split(/\s+/).some(word => userAnswer.includes(word));
    } else if (currentCard.type === 'picture') {
      correct = currentCard[0] === userAnswer || currentCard[2] === userAnswer;
    }

    setIsCorrect(correct);
    setShowBack(true);
  };

  if (shuffledCards.length === 0) {
    return <div>Loading cards...</div>;
  }

  const currentCard = shuffledCards[currentCardIndex];

  return (
    <div className="study">
      <button className="shuffle-button" onClick={handleShuffleCards}>Shuffle Cards</button>
      <button className="back-button" onClick={onBackToMenu}>Back to Menu</button>
      <div className="card" onClick={handleFlipCard}>
        {showBack ? (
          <div>
            <div className="word-audio-icon" onClick={(event) => handlePlayAudio(wordAudioRef, event)}>
              <i className="fas fa-volume-up"></i>
            </div>
            <p className="meaning-text">
              <strong>Meaning:</strong> <span dangerouslySetInnerHTML={{ __html: currentCard[1] }} />
            </p>
            <p>
              <strong>Pronunciation:</strong> <span dangerouslySetInnerHTML={{ __html: currentCard[2] }} />
              <audio ref={wordAudioRef} src={mediaFiles[currentCard[3]?.replace('[sound:', '').replace(']', '')]}></audio>
            </p>
            <p>
              <strong>Sentence:</strong> <span dangerouslySetInnerHTML={{ __html: currentCard[4] }} />
              {currentCard[7] && (
                <span className="audio-icon" onClick={(event) => handlePlayAudio(sentenceAudioRef, event)}>
                  <i className="fas fa-volume-up"></i>
                </span>
              )}
              <audio ref={sentenceAudioRef} src={mediaFiles[currentCard[7]?.replace('[sound:', '').replace(']', '')]}></audio>
            </p>
            <p>
              <strong>Hiragana Sentence:</strong> <span dangerouslySetInnerHTML={{ __html: currentCard[5] }} />
            </p>
            <p>
              <strong>Sentence Translation:</strong> <span dangerouslySetInnerHTML={{ __html: currentCard[6] }} />
            </p>
            {currentCard[8] && (
              <p>
                <span dangerouslySetInnerHTML={{ __html: currentCard[8].replace(/<img\s+src="([^"]+)"(.*?)>/g, (match, filename, rest) => {
                  const blobUrl = mediaFiles[filename] || filename;
                  return `<img src="${blobUrl}"${rest}>`;
                }) }} />
              </p>
            )}
          </div>
        ) : (
          <div>
            {currentCard.type === 'reading' && (
              <>
                <div className="word-audio-icon" onClick={(event) => handlePlayAudio(frontAudioRef, event)}>
                  <i className="fas fa-volume-up"></i>
                </div>
                <div className="front-text">
                  <span dangerouslySetInnerHTML={{ __html: currentCard[0] }} />
                </div>
                {currentCard[3] && <audio ref={frontAudioRef} src={mediaFiles[currentCard[3].replace('[sound:', '').replace(']', '')]}></audio>}
                <div className="pronunciation-icon" onClick={handleTogglePronunciation}>
                  <i className={`fas ${showPronunciation ? 'fa-chevron-up' : 'fa-chevron-down'}`}></i>
                </div>
                {showPronunciation && <p className="pronunciation-text"><span dangerouslySetInnerHTML={{ __html: currentCard[2] }} /></p>}
              </>
            )}
            {currentCard.type === 'listening' && (
              <>
                <audio ref={listeningAudioRef} controls src={mediaFiles[currentCard[3].replace('[sound:', '').replace(']', '')]}></audio>
              </>
            )}
            {currentCard.type === 'picture' && (
              <>
                {currentCard[8] && <p><span dangerouslySetInnerHTML={{ __html: currentCard[8].replace(/<img\s+src="([^"]+)"(.*?)>/g, (match, filename, rest) => {
                  const blobUrl = mediaFiles[filename] || filename;
                  return `<img src="${blobUrl}"${rest}>`;
                }) }} /></p>}
              </>
            )}
          </div>
        )}
      </div>
      {gradedMode && (
        <>
          {isCorrect === null ? (
            <form className="answer-form" onSubmit={handleSubmitAnswer}>
              <input
                type="text"
                value={userAnswer}
                onChange={handleAnswerChange}
                placeholder="Enter your answer"
                className="answer-input"
              />
              <button type="submit" className="submit-button">Submit</button>
            </form>
          ) : (
            <p className="result-text">
              {isCorrect ? 'Correct!' : 'Incorrect'}
            </p>
          )}
        </>
      )}
      <div className="button-container">
        <button className="previous-button" onClick={handlePreviousCard}>Previous</button>
        <button className="next-button" onClick={handleNextCard}>Next Card</button>
      </div>
    </div>
  );
}

export default Study;