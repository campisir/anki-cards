import React, { useState, useEffect } from 'react';
import './Study.css';

function Study({ cards, mediaFiles, reading, listening, picture, onBackToMenu }) {
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [showBack, setShowBack] = useState(false);
  const [showPronunciation, setShowPronunciation] = useState(false);
  const [shuffledCards, setShuffledCards] = useState([]);

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
            <p className="meaning-text"><strong>Meaning:</strong> <span dangerouslySetInnerHTML={{ __html: currentCard[1] }} /></p>
            <p><strong>Pronunciation:</strong> <span dangerouslySetInnerHTML={{ __html: currentCard[2] }} /></p>
            {currentCard[3] && <p><strong>Word Audio:</strong> <audio controls src={mediaFiles[currentCard[3].replace('[sound:', '').replace(']', '')]}></audio></p>}
            <p><strong>Sentence:</strong> <span dangerouslySetInnerHTML={{ __html: currentCard[4] }} /></p>
            <p><strong>Hiragana Sentence:</strong> <span dangerouslySetInnerHTML={{ __html: currentCard[5] }} /></p>
            <p><strong>Sentence Translation:</strong> <span dangerouslySetInnerHTML={{ __html: currentCard[6] }} /></p>
            {currentCard[7] && <p><strong>Sentence Audio:</strong> <audio controls src={mediaFiles[currentCard[7].replace('[sound:', '').replace(']', '')]}></audio></p>}
            {currentCard[8] && <p><strong>Image:</strong> <span dangerouslySetInnerHTML={{ __html: currentCard[8].replace(/<img\s+src="([^"]+)"(.*?)>/g, (match, filename, rest) => {
              const blobUrl = mediaFiles[filename] || filename;
              return `<img src="${blobUrl}"${rest}>`;
            }) }} /></p>}
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
                <div className="audio-icon" onClick={() => document.getElementById(`audio-${currentCardIndex}`).play()}>
                  🔊
                </div>
                {currentCard[3] && <audio id={`audio-${currentCardIndex}`} src={mediaFiles[currentCard[3].replace('[sound:', '').replace(']', '')]}></audio>}
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