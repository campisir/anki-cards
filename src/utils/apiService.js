/**
 * API service for communicating with the Flask backend
 */

const API_BASE = 'https://flame-picks-production-api.onrender.com/futariwa';

// Helper to get token from localStorage
const getToken = () => localStorage.getItem('futariwa_token');

// Helper to get user from localStorage
export const getCurrentUser = () => {
  const userStr = localStorage.getItem('futariwa_user');
  return userStr ? JSON.parse(userStr) : null;
};

// Helper to save token and user
const saveAuth = (token, user) => {
  localStorage.setItem('futariwa_token', token);
  localStorage.setItem('futariwa_user', JSON.stringify(user));
};

// Helper to clear auth
export const clearAuth = () => {
  localStorage.removeItem('futariwa_token');
  localStorage.removeItem('futariwa_user');
};

// Helper for API requests
const apiRequest = async (endpoint, options = {}) => {
  const token = getToken();
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  try {
    const response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers,
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || data.message || 'API request failed');
    }

    return data;
  } catch (error) {
    console.error(`API Error [${endpoint}]:`, error);
    throw error;
  }
};

// Authentication APIs
export const register = async (username, password, email) => {
  const data = await apiRequest('/register', {
    method: 'POST',
    body: JSON.stringify({ username, password, email }),
  });
  return data;
};

export const login = async (username, password) => {
  const data = await apiRequest('/login', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  });
  
  if (data.access_token && data.user) {
    saveAuth(data.access_token, data.user);
  }
  
  return data;
};

export const logout = () => {
  clearAuth();
};

// User Preferences APIs
export const getPreferences = async () => {
  return await apiRequest('/user/preferences', {
    method: 'GET',
  });
};

export const updatePreferences = async (preferences) => {
  return await apiRequest('/user/preferences', {
    method: 'PUT',
    body: JSON.stringify(preferences),
  });
};

// Card Management APIs
export const getCards = async (params = {}) => {
  const queryParams = new URLSearchParams(params).toString();
  const endpoint = queryParams ? `/cards?${queryParams}` : '/cards';
  return await apiRequest(endpoint, {
    method: 'GET',
  });
};

export const getCard = async (cardId) => {
  return await apiRequest(`/cards/${cardId}`, {
    method: 'GET',
  });
};

export const importCards = async (cards, filename = 'deck.apkg') => {
  return await apiRequest('/cards/bulk', {
    method: 'POST',
    body: JSON.stringify({ cards, filename }),
  });
};

export const updateCard = async (cardId, updates) => {
  return await apiRequest(`/cards/${cardId}`, {
    method: 'PUT',
    body: JSON.stringify(updates),
  });
};

export const deleteCard = async (cardId) => {
  return await apiRequest(`/cards/${cardId}`, {
    method: 'DELETE',
  });
};

// Review Tracking APIs
export const recordReview = async (cardId, quality, responseTime, studyMode, wasCorrect) => {
  return await apiRequest('/reviews', {
    method: 'POST',
    body: JSON.stringify({
      card_id: cardId,
      quality,
      response_time: responseTime,
      study_mode: studyMode,
      was_correct: wasCorrect,
    }),
  });
};

export const getReviews = async (params = {}) => {
  const queryParams = new URLSearchParams(params).toString();
  const endpoint = queryParams ? `/reviews?${queryParams}` : '/reviews';
  return await apiRequest(endpoint, {
    method: 'GET',
  });
};

export const getReviewStats = async () => {
  return await apiRequest('/reviews/stats', {
    method: 'GET',
  });
};

// Confused Pairs APIs
export const addConfusedPair = async (cardId1, cardId2) => {
  return await apiRequest('/confused-pairs', {
    method: 'POST',
    body: JSON.stringify({
      card_id_1: cardId1,
      card_id_2: cardId2,
    }),
  });
};

export const getConfusedPairs = async () => {
  return await apiRequest('/confused-pairs', {
    method: 'GET',
  });
};

// Import History APIs
export const getImportHistory = async () => {
  return await apiRequest('/imports', {
    method: 'GET',
  });
};

// Sync API
export const syncData = async (data) => {
  return await apiRequest('/sync', {
    method: 'POST',
    body: JSON.stringify(data),
  });
};

// Check if user is authenticated
export const isAuthenticated = () => {
  return !!getToken();
};

// Media APIs
export const getWordAudio = async (cardId) => {
  const token = getToken();
  const response = await fetch(`${API_BASE}/cards/${cardId}/audio/word`, {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });
  
  if (!response.ok) {
    throw new Error('Failed to fetch word audio');
  }
  
  const blob = await response.blob();
  return URL.createObjectURL(blob);
};

export const getSentenceAudio = async (cardId) => {
  const token = getToken();
  const response = await fetch(`${API_BASE}/cards/${cardId}/audio/sentence`, {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });
  
  if (!response.ok) {
    throw new Error('Failed to fetch sentence audio');
  }
  
  const blob = await response.blob();
  return URL.createObjectURL(blob);
};

export const getCardImage = async (cardId) => {
  const token = getToken();
  const response = await fetch(`${API_BASE}/cards/${cardId}/image`, {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });
  
  if (!response.ok) {
    throw new Error('Failed to fetch card image');
  }
  
  const blob = await response.blob();
  return URL.createObjectURL(blob);
};
