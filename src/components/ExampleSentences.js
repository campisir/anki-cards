import React, { useState, useEffect } from 'react';
import './ExampleSentences.css';

function ExampleSentences({
  sentences,
  studyType, // 'reading', 'listening', or 'both'
  onExit,
  mediaFiles
}) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showTranslation, setShowTranslation] = useState(false);
  const [showSentence, setShowSentence] = useState(studyType === 'reading');
  const [audioLoaded, setAudioLoaded] = useState(false);
  const [audioError, setAudioError] = useState(false);
  const [showKnownWords, setShowKnownWords] = useState(false);
  const [stats, setStats] = useState({
    completed: 0,
    total: sentences.length
  });

  const currentSentence = sentences[currentIndex];
  const isListening = studyType === 'listening' || studyType === 'both';
  const isReading = studyType === 'reading' || studyType === 'both';

  // Get English translation
  const getTranslation = () => {
    if (!currentSentence.translations || currentSentence.translations.length === 0) {
      return 'No translation available';
    }
    return currentSentence.translations[0].text;
  };

  // Get audio URL
  const getAudioUrl = () => {
    if (!currentSentence.audios || currentSentence.audios.length === 0) {
      return null;
    }
    return currentSentence.audios[0].download_url;
  };

  // Play audio automatically for listening mode
  useEffect(() => {
    if (isListening && !showSentence) {
      const audioUrl = getAudioUrl();
      if (audioUrl) {
        const audio = new Audio(audioUrl);
        audio.play().catch(err => {
          console.error('Error playing audio:', err);
          setAudioError(true);
        });
      }
    }
  }, [currentIndex, isListening, showSentence]);

  const handleRevealClick = () => {
    if (isListening && !showSentence) {
      // First click in listening mode: reveal sentence
      setShowSentence(true);
    } else {
      // Reveal translation
      setShowTranslation(true);
    }
  };

  const handleNext = () => {
    if (currentIndex < sentences.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setShowTranslation(false);
      setShowSentence(isReading); // Reset based on study type
      setShowKnownWords(false); // Collapse known words on next sentence
      setAudioError(false);
      setStats(prev => ({ ...prev, completed: prev.completed + 1 }));
    } else {
      // Finished all sentences
      alert('You have completed all example sentences!');
      onExit();
    }
  };

  const handlePlayAudio = () => {
    const audioUrl = getAudioUrl();
    if (audioUrl) {
      const audio = new Audio(audioUrl);
      audio.play().catch(err => {
        console.error('Error playing audio:', err);
        setAudioError(true);
      });
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      setShowTranslation(false);
      setShowSentence(isReading);
      setShowKnownWords(false); // Collapse known words on previous sentence
      setAudioError(false);
      setStats(prev => ({ ...prev, completed: Math.max(0, prev.completed - 1) }));
    }
  };

  if (sentences.length === 0) {
    return (
      <div className="example-sentences">
        <div className="no-sentences">
          <h2>No Sentences Available</h2>
          <p>Could not find any example sentences matching your criteria.</p>
          <button onClick={onExit} className="btn btn-primary">
            Back to Menu
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="example-sentences">
      <div className="sentence-container">
        {/* Header */}
        <div className="sentence-header">
          <button onClick={onExit} className="btn-exit">
            ← Exit
          </button>
          <div className="sentence-progress">
            <span className="progress-text">
              {currentIndex + 1} / {sentences.length}
            </span>
            <div className="progress-bar">
              <div 
                className="progress-fill" 
                style={{ width: `${((currentIndex + 1) / sentences.length) * 100}%` }}
              />
            </div>
          </div>
          <div className="study-mode-badge">
            {studyType === 'reading' && '📖 Reading'}
            {studyType === 'listening' && '🎧 Listening'}
            {studyType === 'both' && '📖🎧 Both'}
          </div>
        </div>

        {/* Main Content */}
        <div className="sentence-content">
          {/* Sentence Card */}
          <div className="sentence-card">
            {showSentence ? (
              <>
                <div className="sentence-text japanese">
                  {currentSentence.text}
                </div>
                
                {/* Word Analysis */}
                {currentSentence.wordAnalysis && (
                  <div className="word-analysis">
                    <div className="analysis-stat">
                      <span className="stat-label">Coverage:</span>
                      <span className="stat-value">
                        {currentSentence.wordAnalysis.coverage.toFixed(0)}%
                      </span>
                    </div>
                    <div className="analysis-stat">
                      <span className="stat-label">Known words:</span>
                      <span className="stat-value">
                        {currentSentence.wordAnalysis.knownWords.length}
                      </span>
                    </div>
                  </div>
                )}

                {/* Tokenized Words Display */}
                {currentSentence.wordAnalysis && currentSentence.wordAnalysis.allTokens && (
                  <div className="known-words-box">
                    <div 
                      className="known-words-header"
                      onClick={() => setShowKnownWords(!showKnownWords)}
                    >
                      <span className="known-words-icon">🔤</span>
                      <span className="known-words-title">
                        Sentence Breakdown ({currentSentence.wordAnalysis.allTokens.length} tokens)
                      </span>
                      <span className={`expand-icon ${showKnownWords ? 'expanded' : ''}`}>
                        ▼
                      </span>
                    </div>
                    {showKnownWords && (
                      <div>
                        <div className="token-legend">
                          <span className="legend-item">
                            <span className="legend-badge known">Known</span>
                          </span>
                          <span className="legend-item">
                            <span className="legend-badge unknown">Unknown</span>
                          </span>
                          <span className="legend-item">
                            <span className="legend-badge omitted">Particle/Other</span>
                          </span>
                        </div>
                        <div className="known-words-list">
                          {currentSentence.wordAnalysis.allTokens.map((item, index) => (
                            <span 
                              key={index} 
                              className={`known-word-badge ${item.status}`}
                            >
                              {item.token}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Audio Controls */}
                {getAudioUrl() && (
                  <div className="audio-controls">
                    <button 
                      onClick={handlePlayAudio} 
                      className="btn-audio"
                      disabled={audioError}
                    >
                      {audioError ? '❌ Audio Error' : '🔊 Play Audio'}
                    </button>
                  </div>
                )}
              </>
            ) : (
              <div className="sentence-hidden">
                <div className="hidden-icon">🎧</div>
                <p className="hidden-text">Listen to the audio</p>
                {getAudioUrl() && (
                  <button onClick={handlePlayAudio} className="btn-audio-large">
                    🔊 Play Again
                  </button>
                )}
              </div>
            )}

            {/* Translation (revealed) */}
            {showTranslation && (
              <div className="sentence-translation">
                <div className="translation-label">Translation:</div>
                <div className="translation-text">
                  {getTranslation()}
                </div>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="sentence-actions">
            {!showTranslation ? (
              <button onClick={handleRevealClick} className="btn btn-reveal">
                {isListening && !showSentence ? '👁️ Show Sentence' : '💬 Show Translation'}
              </button>
            ) : (
              <div className="nav-buttons">
                <button 
                  onClick={handlePrevious} 
                  className="btn btn-nav"
                  disabled={currentIndex === 0}
                >
                  ← Previous
                </button>
                <button onClick={handleNext} className="btn btn-primary btn-nav">
                  {currentIndex < sentences.length - 1 ? 'Next →' : 'Finish ✓'}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Info Footer */}
        <div className="sentence-footer">
          <div className="sentence-info">
            <span className="info-item">
              ID: {currentSentence.id}
            </span>
            {currentSentence.owner && (
              <span className="info-item">
                By: {currentSentence.owner}
              </span>
            )}
            <span className="info-item">
              License: {currentSentence.license}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ExampleSentences;
