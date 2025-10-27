import React, { useState, useEffect } from 'react';
import { 
  importAnkiDeck, 
  syncAnkiStats, 
  isDatabaseInitialized, 
  getImportHistory 
} from '../utils/ankiImportService';
import { clearAllCards, clearAllConfusedCards, getAllCards } from '../utils/cardService';
import { deleteDatabase } from '../utils/indexedDB';
import './Settings.css';

function Settings({ onBackToMenu }) {
  const [isInitialized, setIsInitialized] = useState(false);
  const [importHistory, setImportHistory] = useState(null);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressMessage, setProgressMessage] = useState('');
  const [message, setMessage] = useState({ type: '', text: '' });
  const [selectedFile, setSelectedFile] = useState(null);
  const [cardCount, setCardCount] = useState(0);

  useEffect(() => {
    loadDatabaseStatus();
  }, []);

  const loadDatabaseStatus = async () => {
    try {
      const initialized = await isDatabaseInitialized();
      setIsInitialized(initialized);

      if (initialized) {
        const history = await getImportHistory();
        setImportHistory(history);

        const cards = await getAllCards();
        setCardCount(cards.length);
      }
    } catch (error) {
      console.error('Error loading database status:', error);
    }
  };

  const handleProgressUpdate = (percent, msg) => {
    setProgress(percent);
    setProgressMessage(msg);
  };

  const handleFullImport = async () => {
    if (!selectedFile && !isInitialized) {
      setMessage({ type: 'error', text: 'Please select an .apkg file to import.' });
      return;
    }

    try {
      setLoading(true);
      setMessage({ type: '', text: '' });

      // Use selected file or default deck.apkg
      const source = selectedFile || 'deck.apkg';
      
      const result = await importAnkiDeck(source, handleProgressUpdate);

      setMessage({ 
        type: 'success', 
        text: `Successfully imported ${result.cards} cards!` 
      });

      // Refresh status
      await loadDatabaseStatus();
      setSelectedFile(null);

    } catch (error) {
      setMessage({ 
        type: 'error', 
        text: `Import failed: ${error.message}` 
      });
    } finally {
      setLoading(false);
      setProgress(0);
      setProgressMessage('');
    }
  };

  const handleSyncStats = async () => {
    if (!selectedFile && !isInitialized) {
      setMessage({ type: 'error', text: 'Please select an .apkg file to sync.' });
      return;
    }

    if (!isInitialized) {
      setMessage({ type: 'error', text: 'Database not initialized. Please do a full import first.' });
      return;
    }

    try {
      setLoading(true);
      setMessage({ type: '', text: '' });

      // Use selected file or default deck.apkg
      const source = selectedFile || 'deck.apkg';

      const result = await syncAnkiStats(source, handleProgressUpdate);

      setMessage({ 
        type: 'success', 
        text: `Synced Anki stats! Updated: ${result.updated}, Added: ${result.added}` 
      });

      // Refresh status
      await loadDatabaseStatus();
      setSelectedFile(null);

    } catch (error) {
      setMessage({ 
        type: 'error', 
        text: `Sync failed: ${error.message}` 
      });
    } finally {
      setLoading(false);
      setProgress(0);
      setProgressMessage('');
    }
  };

  const handleResetDatabase = async () => {
    const confirmed = window.confirm(
      'Are you sure you want to reset the entire database? This will delete ALL data including your answer rates and confused card relationships. This action cannot be undone!'
    );

    if (!confirmed) return;

    try {
      setLoading(true);
      setMessage({ type: '', text: '' });

      await deleteDatabase();

      setMessage({ 
        type: 'success', 
        text: 'Database has been completely reset. Please do a full import to start fresh.' 
      });

      setIsInitialized(false);
      setImportHistory(null);
      setCardCount(0);

    } catch (error) {
      setMessage({ 
        type: 'error', 
        text: `Reset failed: ${error.message}` 
      });
    } finally {
      setLoading(false);
    }
  };

  const handleClearAppData = async () => {
    const confirmed = window.confirm(
      'This will clear your app-specific data (answer rates, confused cards) but keep Anki data. Continue?'
    );

    if (!confirmed) return;

    try {
      setLoading(true);
      setMessage({ type: '', text: '' });

      // Clear confused cards
      await clearAllConfusedCards();

      // Reset app-specific fields for all cards
      const cards = await getAllCards();
      const resetCards = cards.map(card => ({
        ...card,
        appAnswerRate: 0,
        appTotalAttempts: 0,
        appCorrectAttempts: 0,
        confusedWith: []
      }));

      // This would need a batch update function, for now just clear confused cards
      await clearAllConfusedCards();

      setMessage({ 
        type: 'success', 
        text: 'App-specific data has been cleared.' 
      });

      await loadDatabaseStatus();

    } catch (error) {
      setMessage({ 
        type: 'error', 
        text: `Clear failed: ${error.message}` 
      });
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file && file.name.endsWith('.apkg')) {
      setSelectedFile(file);
      setMessage({ type: '', text: '' });
    } else {
      setMessage({ type: 'error', text: 'Please select a valid .apkg file.' });
      setSelectedFile(null);
    }
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return 'Never';
    return new Date(timestamp).toLocaleString();
  };

  return (
    <div className="settings-container">
      <div className="settings-header">
        <h1>Database Settings</h1>
        <button className="back-button" onClick={onBackToMenu}>
          ← Back to Menu
        </button>
      </div>

      <div className="settings-content">
        {/* Database Status */}
        <div className="settings-section">
          <h2>Database Status</h2>
          <div className="status-info">
            <div className="status-row">
              <span className="status-label">Status:</span>
              <span className={`status-value ${isInitialized ? 'initialized' : 'not-initialized'}`}>
                {isInitialized ? '✓ Initialized' : '✗ Not Initialized'}
              </span>
            </div>
            <div className="status-row">
              <span className="status-label">Total Cards:</span>
              <span className="status-value">{cardCount}</span>
            </div>
            {importHistory && (
              <>
                <div className="status-row">
                  <span className="status-label">Last Full Import:</span>
                  <span className="status-value">{formatDate(importHistory.lastFullImport)}</span>
                </div>
                <div className="status-row">
                  <span className="status-label">Last Anki Sync:</span>
                  <span className="status-value">{formatDate(importHistory.lastAnkiSync)}</span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* File Selection */}
        <div className="settings-section">
          <h2>Select .apkg File</h2>
          <div className="file-selection">
            <input
              type="file"
              accept=".apkg"
              onChange={handleFileChange}
              disabled={loading}
              id="apkg-file-input"
            />
            <label htmlFor="apkg-file-input" className="file-input-label">
              {selectedFile ? selectedFile.name : 'Choose .apkg file (or use default deck.apkg)'}
            </label>
          </div>
        </div>

        {/* Import Actions */}
        <div className="settings-section">
          <h2>Import & Sync</h2>
          <div className="action-buttons">
            <button
              className="action-button primary"
              onClick={handleFullImport}
              disabled={loading}
            >
              <span className="button-icon">📥</span>
              Full Import
              <span className="button-description">
                Import all cards from .apkg file (replaces existing data)
              </span>
            </button>

            <button
              className="action-button secondary"
              onClick={handleSyncStats}
              disabled={loading || !isInitialized}
            >
              <span className="button-icon">🔄</span>
              Sync Anki Stats
              <span className="button-description">
                Update only Anki statistics (preserves app data)
              </span>
            </button>
          </div>
        </div>

        {/* Danger Zone */}
        <div className="settings-section danger-zone">
          <h2>⚠️ Danger Zone</h2>
          <div className="action-buttons">
            <button
              className="action-button danger"
              onClick={handleClearAppData}
              disabled={loading || !isInitialized}
            >
              <span className="button-icon">🗑️</span>
              Clear App Data
              <span className="button-description">
                Clear answer rates and confused cards (keeps Anki data)
              </span>
            </button>

            <button
              className="action-button danger"
              onClick={handleResetDatabase}
              disabled={loading}
            >
              <span className="button-icon">💣</span>
              Reset Entire Database
              <span className="button-description">
                Delete everything and start fresh
              </span>
            </button>
          </div>
        </div>

        {/* Progress Bar */}
        {loading && (
          <div className="progress-section">
            <div className="progress-bar">
              <div 
                className="progress-fill" 
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="progress-message">{progressMessage}</p>
          </div>
        )}

        {/* Messages */}
        {message.text && (
          <div className={`message ${message.type}`}>
            {message.text}
          </div>
        )}

        {/* Help Section */}
        <div className="settings-section help-section">
          <h2>ℹ️ Help</h2>
          <div className="help-content">
            <p><strong>Full Import:</strong> Use this when setting up the database for the first time or when you want to completely replace all data with a new deck.</p>
            <p><strong>Sync Anki Stats:</strong> Use this after studying in Anki to update scheduling information, repetitions, and review history without losing your app-specific data (answer rates, confused cards).</p>
            <p><strong>Clear App Data:</strong> Resets your study statistics in this app while keeping all Anki data intact.</p>
            <p><strong>Reset Database:</strong> Nuclear option - deletes everything. Use only if you want to start completely fresh.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Settings;
