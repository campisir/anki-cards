/**
 * FUTURE FEATURE: Confused Cards Tracking
 * 
 * This file contains example code for implementing the confused cards feature
 * in the Study component. When a user gets a card wrong, you can allow them
 * to mark another card as "confused with" this one.
 */

// Example: Add this to Study.js to implement confused cards tracking

/*
import { addConfusedCards, getConfusedCards } from '../utils/cardService';

// In the Study component state:
const [showConfusedDialog, setShowConfusedDialog] = useState(false);
const [confusedCardSearch, setConfusedCardSearch] = useState('');

// After a wrong answer, show option to mark confusion:
const handleWrongAnswer = () => {
  setShowConfusedDialog(true);
};

// Handler to search and mark confused card:
const handleMarkConfused = async (otherCardNid) => {
  const currentCard = shuffledCards[currentCardIndex];
  await addConfusedCards(currentCard.nid, otherCardNid);
  setShowConfusedDialog(false);
};

// Display confused cards for current card:
const showConfusedCardsForCurrent = async () => {
  const currentCard = shuffledCards[currentCardIndex];
  const confused = await getConfusedCards(currentCard.nid);
  console.log('Confused cards:', confused);
};

// UI Component to add after incorrect answer:
{isCorrect === false && (
  <div className="confused-section">
    <button onClick={() => setShowConfusedDialog(true)}>
      Mark Confused Card
    </button>
    
    {showConfusedDialog && (
      <div className="confused-dialog">
        <h3>Which card did you confuse this with?</h3>
        <input
          type="text"
          placeholder="Search for card..."
          value={confusedCardSearch}
          onChange={(e) => setConfusedCardSearch(e.target.value)}
        />
        <div className="search-results">
          {cards
            .filter(card => {
              const word = getField(card, 0);
              return word.toLowerCase().includes(confusedCardSearch.toLowerCase());
            })
            .slice(0, 5)
            .map(card => (
              <div
                key={card.nid}
                className="search-result-item"
                onClick={() => handleMarkConfused(card.nid)}
              >
                <span dangerouslySetInnerHTML={{ __html: getField(card, 0) }} />
                <span> - </span>
                <span dangerouslySetInnerHTML={{ __html: getField(card, 1) }} />
              </div>
            ))}
        </div>
        <button onClick={() => setShowConfusedDialog(false)}>Cancel</button>
      </div>
    )}
  </div>
)}
*/

// Example: View confused cards in CardsTable.js

/*
import { getConfusedCards } from '../utils/cardService';

// Add a column to show confused cards:
const [expandedCard, setExpandedCard] = useState(null);
const [confusedCards, setConfusedCards] = useState({});

const handleShowConfused = async (nid) => {
  if (expandedCard === nid) {
    setExpandedCard(null);
  } else {
    const confused = await getConfusedCards(nid);
    setConfusedCards({ ...confusedCards, [nid]: confused });
    setExpandedCard(nid);
  }
};

// In the table:
<td>
  <button onClick={() => handleShowConfused(card.nid)}>
    Confused ({card.confusedWith?.length || 0})
  </button>
  {expandedCard === card.nid && (
    <div className="confused-list">
      {confusedCards[card.nid]?.map(confused => (
        <div key={confused.nid}>
          {getField(confused, 0)} (confused {confused.confusionCount}x)
        </div>
      ))}
    </div>
  )}
</td>
*/

// Example CSS for confused cards dialog:

/*
.confused-section {
  margin: 20px 0;
}

.confused-dialog {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background: white;
  padding: 30px;
  border-radius: 10px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
  z-index: 1000;
  max-width: 500px;
  width: 90%;
}

.confused-dialog h3 {
  margin-top: 0;
}

.confused-dialog input {
  width: 100%;
  padding: 10px;
  margin: 10px 0;
  border: 2px solid #ddd;
  border-radius: 5px;
}

.search-results {
  max-height: 300px;
  overflow-y: auto;
  margin: 10px 0;
}

.search-result-item {
  padding: 10px;
  border: 1px solid #eee;
  margin: 5px 0;
  cursor: pointer;
  border-radius: 5px;
  transition: background-color 0.2s;
}

.search-result-item:hover {
  background-color: #f0f0f0;
}
*/
