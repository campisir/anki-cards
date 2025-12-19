import React, { useState, useEffect } from 'react';
import './CardDetailsModal.css';
import { getCard } from '../utils/apiService';

const CardDetailsModal = ({ card, onClose }) => {
  const [activeTab, setActiveTab] = useState('anki');
  const [fullCard, setFullCard] = useState(card);
  const [loading, setLoading] = useState(false);

  // Fetch full card details with reviews when modal opens
  useEffect(() => {
    const fetchCardDetails = async () => {
      if (!card.reviews && card.id) {
        setLoading(true);
        try {
          const details = await getCard(card.id);
          console.log('Fetched card reviews:', details.reviews?.slice(0, 3)); // Debug: show first 3 reviews
          console.log('Fetched card_type_stats:', details.card_type_stats); // Debug
          setFullCard({ ...card, reviews: details.reviews, card_type_stats: details.card_type_stats });
        } catch (error) {
          console.error('Error fetching card details:', error);
          setFullCard(card);
        } finally {
          setLoading(false);
        }
      }
    };

    fetchCardDetails();
  }, [card]);

  if (!card) return null;

  // Calculate Anki stats from imported data and review history
  const calculateAnkiStats = () => {
    // Count actual reviews instead of using merged reps field
    const totalReviews = fullCard.reviews ? fullCard.reviews.length : 0;
    const lapses = fullCard.lapses || 0;
    const currentInterval = fullCard.interval || 0;
    const currentEase = fullCard.easeFactor || fullCard.ease_factor || 0;
    
    console.log('fullCard.card_type_stats:', fullCard.card_type_stats); // Debug
    
    if (!fullCard.reviews || fullCard.reviews.length === 0) {
      return {
        totalReviews: 0,
        lapses,
        avgTime: 0,
        totalTime: 0,
        firstReview: null,
        latestReview: null,
        currentInterval,
        currentEase: (currentEase * 100) // Convert 2.5 to 250%
      };
    }

    const reviews = [...fullCard.reviews].sort((a, b) => 
      new Date(a.timestamp) - new Date(b.timestamp)
    );

    // response_time is in milliseconds, convert to seconds for display
    const totalTime = reviews.reduce((sum, r) => sum + ((r.response_time || r.time || 0) / 1000), 0);
    const avgTime = totalTime / reviews.length;

    return {
      totalReviews: reviews.length, // Use actual review count
      lapses,
      avgTime: avgTime.toFixed(2),
      totalTime: (totalTime / 60).toFixed(2),
      firstReview: reviews[0].timestamp,
      latestReview: reviews[reviews.length - 1].timestamp,
      currentInterval,
      currentEase: (currentEase * 100) // Convert 2.5 to 250%
    };
  };

  const stats = calculateAnkiStats();
  
  if (loading) {
    return (
      <div className="card-details-modal-overlay" onClick={(e) => {
        if (e.target.className === 'card-details-modal-overlay') onClose();
      }}>
        <div className="card-details-modal">
          <div className="card-details-header">
            <h2 className="card-details-title">Loading...</h2>
            <button className="card-details-close" onClick={onClose}>×</button>
          </div>
          <div className="card-details-content">Loading card details...</div>
        </div>
      </div>
    );
  }

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

  const getStudyMode = (studyMode) => {
    const modes = {
      'reading': '📖 Reading',
      'listening': '🎧 Listening',
      'picture': '🖼️ Picture',
      'anki_import': 'Anki',
      'study': 'Study',
      'timed': 'Timed'
    };
    return modes[studyMode] || studyMode || 'Unknown';
  };

  // Format reviews for table
  const formattedReviews = fullCard.reviews
    ? [...fullCard.reviews]
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
        .map(review => {
          const date = new Date(review.timestamp);
          // Apply Anki day boundary
          const adjustedDate = new Date(date);
          if (adjustedDate.getHours() < 4) {
            adjustedDate.setDate(adjustedDate.getDate() - 1);
          }
          
          // Determine which type to display - prioritize study_mode for our app reviews
          const displayType = review.study_mode && review.study_mode !== 'anki_import' 
            ? getStudyMode(review.study_mode)
            : getReviewType(review.type);
          
          console.log('Review study_mode:', review.study_mode, '→ displayType:', displayType); // Debug
          
          return {
            date: adjustedDate.toLocaleString('en-US', {
              year: 'numeric',
              month: '2-digit',
              day: '2-digit',
              hour: '2-digit',
              minute: '2-digit',
              hour12: false
            }).replace(',', ' @'),
            type: displayType,
            rating: review.ease || review.quality || 'N/A',
            interval: review.interval ? formatInterval(review.interval) : 'N/A',
            ease: review.factor ? `${review.factor / 10}%` : 'N/A',
            time: review.time ? `${review.time.toFixed(2)}s` : (review.response_time ? `${(review.response_time / 1000).toFixed(2)}s` : 'N/A')
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
            {card.word || ''}
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
                      {fullCard.card_type_stats && (
                        <div style={{fontSize: '0.85em', color: '#666', marginTop: '4px'}}>
                          {fullCard.card_type_stats.reading && fullCard.reviews?.filter(r => r.study_mode === 'reading').length > 0 && (
                            <>📖 {new Date(Math.max(...fullCard.reviews.filter(r => r.study_mode === 'reading').map(r => new Date(r.timestamp)))).toLocaleDateString()}</>
                          )}
                          {fullCard.card_type_stats.reading && fullCard.card_type_stats.listening && 
                           fullCard.reviews?.filter(r => r.study_mode === 'reading').length > 0 && 
                           fullCard.reviews?.filter(r => r.study_mode === 'listening').length > 0 && <br />}
                          {fullCard.card_type_stats.listening && fullCard.reviews?.filter(r => r.study_mode === 'listening').length > 0 && (
                            <>🎧 {new Date(Math.max(...fullCard.reviews.filter(r => r.study_mode === 'listening').map(r => new Date(r.timestamp)))).toLocaleDateString()}</>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}
                <div className="stat-item">
                  <div className="stat-label">Interval</div>
                  <div className="stat-value">
                    {formatInterval(stats.currentInterval)}
                    {fullCard.card_type_stats && (
                      <div style={{fontSize: '0.85em', color: '#666', marginTop: '4px'}}>
                        {fullCard.card_type_stats.reading && `📖 ${formatInterval(fullCard.card_type_stats.reading.interval || 0)}`}
                        {fullCard.card_type_stats.reading && fullCard.card_type_stats.listening && <br />}
                        {fullCard.card_type_stats.listening && `🎧 ${formatInterval(fullCard.card_type_stats.listening.interval || 0)}`}
                      </div>
                    )}
                  </div>
                </div>
                <div className="stat-item">
                  <div className="stat-label">Ease</div>
                  <div className="stat-value">
                    {stats.currentEase}%
                    {fullCard.card_type_stats && (
                      <div style={{fontSize: '0.85em', color: '#666', marginTop: '4px'}}>
                        {fullCard.card_type_stats.reading && `📖 ${((fullCard.card_type_stats.reading.factor || 2500) / 10).toFixed(0)}%`}
                        {fullCard.card_type_stats.reading && fullCard.card_type_stats.listening && ' / '}
                        {fullCard.card_type_stats.listening && `🎧 ${((fullCard.card_type_stats.listening.factor || 2500) / 10).toFixed(0)}%`}
                      </div>
                    )}
                  </div>
                </div>
                <div className="stat-item">
                  <div className="stat-label">Reviews</div>
                  <div className="stat-value">
                    {stats.totalReviews}
                    {fullCard.card_type_stats && (
                      <div style={{fontSize: '0.85em', color: '#666', marginTop: '4px'}}>
                        {fullCard.card_type_stats.reading && `📖 ${fullCard.reviews?.filter(r => r.study_mode === 'reading').length || 0}`}
                        {fullCard.card_type_stats.reading && fullCard.card_type_stats.listening && ' / '}
                        {fullCard.card_type_stats.listening && `🎧 ${fullCard.reviews?.filter(r => r.study_mode === 'listening').length || 0}`}
                      </div>
                    )}
                  </div>
                </div>
                <div className="stat-item">
                  <div className="stat-label">Lapses</div>
                  <div className="stat-value">
                    {stats.lapses}
                    {fullCard.card_type_stats && (
                      <div style={{fontSize: '0.85em', color: '#666', marginTop: '4px'}}>
                        {fullCard.card_type_stats.reading && `📖 ${fullCard.card_type_stats.reading.lapses || 0}`}
                        {fullCard.card_type_stats.reading && fullCard.card_type_stats.listening && ' / '}
                        {fullCard.card_type_stats.listening && `🎧 ${fullCard.card_type_stats.listening.lapses || 0}`}
                      </div>
                    )}
                  </div>
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
