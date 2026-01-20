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
  const preloadAudioRef = useRef(null);
  const answerInputRef = useRef(null);
  
  // Confused cards feature
  const [showConfusedDialog, setShowConfusedDialog] = useState(false);
  const [showConfusedList, setShowConfusedList] = useState(false);
  const [confusedSearch, setConfusedSearch] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [confusedCardsList, setConfusedCardsList] = useState([]);
  const [allCardsForSearch, setAllCardsForSearch] = useState([]);
  
  // Homophones feature
  const [showHomophonesList, setShowHomophonesList] = useState(false);
  const [homophonesList, setHomophonesList] = useState([]);
  const [sameTermList, setSameTermList] = useState([]);
  const [similarMeaningList, setSimilarMeaningList] = useState([]);
  const [loadingConfusedCards, setLoadingConfusedCards] = useState(false);

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
  
  // Update homophones whenever current card changes
  useEffect(() => {
    if (shuffledCards.length > 0 && showHomophonesList) {
      findHomophones();
    }
  }, [currentCardIndex, shuffledCards]);

  // Fetch media URLs when card changes
  useEffect(() => {
    const fetchMediaUrls = async () => {
      if (shuffledCards.length > 0) {
        const currentCard = shuffledCards[currentCardIndex];
        console.log('[MEDIA FETCH] Card changed to index:', currentCardIndex, 'type:', currentCard.type);
        
        // Stop all audio before changing cards
        if (wordAudioRef.current) {
          console.log('[MEDIA FETCH] Stopping wordAudio');
          wordAudioRef.current.pause();
          wordAudioRef.current.currentTime = 0;
        }
        if (sentenceAudioRef.current) {
          console.log('[MEDIA FETCH] Stopping sentenceAudio');
          sentenceAudioRef.current.pause();
          sentenceAudioRef.current.currentTime = 0;
        }
        if (listeningAudioRef.current) {
          console.log('[MEDIA FETCH] Stopping listeningAudio, paused:', listeningAudioRef.current.paused);
          listeningAudioRef.current.pause();
          listeningAudioRef.current.currentTime = 0;
        }
        if (frontAudioRef.current) {
          console.log('[MEDIA FETCH] Stopping frontAudio');
          frontAudioRef.current.pause();
          frontAudioRef.current.currentTime = 0;
        }
        
        // Clear previous URLs
        console.log('[MEDIA FETCH] Clearing previous URLs');
        setWordAudioUrl(null);
        setSentenceAudioUrl(null);
        setImageUrl(null);
        
        try {
          // Fetch word audio if card has it
          if (currentCard.audio_filename || currentCard.audioFilename) {
            const url = await getWordAudioUrl(currentCard.id);
            console.log('[MEDIA FETCH] Word audio URL:', url);
            setWordAudioUrl(url);
          }
          
          // Fetch sentence audio if card has a sentence (field 4)
          const sentenceField = getField(currentCard, 4);
          console.log('[MEDIA FETCH] Checking for sentence audio. Has sentence field:', !!sentenceField);
          if (sentenceField && sentenceField.trim()) {
            console.log('[MEDIA FETCH] Fetching sentence audio for card:', currentCard.id);
            try {
              const url = await getSentenceAudioUrl(currentCard.id);
              console.log('[MEDIA FETCH] Sentence audio URL:', url);
              setSentenceAudioUrl(url);
            } catch (err) {
              console.log('[MEDIA FETCH] No sentence audio available for this card');
              setSentenceAudioUrl(null);
            }
          } else {
            console.log('[MEDIA FETCH] No sentence field found on card');
          }
          
          // Fetch image if card has it
          if (currentCard.image_filename || currentCard.imageFilename) {
            const url = await getCardImageUrl(currentCard.id);
            setImageUrl(url);
          }
          
          // Preload next card's audio if it's a listening card
          if (currentCardIndex + 1 < shuffledCards.length) {
            const nextCard = shuffledCards[currentCardIndex + 1];
            if (nextCard.type === 'listening' && (nextCard.audio_filename || nextCard.audioFilename)) {
              const nextUrl = await getWordAudioUrl(nextCard.id);
              if (preloadAudioRef.current) {
                preloadAudioRef.current.src = nextUrl;
                preloadAudioRef.current.load();
              }
            }
          }
        } catch (error) {
          console.error('Error fetching media:', error);
        }
      }
    };
    
    fetchMediaUrls();
  }, [currentCardIndex, shuffledCards]);

  useEffect(() => {
    console.log('[AUTO-PLAY] Effect triggered. cardIndex:', currentCardIndex, 'type:', shuffledCards[currentCardIndex]?.type, 'wordAudioUrl:', wordAudioUrl);
    if (shuffledCards.length > 0 && shuffledCards[currentCardIndex].type === 'listening' && listeningAudioRef.current && wordAudioUrl) {
      console.log('[AUTO-PLAY] Attempting to play listening audio');
      // Small delay to ensure audio is loaded
      const playTimer = setTimeout(() => {
        if (listeningAudioRef.current && listeningAudioRef.current.readyState >= 2) {
          console.log('[AUTO-PLAY] Playing audio now, readyState:', listeningAudioRef.current.readyState);
          listeningAudioRef.current.play().catch(err => console.log('[AUTO-PLAY] Auto-play prevented:', err));
        } else {
          console.log('[AUTO-PLAY] Audio not ready, readyState:', listeningAudioRef.current?.readyState);
        }
      }, 100);
      
      return () => {
        console.log('[AUTO-PLAY] Cleanup timer');
        clearTimeout(playTimer);
      };
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
    console.log('[NEXT] Starting navigation, currentCardIndex:', currentCardIndex);
    // Stop all audio immediately before changing cards
    if (wordAudioRef.current) {
      console.log('[NEXT] Stopping wordAudio, paused:', wordAudioRef.current.paused, 'currentTime:', wordAudioRef.current.currentTime);
      wordAudioRef.current.pause();
      wordAudioRef.current.currentTime = 0;
    }
    if (sentenceAudioRef.current) {
      console.log('[NEXT] Stopping sentenceAudio');
      sentenceAudioRef.current.pause();
      sentenceAudioRef.current.currentTime = 0;
    }
    if (listeningAudioRef.current) {
      console.log('[NEXT] Stopping listeningAudio, paused:', listeningAudioRef.current.paused, 'currentTime:', listeningAudioRef.current.currentTime);
      listeningAudioRef.current.pause();
      listeningAudioRef.current.currentTime = 0;
    }
    if (frontAudioRef.current) {
      console.log('[NEXT] Stopping frontAudio');
      frontAudioRef.current.pause();
      frontAudioRef.current.currentTime = 0;
    }
    
    // Clear URLs immediately to prevent auto-play from using old URL
    console.log('[NEXT] Clearing audio URLs');
    setWordAudioUrl(null);
    setSentenceAudioUrl(null);
    setImageUrl(null);
    
    setShowBack(false);
    setShowPronunciation(false);
    setUserAnswer('');
    setIsCorrect(null);
    console.log('[NEXT] About to change card index from', currentCardIndex, 'to', (currentCardIndex + 1) % shuffledCards.length);
    setCurrentCardIndex((prevIndex) => (prevIndex + 1) % shuffledCards.length);
    if (answerInputRef.current) {
      answerInputRef.current.focus();
    }
  };

  const handlePreviousCard = () => {
    // Stop all audio immediately before changing cards
    if (wordAudioRef.current) {
      wordAudioRef.current.pause();
      wordAudioRef.current.currentTime = 0;
    }
    if (sentenceAudioRef.current) {
      sentenceAudioRef.current.pause();
      sentenceAudioRef.current.currentTime = 0;
    }
    if (listeningAudioRef.current) {
      listeningAudioRef.current.pause();
      listeningAudioRef.current.currentTime = 0;
    }
    if (frontAudioRef.current) {
      frontAudioRef.current.pause();
      frontAudioRef.current.currentTime = 0;
    }
    
    // Clear URLs immediately to prevent auto-play from using old URL
    setWordAudioUrl(null);
    setSentenceAudioUrl(null);
    setImageUrl(null);
    
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
        console.log('[FLIP] Attempting to play audio. wordAudioRef:', !!wordAudioRef.current, 'sentenceAudioRef:', !!sentenceAudioRef.current, 'sentenceAudioUrl:', sentenceAudioUrl);
        if (wordAudioRef.current) {
          console.log('[FLIP] Playing word audio');
          wordAudioRef.current.play().catch(err => console.log('[FLIP] Audio play failed:', err));
          
          // Play sentence audio after word audio finishes
          wordAudioRef.current.onended = () => {
            console.log('[FLIP] Word audio ended. Checking sentence audio - ref:', !!sentenceAudioRef.current, 'url:', sentenceAudioUrl);
            if (sentenceAudioRef.current && sentenceAudioUrl) {
              console.log('[FLIP] Playing sentence audio');
              sentenceAudioRef.current.play().catch(err => console.log('[FLIP] Sentence audio play failed:', err));
            } else {
              console.log('[FLIP] Sentence audio not available');
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
      // Find the confused card to get its backend ID
      const confusedCard = allCardsForSearch.find(c => c.nid === confusedCardNid);
      
      if (!confusedCard || !confusedCard.id || !currentCard.id) {
        alert('Unable to find card IDs. Please try again.');
        return;
      }
      
      // Use backend database IDs, not nids
      await addConfusedCards(currentCard.id, confusedCard.id);
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
    setLoadingConfusedCards(true);
    const currentCard = shuffledCards[currentCardIndex];
    try {
      const confused = await getConfusedCards(currentCard.nid);
      setConfusedCardsList(confused);
    } catch (error) {
      console.error('Error loading confused cards:', error);
      setConfusedCardsList([]);
    } finally {
      setLoadingConfusedCards(false);
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

  const handleToggleConfusedList = () => {
    setShowConfusedList(!showConfusedList);
    if (!showConfusedList) {
      loadConfusedCards(); // Load async, don't block modal display
    }
  };

  // Homophones functionality
  const findHomophones = () => {
    const currentCard = shuffledCards[currentCardIndex];
    const currentReading = (currentCard.reading || getField(currentCard, 2) || '').trim();
    const currentTerm = (getField(currentCard, 0) || '').trim();
    const currentMeaning = (currentCard.meaning || getField(currentCard, 1) || '').trim();
    
    if (!currentReading && !currentTerm && !currentMeaning) {
      setHomophonesList([]);
      setSameTermList([]);
      setSimilarMeaningList([]);
      return;
    }
    
    // Split current card's meanings by comma and trim
    const currentMeanings = currentMeaning
      .split(',')
      .map(m => m.trim().toLowerCase())
      .filter(m => m.length > 0);
    
    // Find all cards with the same reading (homophones)
    const homophones = allCardsForSearch.filter(card => {
      const cardReading = (card.reading || getField(card, 2) || '').trim();
      return currentReading && cardReading === currentReading && card.nid !== currentCard.nid;
    });
    
    // Find all cards with the same term but different reading/meaning
    const sameTermCards = allCardsForSearch.filter(card => {
      const cardTerm = (getField(card, 0) || '').trim();
      return currentTerm && cardTerm === currentTerm && card.nid !== currentCard.nid;
    });
    
    // Find all cards with at least one matching meaning
    const similarMeaningCards = allCardsForSearch.filter(card => {
      if (card.nid === currentCard.nid) return false;
      
      const cardMeaning = (card.meaning || getField(card, 1) || '').trim();
      const cardMeanings = cardMeaning
        .split(',')
        .map(m => m.trim().toLowerCase())
        .filter(m => m.length > 0);
      
      // Check if there's at least one matching meaning
      return cardMeanings.some(cm => currentMeanings.includes(cm));
    });
    
    setHomophonesList(homophones);
    setSameTermList(sameTermCards);
    setSimilarMeaningList(similarMeaningCards);
  };

  const handleToggleHomophonesList = () => {
    if (!showHomophonesList) {
      findHomophones();
    }
    setShowHomophonesList(!showHomophonesList);
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
        {/* Card progress counter */}
        <div style={{
          position: 'absolute',
          top: '10px',
          left: '50%',
          transform: 'translateX(-50%)',
          fontSize: '0.9rem',
          color: '#666',
          fontWeight: '500',
          backgroundColor: 'rgba(255, 255, 255, 0.9)',
          padding: '5px 12px',
          borderRadius: '15px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          zIndex: 10
        }}>
          {currentCardIndex + 1} / {shuffledCards.length}
        </div>
        
        <div className="card" onClick={handleFlipCard}>
          {/* Homophones icon - top right */}
          <div 
            className="card-corner-icon top-right-icon" 
            onClick={(e) => {
              e.stopPropagation();
              handleToggleHomophonesList();
            }}
            title="Homophones (same pronunciation)"
          >
            <i className="fas fa-language"></i>
          </div>
          
          {/* Confused cards icon - bottom left */}
          <div 
            className="card-corner-icon bottom-left-icon" 
            onClick={(e) => {
              e.stopPropagation();
              handleToggleConfusedList();
            }}
            title={`Confused cards (${confusedCardsList.length})`}
          >
            <i className="fas fa-random"></i> {confusedCardsList.length > 0 && <span className="badge">{confusedCardsList.length}</span>}
          </div>
          
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
                  <audio ref={listeningAudioRef} controls src={wordAudioUrl} preload="auto"></audio>
                </>
              )}
              {/* Hidden audio element for preloading next card */}
              <audio ref={preloadAudioRef} style={{display: 'none'}} preload="auto"></audio>
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

      {/* Confused Cards Modal */}
      {showConfusedList && (
        <div className="confused-dialog-overlay" onClick={() => setShowConfusedList(false)}>
          <div className="confused-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="confused-dialog-header">
              <h3>Confused Cards ({confusedCardsList.length})</h3>
              <button className="close-button" onClick={() => setShowConfusedList(false)}>✕</button>
            </div>
            
            <div className="confused-actions">
              <button 
                className="confused-action-button add-confused"
                onClick={() => {
                  setShowConfusedList(false);
                  handleShowConfusedDialog();
                }}
                title="Mark a card that you confused with this one"
              >
                ➕ Add Confused Card
              </button>
            </div>

            {confusedCardsList.length === 0 ? (
              <p className="no-confused">No confused cards yet. Click "Add Confused Card" to mark cards you confuse with this one.</p>
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
                          <span dangerouslySetInnerHTML={{ __html: card.word || '' }} />
                        </td>
                        <td>
                          <span dangerouslySetInnerHTML={{ __html: card.meaning || '' }} />
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
        </div>
      )}

      {/* Homophones Modal */}
      {showHomophonesList && (
        <div className="confused-dialog-overlay" onClick={() => setShowHomophonesList(false)}>
          <div className="confused-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="confused-dialog-header">
              <h3>Related Words</h3>
              <button className="close-button" onClick={() => setShowHomophonesList(false)}>✕</button>
            </div>
            
            {/* Current Card Display */}
            <div style={{
              padding: '1rem',
              backgroundColor: '#f8f9fa',
              borderRadius: '8px',
              marginBottom: '1.5rem',
              textAlign: 'center'
            }}>
              <h2 style={{margin: '0 0 0.5rem 0', fontSize: '2em'}}>
                <span dangerouslySetInnerHTML={{ __html: getField(shuffledCards[currentCardIndex], 0) }} />
              </h2>
              <p style={{margin: 0, color: '#666', fontSize: '1.1em'}}>
                {shuffledCards[currentCardIndex].reading || getField(shuffledCards[currentCardIndex], 2)}
              </p>
            </div>
            
            {/* Homophones Section */}
            <div style={{marginBottom: '2rem'}}>
              <h4 style={{marginBottom: '1rem', color: '#333', borderBottom: '2px solid #007bff', paddingBottom: '0.5rem'}}>
                Same Reading: {shuffledCards[currentCardIndex].reading || getField(shuffledCards[currentCardIndex], 2)}
              </h4>
              
              {homophonesList.length === 0 ? (
                <p className="no-confused">No other words found with this pronunciation.</p>
              ) : (
                <div className="confused-table-wrapper">
                  <table className="confused-table">
                    <thead>
                      <tr>
                        <th>Word</th>
                        <th>Reading</th>
                        <th>Meaning</th>
                        <th>Index</th>
                      </tr>
                    </thead>
                    <tbody>
                      {homophonesList.map((card) => (
                        <tr key={card.nid}>
                          <td>
                            <span dangerouslySetInnerHTML={{ __html: getField(card, 0) }} />
                          </td>
                          <td>
                            <span dangerouslySetInnerHTML={{ __html: card.reading || getField(card, 2) }} />
                          </td>
                          <td>
                            <span dangerouslySetInnerHTML={{ __html: getField(card, 1) }} />
                          </td>
                          <td className="count-cell">#{card.originalIndex}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
            
            {/* Same Term Section */}
            {sameTermList.length > 0 && (
              <div style={{marginBottom: '2rem'}}>
                <h4 style={{marginBottom: '1rem', color: '#333', borderBottom: '2px solid #28a745', paddingBottom: '0.5rem'}}>
                  Same Term: <span dangerouslySetInnerHTML={{ __html: getField(shuffledCards[currentCardIndex], 0) }} />
                </h4>
                
                <div className="confused-table-wrapper">
                  <table className="confused-table">
                    <thead>
                      <tr>
                        <th>Word</th>
                        <th>Reading</th>
                        <th>Meaning</th>
                        <th>Index</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sameTermList.map((card) => (
                        <tr key={card.nid}>
                          <td>
                            <span dangerouslySetInnerHTML={{ __html: getField(card, 0) }} />
                          </td>
                          <td>
                            <span dangerouslySetInnerHTML={{ __html: card.reading || getField(card, 2) }} />
                          </td>
                          <td>
                            <span dangerouslySetInnerHTML={{ __html: getField(card, 1) }} />
                          </td>
                          <td className="count-cell">#{card.originalIndex}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
            
            {/* Similar Meaning Section */}
            {similarMeaningList.length > 0 && (
              <div>
                <h4 style={{marginBottom: '1rem', color: '#333', borderBottom: '2px solid #ffc107', paddingBottom: '0.5rem'}}>
                  Similar Meaning: <span dangerouslySetInnerHTML={{ __html: getField(shuffledCards[currentCardIndex], 1) }} />
                </h4>
                
                <div className="confused-table-wrapper">
                  <table className="confused-table">
                    <thead>
                      <tr>
                        <th>Word</th>
                        <th>Reading</th>
                        <th>Meaning</th>
                        <th>Index</th>
                      </tr>
                    </thead>
                    <tbody>
                      {similarMeaningList.map((card) => (
                        <tr key={card.nid}>
                          <td>
                            <span dangerouslySetInnerHTML={{ __html: getField(card, 0) }} />
                          </td>
                          <td>
                            <span dangerouslySetInnerHTML={{ __html: card.reading || getField(card, 2) }} />
                          </td>
                          <td>
                            <span dangerouslySetInnerHTML={{ __html: getField(card, 1) }} />
                          </td>
                          <td className="count-cell">#{card.originalIndex}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Confused Cards Section - Compact Version */}
      <div className="confused-cards-section" style={{display: 'none'}}>
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
                {loadingConfusedCards ? (
                  <div className="loading-spinner" style={{ padding: '20px', textAlign: 'center' }}>
                    <i className="fas fa-spinner fa-spin" style={{ fontSize: '24px', color: '#007bff' }}></i>
                    <p style={{ marginTop: '10px' }}>Loading confused cards...</p>
                  </div>
                ) : confusedCardsList.length === 0 ? (
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

      {/* Homophones Section */}
      <div className="confused-cards-section" style={{display: 'none'}}>
        <details className="confused-details">
          <summary className="confused-summary">
            Homophones (Same Reading)
          </summary>
          <div className="confused-content">
            <div className="confused-actions">
              <button 
                className="confused-action-button view-confused"
                onClick={handleToggleHomophonesList}
                title="Show all cards with the same pronunciation"
              >
                📋 {showHomophonesList ? 'Hide List' : 'View List'}
              </button>
            </div>

            {/* Homophones List Table */}
            {showHomophonesList && (
              <div className="confused-list-container">
                <h4>Cards with same reading: {shuffledCards[currentCardIndex].reading || getField(shuffledCards[currentCardIndex], 2)}</h4>
                {homophonesList.length === 0 ? (
                  <p className="no-confused">No homophones found.</p>
                ) : (
                  <div className="confused-table-wrapper">
                    <table className="confused-table">
                      <thead>
                        <tr>
                          <th>Word</th>
                          <th>Meaning</th>
                          <th>Index</th>
                        </tr>
                      </thead>
                      <tbody>
                        {homophonesList.map((card) => (
                          <tr key={card.nid}>
                            <td>
                              <span dangerouslySetInnerHTML={{ __html: getField(card, 0) }} />
                            </td>
                            <td>
                              <span dangerouslySetInnerHTML={{ __html: getField(card, 1) }} />
                            </td>
                            <td className="count-cell">#{card.originalIndex}</td>
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
