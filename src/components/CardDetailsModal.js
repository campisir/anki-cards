import React, { useState } from 'react';
import './CardDetailsModal.css';

const CardDetailsModal = ({ card, onClose }) => {
  const [activeTab, setActiveTab] = useState('anki');

  if (!card) return null;

  // Calculate Anki stats from review history
  const calculateAnkiStats = () => {
    if (!card.reviews || card.reviews.length === 0) {
      return {
        totalReviews: 0,
        lapses: 0,
        avgTime: 0,
        totalTime: 0,
        firstReview: null,
        latestReview: null,
        currentInterval: card.interval || 0,
        currentEase: card.factor ? (card.factor / 10) : 0
      };
    }

    const reviews = [...card.reviews].sort((a, b) => 
      new Date(a.timestamp) - new Date(b.timestamp)
    );

    const lapses = reviews.filter(r => r.ease === 1).length;
    const totalTime = reviews.reduce((sum, r) => sum + (r.time || 0), 0);
    const avgTime = totalTime / reviews.length;

    return {
      totalReviews: reviews.length,
      lapses,
      avgTime: avgTime.toFixed(2),
      totalTime: (totalTime / 60).toFixed(2),
      firstReview: reviews[0].timestamp,
      latestReview: reviews[reviews.length - 1].timestamp,
      currentInterval: card.interval || 0,
      currentEase: card.factor ? (card.factor / 10) : 0
    };
  };

  const stats = calculateAnkiStats();

  // Format interval for display
  const formatInterval = (days) => {
    if (days < 1) return `${Math.round(days * 1440)} minutes`;
    if (days < 30) return `${Math.round(days)} days`;
    if (days < 365) return `${(days / 30).toFixed(2)} months`;
    return `${(days / 365).toFixed(2)} years`;
  };

  // Format review type
  const getReviewType = (type) => {
    const types = {
      0: 'Learn',
      1: 'Review',
      2: 'Relearn',
      3: 'Filtered',
      4: 'Manual'
    };
    return types[type] || 'Unknown';
  };

  // Format reviews for table
  const formattedReviews = card.reviews
    ? [...card.reviews]
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
        .map(review => {
          const date = new Date(review.timestamp);
          // Apply Anki day boundary
          const adjustedDate = new Date(date);
          if (adjustedDate.getHours() < 4) {
            adjustedDate.setDate(adjustedDate.getDate() - 1);
          }
          
          return {
            date: adjustedDate.toLocaleString('en-US', {
              year: 'numeric',
              month: '2-digit',
              day: '2-digit',
              hour: '2-digit',
              minute: '2-digit',
              hour12: false
            }).replace(',', ' @'),
            type: getReviewType(review.type),
            rating: review.ease,
            interval: formatInterval(review.interval),
            ease: review.factor ? `${review.factor / 10}%` : 'N/A',
            time: `${review.time}s`
          };
        })
    : [];

  const handleOverlayClick = (e) => {
    if (e.target.className === 'card-details-modal-overlay') {
      onClose();
    }
  };

  return (
    <div className="card-details-modal-overlay" onClick={handleOverlayClick}>
      <div className="card-details-modal">
        <div className="card-details-header">
          <h2 className="card-details-title">
            {card.fields[0].replace(/<[^>]*>/g, '')}
          </h2>
          <button className="card-details-close" onClick={onClose}>×</button>
        </div>

        <div className="card-details-tabs">
          <button
            className={`card-details-tab ${activeTab === 'anki' ? 'active' : ''}`}
            onClick={() => setActiveTab('anki')}
          >
            Anki Stats
          </button>
          <button
            className={`card-details-tab ${activeTab === 'local' ? 'active' : ''}`}
            onClick={() => setActiveTab('local')}
          >
            Local Stats
          </button>
        </div>

        <div className="card-details-content">
          {activeTab === 'anki' && (
            <>
              <div className="stats-grid">
                {stats.firstReview && (
                  <div className="stat-item">
                    <div className="stat-label">First Review</div>
                    <div className="stat-value">
                      {new Date(stats.firstReview).toLocaleDateString()}
                    </div>
                  </div>
                )}
                {stats.latestReview && (
                  <div className="stat-item">
                    <div className="stat-label">Latest Review</div>
                    <div className="stat-value">
                      {new Date(stats.latestReview).toLocaleDateString()}
                    </div>
                  </div>
                )}
                <div className="stat-item">
                  <div className="stat-label">Interval</div>
                  <div className="stat-value">{formatInterval(stats.currentInterval)}</div>
                </div>
                <div className="stat-item">
                  <div className="stat-label">Ease</div>
                  <div className="stat-value">{stats.currentEase}%</div>
                </div>
                <div className="stat-item">
                  <div className="stat-label">Reviews</div>
                  <div className="stat-value">{stats.totalReviews}</div>
                </div>
                <div className="stat-item">
                  <div className="stat-label">Lapses</div>
                  <div className="stat-value">{stats.lapses}</div>
                </div>
                <div className="stat-item">
                  <div className="stat-label">Average Time</div>
                  <div className="stat-value">{stats.avgTime}s</div>
                </div>
                <div className="stat-item">
                  <div className="stat-label">Total Time</div>
                  <div className="stat-value">{stats.totalTime} min</div>
                </div>
              </div>

              {formattedReviews.length > 0 && (
                <div className="reviews-section">
                  <h3 className="reviews-title">Review History</h3>
                  <table className="reviews-table">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Type</th>
                        <th>Rating</th>
                        <th>Interval</th>
                        <th>Ease</th>
                        <th>Time</th>
                      </tr>
                    </thead>
                    <tbody>
                      {formattedReviews.map((review, index) => (
                        <tr key={index}>
                          <td>{review.date}</td>
                          <td>
                            <span className={`review-type review-type-${review.type.toLowerCase()}`}>
                              {review.type}
                            </span>
                          </td>
                          <td className={`review-rating review-rating-${review.rating}`}>
                            {review.rating}
                          </td>
                          <td>{review.interval}</td>
                          <td>{review.ease}</td>
                          <td>{review.time}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}

          {activeTab === 'local' && (
            <div className="stats-grid">
              <div className="stat-item">
                <div className="stat-label">Success Rate</div>
                <div className="stat-value">
                  {card.appTotalAttempts > 0
                    ? `${Math.round((card.appCorrectAttempts / card.appTotalAttempts) * 100)}%`
                    : 'No data'}
                </div>
              </div>
              <div className="stat-item">
                <div className="stat-label">Total Attempts</div>
                <div className="stat-value">{card.appTotalAttempts || 0}</div>
              </div>
              <div className="stat-item">
                <div className="stat-label">Correct Attempts</div>
                <div className="stat-value">{card.appCorrectAttempts || 0}</div>
              </div>
              <div className="stat-item">
                <div className="stat-label">Frequency Rank</div>
                <div className="stat-value">{card.rank !== 'N/A' ? card.rank : 'N/A'}</div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CardDetailsModal;
