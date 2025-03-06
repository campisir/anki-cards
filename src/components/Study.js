import React, { useState, useEffect, useRef } from 'react';
import './Study.css';

function Study({ cards, mediaFiles, reading, listening, picture, onBackToMenu }) {
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [showBack, setShowBack] = useState(false);
  const [showPronunciation, setShowPronunciation] = useState(false);
  const [shuffledCards, setShuffledCards] = useState([]);
  const wordAudioRef = useRef(null);
  const sentenceAudioRef = useRef(null);
  const listeningAudioRef = useRef(null);

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

  const handleNextCard = () => {
    setShowBack(false);
    setShowPronunciation(false);
    setCurrentCardIndex((prevIndex) => (prevIndex + 1) % shuffledCards.length);
  };

  const handlePreviousCard = () => {
    setShowBack(false);
    setShowPronunciation(false);
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
  };

  const handleTogglePronunciation = () => {
    setShowPronunciation((prevShowPronunciation) => !prevShowPronunciation);
  };

  if (shuffledCards.length === 0) {
    return <div>Loading cards...</div>;
  }

  const currentCard = shuffledCards[currentCardIndex];

  return (
    <div className="study">
      <button className="shuffle-button" onClick={handleShuffleCards}>Shuffle Cards</button>
      <button className="back-button" onClick={onBackToMenu}>Back to Menu</button>
      <div className="card">
        {showBack ? (
          <div>
            <p className="meaning-text">
              <strong>Meaning:</strong> <span dangerouslySetInnerHTML={{ __html: currentCard[1] }} />
            </p>
            <p>
              <strong>Pronunciation:</strong> <span dangerouslySetInnerHTML={{ __html: currentCard[2] }} />
              {currentCard[3] && (
                <span className="audio-icon" onClick={() => wordAudioRef.current.play()}>🔊</span>
              )}
              <audio ref={wordAudioRef} src={mediaFiles[currentCard[3]?.replace('[sound:', '').replace(']', '')]}></audio>
            </p>
            <p>
              <strong>Sentence:</strong> <span dangerouslySetInnerHTML={{ __html: currentCard[4] }} />
              {currentCard[7] && (
                <span className="audio-icon" onClick={() => sentenceAudioRef.current.play()}>🔊</span>
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
                <div className="audio-icon" onClick={() => document.getElementById(`audio-${currentCardIndex}`).play()}>
                  🔊
                </div>
                <p className="front-text"><span dangerouslySetInnerHTML={{ __html: currentCard[0] }} /></p>
                {currentCard[3] && <audio id={`audio-${currentCardIndex}`} src={mediaFiles[currentCard[3].replace('[sound:', '').replace(']', '')]}></audio>}
                <div className="pronunciation-icon" onClick={handleTogglePronunciation}>
                  📖
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
      <button onClick={handleFlipCard}>{showBack ? 'Show Front' : 'Show Back'}</button>
      <button onClick={handlePreviousCard}>Previous Card</button>
      <button onClick={handleNextCard}>Next Card</button>
    </div>
  );
}

export default Study;