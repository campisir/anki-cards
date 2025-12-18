import React, { useState } from 'react';
import './CardsTable.css';
import CardDetailsModal from './CardDetailsModal';

function CardsTable({ cards, mediaFiles, onBackToMenu }) {
  // Pagination settings
  const rowsPerPage = 50;
  const [currentPage, setCurrentPage] = useState(1);
  const [jumpPage, setJumpPage] = useState('');
  const [selectedCard, setSelectedCard] = useState(null);
  const [sortBy, setSortBy] = useState('rank');

  // Calculate Anki stats for each card
  const getAnkiStats = (card) => {
    // Use imported Anki stats from backend
    const reviewCount = card.repetitions || 0;
    const lapseCount = card.lapses || 0;
    const interval = card.interval || 0;
    const easeFactor = card.easeFactor || 0;
    return { reviewCount, lapseCount, interval, easeFactor };
  };

  // Sort cards based on selected criterion
  const sortedCards = [...cards].sort((a, b) => {
    switch (sortBy) {
      case 'rank': {
        const aRank = typeof a.rank === 'number' ? a.rank : Infinity;
        const bRank = typeof b.rank === 'number' ? b.rank : Infinity;
        return aRank - bRank;
      }
      case 'originalIndex':
        return a.originalIndex - b.originalIndex;
      case 'successRate': {
        const aRate = a.appTotalAttempts > 0 ? (a.appCorrectAttempts / a.appTotalAttempts) : 0;
        const bRate = b.appTotalAttempts > 0 ? (b.appCorrectAttempts / b.appTotalAttempts) : 0;
        return bRate - aRate; // Descending order (highest first)
      }
      case 'totalAttempts':
        return (b.appTotalAttempts || 0) - (a.appTotalAttempts || 0); // Descending
      case 'ankiReviewCount': {
        const aStats = getAnkiStats(a);
        const bStats = getAnkiStats(b);
        return bStats.reviewCount - aStats.reviewCount; // Descending
      }
      case 'ankiLapseCount': {
        const aStats = getAnkiStats(a);
        const bStats = getAnkiStats(b);
        return bStats.lapseCount - aStats.lapseCount; // Descending
      }
      default:
        return 0;
    }
  });

  const totalPages = Math.ceil(sortedCards.length / rowsPerPage);

  // Helper function to extract the raw audio key
  const getAudioSrc = (audioLabel) => {
    if (!audioLabel) return null;
    const key = audioLabel.replace('[sound:', '').replace(']', '');
    return mediaFiles[key] || null;
  };

  // Play audio by creating a new Audio element instance
  const playAudio = (src) => {
    if (src) {
      const audio = new Audio(src);
      audio.play();
    }
  };

  // Compute the slice of cards to display on current page
  const indexOfLastRow = currentPage * rowsPerPage;
  const indexOfFirstRow = indexOfLastRow - rowsPerPage;
  const currentCards = sortedCards.slice(indexOfFirstRow, indexOfLastRow);

  const goToPage = (pageNumber) => {
    if (pageNumber >= 1 && pageNumber <= totalPages) {
      setCurrentPage(pageNumber);
    }
  };

  const handleJump = () => {
    const pageNumber = parseInt(jumpPage, 10);
    if (!isNaN(pageNumber) && pageNumber >= 1 && pageNumber <= totalPages) {
      setCurrentPage(pageNumber);
      setJumpPage('');
    }
  };

  const handleSortChange = (newSortBy) => {
    setSortBy(newSortBy);
    setCurrentPage(1); // Reset to first page when sorting changes
  };

  return (
    <div className="cards-table-page">
      <button onClick={onBackToMenu} className="back-button">
        Back to Menu
      </button>

      <div className="sort-controls">
        <label htmlFor="sort-select">Sort by:</label>
        <select 
          id="sort-select"
          value={sortBy} 
          onChange={(e) => handleSortChange(e.target.value)}
          className="sort-select"
        >
          <option value="rank">Rank (Frequency)</option>
          <option value="originalIndex">Original Index</option>
          <option value="successRate">Success Rate (Local)</option>
          <option value="totalAttempts">Total Attempts (Local)</option>
          <option value="ankiReviewCount">Anki Review Count</option>
          <option value="ankiLapseCount">Anki Lapse Count</option>
        </select>
      </div>

      <div className="table-container">
        <table className="cards-table">
        <thead>
          <tr>
            <th>Index</th>
            <th>Rank</th>
            <th>Word</th>
            <th>Reading</th>
            <th>Meaning</th>
            <th>Sentence</th>
            <th>Sentence Meaning</th>
          </tr>
        </thead>
        <tbody>
          {currentCards.map((card, index) => {
            return (
              <tr 
                key={index + indexOfFirstRow}
                className="table-row-clickable"
                onClick={() => setSelectedCard(card)}
                title="Click for detailed stats"
              >
                <td>
                  <span>{card.originalIndex}</span>
                </td>
                <td>
                  <span>{card.rank || '-'}</span>
                </td>
                <td>
                  <span>{card.word}</span>
                </td>
                <td>
                  <span>{card.reading}</span>
                </td>
                <td>
                  <span>{card.meaning}</span>
                </td>
                <td title={card.sentence}>
                  <span>{card.sentence?.substring(0, 40)}{card.sentence?.length > 40 ? '...' : ''}</span>
                </td>
                <td title={card.sentenceMeaning}>
                  <span>{card.sentenceMeaning?.substring(0, 40)}{card.sentenceMeaning?.length > 40 ? '...' : ''}</span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      </div>
      <div className="pagination">
        <button onClick={() => goToPage(currentPage - 1)} disabled={currentPage === 1}>
          Prev
        </button>
        <span>
          Page {currentPage} of {totalPages}
        </span>
        <button onClick={() => goToPage(currentPage + 1)} disabled={currentPage === totalPages}>
          Next
        </button>
      </div>
      <div className="jump-to-page">
        <input
          type="number"
          value={jumpPage}
          onChange={(e) => setJumpPage(e.target.value)}
          placeholder="Page #"
          min="1"
          max={totalPages}
        />
        <button onClick={handleJump}>Go</button>
      </div>

      {selectedCard && (
        <CardDetailsModal 
          card={selectedCard} 
          onClose={() => setSelectedCard(null)} 
        />
      )}
    </div>
  );
}

export default CardsTable;