import React, { useState } from 'react';
import './CardsTable.css';

function CardsTable({ cards, mediaFiles, onBackToMenu }) {
  // Pagination settings
  const rowsPerPage = 50;
  const [currentPage, setCurrentPage] = useState(1);
  const totalPages = Math.ceil(cards.length / rowsPerPage);
  const [jumpPage, setJumpPage] = useState('');

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
  const currentCards = cards.slice(indexOfFirstRow, indexOfLastRow);

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

  return (
    <div className="cards-table-page">
      <button onClick={onBackToMenu} className="back-button">
        Back to Menu
      </button>
      <div className="table-container">
        <table className="cards-table">
        <thead>
          <tr>
            <th>Original Index</th>
            <th>Rank</th>
            <th>Word</th>
            <th>Meaning</th>
            <th>Example Sentence</th>
            <th>Example Sentence Meaning</th>
          </tr>
        </thead>
        <tbody>
          {currentCards.map((card, index) => {
            // Helper to access card fields (handles both old array format and new object format)
            const getField = (c, idx) => (c.fields ? c.fields[idx] : c[idx]);
            
            // Mapping based on Study.js index assignments:
            // field[0]: Word, field[1]: Meaning,
            // field[3]: Word audio,
            // field[4]: Example Sentence, field[7]: Sentence audio,
            // field[6]: Example Sentence Meaning,
            // card.rank is added from App.js.
            const wordAudioSrc = getAudioSrc(getField(card, 3));
            const sentenceAudioSrc = getAudioSrc(getField(card, 7));
            return (
              <tr key={index + indexOfFirstRow}>
                <td>
                  <span>{card.originalIndex}</span>
                </td>
                <td>
                  <span>{card.rank}</span>
                </td>
                <td
                  className="clickable"
                  onClick={() => playAudio(wordAudioSrc)}
                  title="Click to play word audio"
                >
                  <span dangerouslySetInnerHTML={{ __html: getField(card, 0) }} />
                </td>
                <td>
                  <span dangerouslySetInnerHTML={{ __html: getField(card, 1) }} />
                </td>
                <td
                  className="clickable"
                  onClick={() => playAudio(sentenceAudioSrc)}
                  title="Click to play sentence audio"
                >
                  <span dangerouslySetInnerHTML={{ __html: getField(card, 4) }} />
                </td>
                <td>
                  <span dangerouslySetInnerHTML={{ __html: getField(card, 6) }} />
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
    </div>
  );
}

export default CardsTable;