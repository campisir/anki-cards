import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { 
  importAnkiDeck
} from '../utils/ankiImportService';
import { getAllCards, getReviewStats } from '../utils/cardService';
import { getImportHistory } from '../utils/apiService';
import './Settings.css';

function Settings({ onBackToMenu }) {
  const { user, logout } = useAuth();
  const [importHistory, setImportHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressMessage, setProgressMessage] = useState('');
  const [message, setMessage] = useState({ type: '', text: '' });
  const [selectedFile, setSelectedFile] = useState(null);
  const [cardCount, setCardCount] = useState(0);
  const [stats, setStats] = useState(null);

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      // Get cards count
      const cardsResponse = await getAllCards();
      setCardCount(cardsResponse.length);

      // Get import history
      const historyResponse = await getImportHistory();
      setImportHistory(historyResponse.imports || []);

      // Get review stats
      const statsResponse = await getReviewStats();
      setStats(statsResponse);
    } catch (error) {
      console.error('Error loading user data:', error);
    }
  };

  const handleProgressUpdate = (percent, msg) => {
    setProgress(percent);
    setProgressMessage(msg);
  };

  const handleFullImport = async () => {
    if (!selectedFile) {
      setMessage({ type: 'error', text: 'Please select an .apkg or .colpkg file to import.' });
      return;
    }

    try {
      setLoading(true);
      setMessage({ type: '', text: '' });
      
      const result = await importAnkiDeck(selectedFile, handleProgressUpdate);

      let successText = '';
      if (result.imported > 0 && result.updated > 0) {
        // Mixed: some new cards, some updated
        successText = `Import complete! ${result.imported} new cards imported, ${result.updated} cards updated`;
      } else if (result.imported > 0) {
        // All new cards
        successText = `Successfully imported ${result.imported} new cards!`;
      } else if (result.updated > 0) {
        // All updated
        successText = `Successfully updated ${result.updated} cards`;
      } else {
        // No changes
        successText = `Import complete - no changes detected`;
      }
      
      if (result.new_reviews > 0) {
        successText += ` (${result.new_reviews} new reviews added)`;
      }

      setMessage({ 
        type: 'success', 
        text: successText
      });

      // Refresh status
      await loadUserData();
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
        <h1>Settings</h1>
        <button className="back-button" onClick={onBackToMenu}>
          Back to Menu
        </button>
      </div>

      <div className="settings-content">
        {/* User Info */}
        <div className="settings-section">
          <h2>Account</h2>
          <div className="status-info">
            <div className="status-row">
              <span className="status-label">Username:</span>
              <span className="status-value">{user?.username}</span>
            </div>
            <div className="status-row">
              <span className="status-label">Email:</span>
              <span className="status-value">{user?.email}</span>
            </div>
            <div className="status-row">
              <button className="action-button danger" onClick={() => { logout(); onBackToMenu(); }}>
                Logout
              </button>
            </div>
          </div>
        </div>

        {/* Database Status */}
        <div className="settings-section">
          <h2>Database Status</h2>
          <div className="status-info">
            <div className="status-row">
              <span className="status-label">Total Cards:</span>
              <span className="status-value">{cardCount}</span>
            </div>
            {stats && (
              <>
                <div className="status-row">
                  <span className="status-label">Total Reviews:</span>
                  <span className="status-value">{stats.total_reviews}</span>
                </div>
                <div className="status-row">
                  <span className="status-label">Accuracy:</span>
                  <span className="status-value">{stats.accuracy.toFixed(1)}%</span>
                </div>
                <div className="status-row">
                  <span className="status-label">Average Quality:</span>
                  <span className="status-value">{stats.average_quality.toFixed(2)}</span>
                </div>
              </>
            )}
            {importHistory && importHistory.length > 0 && (
              <>
                <div className="status-row">
                  <span className="status-label">Last Import:</span>
                  <span className="status-value">{formatDate(importHistory[0].import_time)}</span>
                </div>
                <div className="status-row">
                  <span className="status-label">Last Import File:</span>
                  <span className="status-value">{importHistory[0].filename}</span>
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
              accept=".apkg,.colpkg"
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
              Import Deck
              <span className="button-description">
                Import cards from .apkg file to your account
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
