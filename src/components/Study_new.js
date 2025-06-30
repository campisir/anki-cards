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
  const answerInputRef = useRef(null);

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

  useEffect(() => {
    if (showBack && wordAudioRef.current && sentenceAudioRef.current) {
      wordAudioRef.current.pause();
      sentenceAudioRef.current.pause();
    }
  }, [showBack]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (gradedMode && isCorrect === null && answerInputRef.current === document.activeElement) {
        return;
      }

      if (e.key === 'ArrowLeft') {
        handlePreviousCard();
      } else if (e.key === 'ArrowRight') {
        if (gradedMode && !showBack) {
          return;
        }
        handleNextCard();
      } else if (e.key === ' ') {
        e.preventDefault();
        if (gradedMode && isCorrect !== null) {
          handleNextCard();
        } else if (!gradedMode) {
          handleFlipCard();
        }
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (gradedMode && showBack && isCorrect !== null) {
          handleNextCard();
        } else if (!gradedMode) {
          handleFlipCard();
        }
      }
    };
  
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [shuffledCards, currentCardIndex, showBack, isCorrect, gradedMode, userAnswer]);

  const handleNextCard = () => {
    setShowBack(false);
    setShowPronunciation(false);
    setUserAnswer('');
    setIsCorrect(null);
    setCurrentCardIndex((prevIndex) => (prevIndex + 1) % shuffledCards.length);
    if (answerInputRef.current) {
      answerInputRef.current.focus();
    }
  };

  const handlePreviousCard = () => {
    setShowBack(false);
    setShowPronunciation(false);
    setUserAnswer('');
    setIsCorrect(null);
    setCurrentCardIndex((prevIndex) => (prevIndex - 1 + shuffledCards.length) % shuffledCards.length);
    if (answerInputRef.current) {
      answerInputRef.current.focus();
    }
  };

  const handleFlipCard = () => {
    setShowBack((prevShowBack) => !prevShowBack);
    if (!showBack && answerInputRef.current) {
      answerInputRef.current.blur();
    }
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
      audioRef.current.currentTime = 0;
      audioRef.current.play();
    }
  };

  const handleAnswerChange = (e) => {
    setUserAnswer(e.target.value);
  };

  const stripHtmlTags = (html) => {
    const div = document.createElement('div');
    div.innerHTML = html;
    return div.textContent || div.innerText || '';
  };

  const handleSubmitAnswer = (e) => {
    e.preventDefault();
    
    if (showBack || isCorrect !== null) return;

    const currentCard = shuffledCards[currentCardIndex];
    const correctAnswer = stripHtmlTags(currentCard[0]).toLowerCase().trim();
    const userAnswerTrimmed = userAnswer.toLowerCase().trim();
    
    const correct = correctAnswer === userAnswerTrimmed;
    setIsCorrect(correct);
    setShowBack(true);
  };

  if (shuffledCards.length === 0) {
    return <div>Loading...</div>;
  }

  const currentCard = shuffledCards[currentCardIndex];

  return (
    <div className="study">
      <div className="study-header">
        <button className="back-button" onClick={onBackToMenu}>
          ← Back to Menu
        </button>
        <button className="shuffle-button" onClick={handleShuffleCards}>
          🔀 Shuffle Cards
        </button>
      </div>
      
      <div className="card-container">
        <div className="card" onClick={handleFlipCard}>
          {showBack ? (
            <div>
              <div className="word-audio-icon" onClick={(event) => handlePlayAudio(wordAudioRef, event)}>
                <i className="fas fa-volume-up"></i>
              </div>
              <p className="meaning-text">
                <strong>Meaning:</strong> <span dangerouslySetInnerHTML={{ __html: currentCard[1] }} />
              </p>
              <p className="pronunciation-text">
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
                    const fullPath = mediaFiles[filename];
                    return `<img src="${fullPath}"${rest}>`;
                  }) }} /></p>}
                </>
              )}
            </div>
          )}
        </div>
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
                ref={answerInputRef}
                autoFocus
              />
              <button type="submit" className="submit-button">Submit Answer</button>
            </form>
          ) : (
            <>
              <p className="result-text">
                {isCorrect ? '✅ Correct!' : '❌ Incorrect'}
              </p>
            </>
          )}
        </>
      )}
      
      <div className="button-container">
        <button className="previous-button" onClick={handlePreviousCard}>
          ← Previous
        </button>
        <button className="next-button" onClick={handleNextCard}>
          Next Card →
        </button>
      </div>
    </div>
  );
}

export default Study;
