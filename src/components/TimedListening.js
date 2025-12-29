import React, { useState, useEffect, useRef } from 'react';
import { getWordAudioUrl } from '../utils/cardService';
import './TimedListening.css';

// Utility to shuffle an array
const shuffleArray = (array) => {
    const newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
};

function TimedListening({ cards, mediaFiles, timeLimit, onBackToMenu }) {
    // Initialize state
    const [cardPool, setCardPool] = useState(shuffleArray([...cards]));
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isFlipped, setIsFlipped] = useState(false);
    const [flipTime, setFlipTime] = useState(null);
    const [cardStartTime, setCardStartTime] = useState(null);
    const [elapsedTime, setElapsedTime] = useState(0);
    const [wordAudioUrl, setWordAudioUrl] = useState(null);
    
    const intervalRef = useRef(null);
    const audioRef = useRef(null);

    const currentCard = cardPool[currentIndex];

    // Helper to access card fields (handles both old array format and new object format)
    const getField = (card, index) => {
        return card && card.fields ? card.fields[index] : (card ? card[index] : null);
    };

    // Start the live timer to update elapsedTime.
    // The timer counts upward continuously, regardless of the timeLimit.
    const startTimer = () => {
        const start = Date.now();
        setCardStartTime(start);
        setElapsedTime("0.00");
        intervalRef.current = setInterval(() => {
            const now = Date.now();
            const elapsed = (now - start) / 1000;
            setElapsedTime(elapsed.toFixed(2));
        }, 50);
    };

    // Fetch audio URL when card changes
    useEffect(() => {
        console.log('[TL FETCH] Card changed, currentIndex:', currentIndex, 'card:', currentCard?.id);
        // Clear previous URL immediately
        console.log('[TL FETCH] Clearing previous URL');
        setWordAudioUrl(null);
        
        const fetchAudio = async () => {
            if (currentCard && currentCard.id) {
                try {
                    console.log('[TL FETCH] Fetching audio for card:', currentCard.id);
                    const url = await getWordAudioUrl(currentCard.id);
                    console.log('[TL FETCH] Got audio URL:', url);
                    setWordAudioUrl(url);
                } catch (error) {
                    console.error('[TL FETCH] Error fetching audio:', error);
                    setWordAudioUrl(null);
                }
            }
        };
        fetchAudio();
    }, [currentCard]);

    // When a new card is loaded, reset state, clear timers, then play audio.
    useEffect(() => {
        console.log('[TL PLAY] Effect triggered, currentIndex:', currentIndex, 'wordAudioUrl:', wordAudioUrl);
        if (!currentCard) return;
        
        // Stop any playing audio immediately
        if (audioRef.current) {
            console.log('[TL PLAY] Stopping audio, paused:', audioRef.current.paused, 'currentTime:', audioRef.current.currentTime);
            audioRef.current.pause();
            audioRef.current.currentTime = 0;
            audioRef.current.onended = null;
        }
        
        // Reset state for the new card.
        setIsFlipped(false);
        setFlipTime(null);
        setCardStartTime(null);
        setElapsedTime(0);
        clearInterval(intervalRef.current);
    
        // Wait a bit for the audio URL to be set, then play
        const playTimer = setTimeout(() => {
            console.log('[TL PLAY] Timer fired, checking conditions...');
            if (getField(currentCard, 3) && audioRef.current && wordAudioUrl) {
                console.log('[TL PLAY] Playing audio:', wordAudioUrl);
                audioRef.current.load();
                audioRef.current.play()
                    .then(() => {
                        console.log('[TL PLAY] Audio playing successfully');
                        // Wait until the audio finishes, then start the timer.
                        audioRef.current.onended = () => {
                            console.log('[TL PLAY] Audio ended, starting timer');
                            startTimer();
                            audioRef.current.onended = null;
                        };
                    })
                    .catch(err => {
                        console.log('[TL PLAY] Play error:', err);
                        startTimer();
                    });
            } else if (!getField(currentCard, 3)) {
                // Only start timer immediately if card has no audio field
                console.log('[TL PLAY] Card has no audio, starting timer immediately');
                startTimer();
            } else {
                // Has audio field but URL not ready yet - don't start timer, wait for URL to load
                console.log('[TL PLAY] Waiting for audio URL to load...');
            }
        }, 50);
    
        return () => {
            console.log('[TL PLAY] Cleanup');
            clearTimeout(playTimer);
            clearInterval(intervalRef.current);
            if (audioRef.current) {
                audioRef.current.pause();
                audioRef.current.currentTime = 0;
                audioRef.current.onended = null;
            }
        };
    }, [currentIndex, wordAudioUrl]);

    // When the user flips the card, stop the timer.
    const handleFlip = () => {
        if (isFlipped) return;
        if (audioRef.current) {
            audioRef.current.onended = null;
        }
        clearInterval(intervalRef.current);
        const now = Date.now();
        setFlipTime(now);
        setIsFlipped(true);
    };

    // Mark the card and reset state for the next card.
    const handleMark = (correct) => {
        if (!currentCard) return;
        console.log('[TL MARK] Marking card, correct:', correct, 'currentIndex:', currentIndex);
        
        // Stop audio immediately and clear URL before changing cards
        if (audioRef.current) {
            console.log('[TL MARK] Stopping audio, paused:', audioRef.current.paused, 'currentTime:', audioRef.current.currentTime);
            audioRef.current.pause();
            audioRef.current.currentTime = 0;
            audioRef.current.onended = null;
            audioRef.current.src = ''; // Clear the src
            audioRef.current.load(); // Force reload to clear buffer
        }
        console.log('[TL MARK] Clearing URL');
        setWordAudioUrl(null);
        
        setCardPool(prevPool => {
            const updatedPool = [...prevPool];
            updatedPool.splice(currentIndex, 1);
            // If not correct, reinsert the card.
            if (!correct) {
                const insertIndex = Math.floor(Math.random() * (updatedPool.length + 1));
                updatedPool.splice(insertIndex, 0, currentCard);
            }
            return updatedPool;
        });
        clearInterval(intervalRef.current);
        setIsFlipped(false);
        setFlipTime(null);
        setElapsedTime(0);
        const newIndex = currentIndex >= cardPool.length - 1 ? 0 : currentIndex + 1;
        console.log('[TL MARK] Setting new index:', newIndex);
        setCurrentIndex(prev => (prev >= cardPool.length - 1 ? 0 : prev + 1));
    };

    // When the user clicks a marking button.
    const handleUserMark = (markAsCorrect) => {
        if (!isFlipped) return;
        handleMark(markAsCorrect);
    };

    // Keyboard controls
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (!isFlipped) {
                // If card is not flipped, spacebar or Enter flips the card.
                if (e.key === " " || e.key === "Enter") {
                    e.preventDefault();
                    handleFlip();
                }
            } else {
                const correctAvailable = Number(elapsedTime) <= timeLimit;
                if (correctAvailable) {
                    // If correct option is available.
                    if (e.key === "ArrowLeft" || e.key === " " || e.key === "Enter") {
                        e.preventDefault();
                        handleUserMark(true);
                    } else if (e.key === "ArrowRight" || e.key === "Backspace") {
                        e.preventDefault();
                        handleUserMark(false);
                    }
                } else {
                    // Only Incorrect option is available; any key among the specified triggers Incorrect.
                    if (
                        e.key === " " ||
                        e.key === "Enter" ||
                        e.key === "ArrowLeft" ||
                        e.key === "ArrowRight" ||
                        e.key === "Backspace"
                    ) {
                        e.preventDefault();
                        handleUserMark(false);
                    }
                }
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isFlipped, elapsedTime, timeLimit]);

    // Victory Screen: When there are no more cards, show the victory screen.
    if(cardPool.length === 0) {
        return (
            <div className="victory-screen">
                <h1>Congratulations!</h1>
                <p>You have completed the study session.</p>
                <button onClick={onBackToMenu} className="back-button">Return to Menu</button>
            </div>
        );
    }

    return (
        <div className="timed-listening study">
            <button onClick={onBackToMenu} className="back-button">Back to Menu</button>
            <button onClick={() => window.location.reload()} className="shuffle-button">Shuffle Cards</button>
            
            <div className="card" onClick={handleFlip}>
                {isFlipped ? (
                    <div className="card-back">
                        <div className="word-audio-icon" onClick={(e) => e.stopPropagation()}>
                            <i className="fas fa-volume-up"></i>
                        </div>
                        <p className="term-text" style={{ fontSize: '2em', marginBottom: '1em' }}>
                            <span dangerouslySetInnerHTML={{ __html: getField(currentCard, 0) }} />
                        </p>
                        <p className="meaning-text">
                            <strong>Meaning:</strong> <span dangerouslySetInnerHTML={{ __html: getField(currentCard, 1) }} />
                        </p>
                        <p className="flip-duration">Flip Time: {elapsedTime} seconds</p>
                    </div>
                ) : (
                    <div className="card-front">
                        <p className="front-text"><strong>Listening Card</strong></p>
                        <audio
                            ref={audioRef}
                            controls
                            style={{ display: 'none' }}
                            src={wordAudioUrl || ''}
                            preload="auto"
                        />
                        <p>Audio is playing... Click to flip when ready.</p>
                        {/* Display the live timer after audio starts */}
                        {cardStartTime && <p className="live-timer">Elapsed Time: {elapsedTime} seconds</p>}
                    </div>
                )}
            </div>

            {isFlipped && (
                <div className="mark-buttons">
                    {Number(elapsedTime) <= timeLimit ? (
                        <>
                            <button onClick={() => handleUserMark(true)}>Correct</button>
                            <button onClick={() => handleUserMark(false)}>Incorrect</button>
                        </>
                    ) : (
                        <>
                            {/* Only allow marking as Incorrect if elapsed time exceeds the limit */}
                            <button onClick={() => handleUserMark(false)}>Incorrect</button>
                            <p>Time limit exceeded</p>
                        </>
                    )}
                </div>
            )}
            <p>Time limit per card: {timeLimit} seconds</p>
            <p>Cards remaining: {cardPool.length}</p>
        </div>
    );
}

export default TimedListening;