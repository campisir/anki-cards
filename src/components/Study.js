import React, { useState, useEffect, useRef } from 'react';
import { updateCardStats, addConfusedCards, getConfusedCards, getAllCards, getWordAudioUrl, getSentenceAudioUrl, getCardImageUrl } from '../utils/cardService';
import './Study.css';

function Study({ cards, mediaFiles, reading, listening, picture, gradedMode, onBackToMenu }) {
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [showBack, setShowBack] = useState(false);
  const [showPronunciation, setShowPronunciation] = useState(false);
  const [shuffledCards, setShuffledCards] = useState([]);
  const [userAnswer, setUserAnswer] = useState('');
  const [isCorrect, setIsCorrect] = useState(null);
  const [wordAudioUrl, setWordAudioUrl] = useState(null);
  const [sentenceAudioUrl, setSentenceAudioUrl] = useState(null);
  const [imageUrl, setImageUrl] = useState(null);
  const wordAudioRef = useRef(null);
  const sentenceAudioRef = useRef(null);
  const listeningAudioRef = useRef(null);
  const frontAudioRef = useRef(null);
  const answerInputRef = useRef(null);
  
  // Confused cards feature
  const [showConfusedDialog, setShowConfusedDialog] = useState(false);
  const [showConfusedList, setShowConfusedList] = useState(false);
  const [confusedSearch, setConfusedSearch] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [confusedCardsList, setConfusedCardsList] = useState([]);
  const [allCardsForSearch, setAllCardsForSearch] = useState([]);

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

  // Load all cards for search functionality
  useEffect(() => {
    const loadAllCards = async () => {
      try {
        const allCards = await getAllCards();
        setAllCardsForSearch(allCards);
      } catch (error) {
        console.error('Error loading cards for search:', error);
      }
    };
    loadAllCards();
  }, []);

  // Load confused cards for current card when shown
  useEffect(() => {
    if (showConfusedList && shuffledCards.length > 0) {
      loadConfusedCards();
    }
  }, [showConfusedList, currentCardIndex, shuffledCards]);

  // Update confused cards count whenever current card changes
  useEffect(() => {
    if (shuffledCards.length > 0) {
      loadConfusedCards();
    }
  }, [currentCardIndex, shuffledCards]);

  // Fetch media URLs when card changes
  useEffect(() => {
    const fetchMediaUrls = async () => {
      if (shuffledCards.length > 0) {
        const currentCard = shuffledCards[currentCardIndex];
        
        // Clear previous URLs
        setWordAudioUrl(null);
        setSentenceAudioUrl(null);
        setImageUrl(null);
        
        try {
          // Fetch word audio if card has it
          if (currentCard.audio_filename || currentCard.audioFilename) {
            const url = await getWordAudioUrl(currentCard.id);
            setWordAudioUrl(url);
          }
          
          // Fetch sentence audio if card has it
          if (currentCard.sentence_audio_filename || currentCard.sentenceAudioFilename) {
            const url = await getSentenceAudioUrl(currentCard.id);
            setSentenceAudioUrl(url);
          }
          
          // Fetch image if card has it
          if (currentCard.image_filename || currentCard.imageFilename) {
            const url = await getCardImageUrl(currentCard.id);
            setImageUrl(url);
          }
        } catch (error) {
          console.error('Error fetching media:', error);
        }
      }
    };
    
    fetchMediaUrls();
  }, [currentCardIndex, shuffledCards]);

  useEffect(() => {
    if (shuffledCards.length > 0 && shuffledCards[currentCardIndex].type === 'listening' && listeningAudioRef.current) {
      listeningAudioRef.current.play();
    }
  }, [currentCardIndex, shuffledCards, wordAudioUrl]);

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
    const wasShowingFront = !showBack;
    setShowBack((prevShowBack) => !prevShowBack);
    if (!showBack && answerInputRef.current) {
      answerInputRef.current.blur();
    }
    
    // Auto-play word audio then sentence audio when flipping to back
    if (wasShowingFront) {
      setTimeout(() => {
        if (wordAudioRef.current) {
          wordAudioRef.current.play().catch(err => console.log('Audio play failed:', err));
          
          // Play sentence audio after word audio finishes
          wordAudioRef.current.onended = () => {
            if (sentenceAudioRef.current && sentenceAudioUrl) {
              sentenceAudioRef.current.play().catch(err => console.log('Sentence audio play failed:', err));
            }
          };
        }
      }, 100);
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

  // Helper to access card fields (handles both old array format and new object format)
  const getField = (card, index) => {
    return card.fields ? card.fields[index] : card[index];
  };

  const handleSubmitAnswer = async (e) => {
    e.preventDefault();
    
    if (showBack || isCorrect !== null) return;

    const currentCard = shuffledCards[currentCardIndex];
    const correctAnswer = stripHtmlTags(getField(currentCard, 0)).toLowerCase().trim();
    const userAnswerTrimmed = userAnswer.toLowerCase().trim();
    
    const correct = correctAnswer === userAnswerTrimmed;
    setIsCorrect(correct);
    setShowBack(true);

    // Track the answer in the database with study mode
    try {
      // Determine study mode based on card type
      const studyModeType = currentCard.type || 'reading'; // reading, listening, or picture
      await updateCardStats(currentCard.id, correct, null, studyModeType);
    } catch (error) {
      console.error('Error updating card stats:', error);
    }
  };

  // Confused cards functionality
  const handleSearchChange = (e) => {
    const query = e.target.value;
    setConfusedSearch(query);

    if (query.trim() === '') {
      setSearchResults([]);
      return;
    }

    // Search by Japanese word (field 0) or English meaning (field 1)
    const lowerQuery = query.toLowerCase();
    const results = allCardsForSearch.filter(card => {
      const word = stripHtmlTags(getField(card, 0)).toLowerCase();
      const meaning = stripHtmlTags(getField(card, 1)).toLowerCase();
      return word.includes(lowerQuery) || meaning.includes(lowerQuery);
    }).slice(0, 10); // Limit to 10 results

    setSearchResults(results);
  };

  const handleAddConfusion = async (confusedCardNid) => {
    const currentCard = shuffledCards[currentCardIndex];
    
    if (currentCard.nid === confusedCardNid) {
      alert("You can't mark a card as confused with itself!");
      return;
    }

    try {
      await addConfusedCards(currentCard.nid, confusedCardNid);
      setShowConfusedDialog(false);
      setConfusedSearch('');
      setSearchResults([]);
      
      // Refresh confused cards list if it's open
      if (showConfusedList) {
        await loadConfusedCards();
      }
    } catch (error) {
      console.error('Error adding confused card:', error);
      alert('Failed to add confused card. It may already be marked.');
    }
  };

  const loadConfusedCards = async () => {
    const currentCard = shuffledCards[currentCardIndex];
    try {
      const confused = await getConfusedCards(currentCard.nid);
      setConfusedCardsList(confused);
    } catch (error) {
      console.error('Error loading confused cards:', error);
      setConfusedCardsList([]);
    }
  };

  const handleShowConfusedDialog = () => {
    setShowConfusedDialog(true);
    setConfusedSearch('');
    setSearchResults([]);
  };

  const handleCloseConfusedDialog = () => {
    setShowConfusedDialog(false);
    setConfusedSearch('');
    setSearchResults([]);
  };

  const handleToggleConfusedList = async () => {
    if (!showConfusedList) {
      await loadConfusedCards();
    }
    setShowConfusedList(!showConfusedList);
  };

  if (shuffledCards.length === 0) {
    return <div>Loading...</div>;
  }

  const currentCard = shuffledCards[currentCardIndex];

  return (
    <div className="study">
      <div className="study-header">
        <button className="back-button" onClick={onBackToMenu}>
          Back to Menu
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
                <strong>Meaning:</strong> <span dangerouslySetInnerHTML={{ __html: getField(currentCard, 1) }} />
              </p>
              <p className="pronunciation-text">
                <strong>Pronunciation:</strong> <span dangerouslySetInnerHTML={{ __html: getField(currentCard, 2) }} />
                <audio ref={wordAudioRef} src={wordAudioUrl}></audio>
              </p>
              <p>
                <strong>Sentence:</strong> <span dangerouslySetInnerHTML={{ __html: getField(currentCard, 4) }} />
                {sentenceAudioUrl && (
                  <span className="audio-icon" onClick={(event) => handlePlayAudio(sentenceAudioRef, event)}>
                    <i className="fas fa-volume-up"></i>
                  </span>
                )}
                <audio ref={sentenceAudioRef} src={sentenceAudioUrl}></audio>
              </p>
              <p>
                <strong>Hiragana Sentence:</strong> <span dangerouslySetInnerHTML={{ __html: getField(currentCard, 5) }} />
              </p>
              <p>
                <strong>Sentence Translation:</strong> <span dangerouslySetInnerHTML={{ __html: getField(currentCard, 6) }} />
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
                    <span dangerouslySetInnerHTML={{ __html: getField(currentCard, 0) }} />
                  </div>
                  {wordAudioUrl && <audio ref={frontAudioRef} src={wordAudioUrl}></audio>}
                  <div className="pronunciation-icon" onClick={handleTogglePronunciation}>
                    <i className={`fas ${showPronunciation ? 'fa-chevron-up' : 'fa-chevron-down'}`}></i>
                  </div>
                  {showPronunciation && <p className="pronunciation-text"><span dangerouslySetInnerHTML={{ __html: getField(currentCard, 2) }} /></p>}
                </>
              )}
              {currentCard.type === 'listening' && (
                <>
                  <audio ref={listeningAudioRef} controls src={wordAudioUrl}></audio>
                </>
              )}
              {currentCard.type === 'picture' && (
                <>
                  {imageUrl && <p><img src={imageUrl} alt="Card" style={{ maxWidth: '100%', height: 'auto' }} /></p>}
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

      {/* Confused Cards Section - Compact Version */}
      <div className="confused-cards-section">
        <details className="confused-details">
          <summary className="confused-summary">
            Confused Cards ({confusedCardsList.length})
          </summary>
          <div className="confused-content">
            <div className="confused-actions">
              <button 
                className="confused-action-button add-confused"
                onClick={handleShowConfusedDialog}
                title="Mark a card that you confused with this one"
              >
                ➕ Add
              </button>
              {confusedCardsList.length > 0 && (
                <button 
                  className="confused-action-button view-confused"
                  onClick={handleToggleConfusedList}
                  title="View all cards confused with this one"
                >
                  📋 {showConfusedList ? 'Hide List' : 'View List'}
                </button>
              )}
            </div>

            {/* Confused Cards List Table */}
            {showConfusedList && (
              <div className="confused-list-container">
                <h4>Cards Confused With This One</h4>
                {confusedCardsList.length === 0 ? (
                  <p className="no-confused">No confused cards yet.</p>
                ) : (
                  <div className="confused-table-wrapper">
                    <table className="confused-table">
                      <thead>
                        <tr>
                          <th>Word</th>
                          <th>Meaning</th>
                          <th>Confused Count</th>
                          <th>Last Confused</th>
                        </tr>
                      </thead>
                      <tbody>
                        {confusedCardsList.map((card) => (
                          <tr key={card.nid}>
                            <td>
                              <span dangerouslySetInnerHTML={{ __html: getField(card, 0) }} />
                            </td>
                            <td>
                              <span dangerouslySetInnerHTML={{ __html: getField(card, 1) }} />
                            </td>
                            <td className="count-cell">{card.confusionCount}x</td>
                            <td className="date-cell">
                              {new Date(card.lastConfused).toLocaleDateString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>
        </details>
      </div>

      {/* Add Confusion Dialog */}
      {showConfusedDialog && (
        <div className="confused-dialog-overlay" onClick={handleCloseConfusedDialog}>
          <div className="confused-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="confused-dialog-header">
              <h3>Add Confused Card</h3>
              <button className="close-button" onClick={handleCloseConfusedDialog}>✕</button>
            </div>
            
            <p className="dialog-instruction">
              Search for the card you confused with <strong dangerouslySetInnerHTML={{ __html: getField(currentCard, 0) }} />
            </p>

            <input
              type="text"
              className="search-input"
              placeholder="Search by Japanese word or English meaning..."
              value={confusedSearch}
              onChange={handleSearchChange}
              autoFocus
            />

            <div className="search-results">
              {confusedSearch && searchResults.length === 0 && (
                <p className="no-results">No cards found. Try a different search.</p>
              )}
              {searchResults.map((card) => (
                <div 
                  key={card.nid} 
                  className="search-result-item"
                  onClick={() => handleAddConfusion(card.nid)}
                >
                  <div className="result-word">
                    <span dangerouslySetInnerHTML={{ __html: getField(card, 0) }} />
                  </div>
                  <div className="result-meaning">
                    <span dangerouslySetInnerHTML={{ __html: getField(card, 1) }} />
                  </div>
                  <div className="result-index">#{card.originalIndex}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Study;
