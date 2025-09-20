// Import Appwrite client for session management
import { getSessionToken } from '../context/AuthContextAppwrite';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

export const apiFetch = async (endpoint, options = {}) => {
  const token = getSessionToken();

  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  try {
    // Corrected URL construction - The 'endpoint' variable already contains '/api/...'
    const response = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers,
      credentials: 'include',
    });

    if (process.env.NODE_ENV === 'development') {
      console.log(`🌐 API Call: ${options.method || 'GET'} ${API_URL}${endpoint}`);
      console.log(`🔑 JWT Token: ${token ? 'Present' : 'Missing'}`);
      if (!response.ok) {
        console.error(`❌ API Error: ${response.status} ${response.statusText}`);
      }
    }

    if (!response.ok) {
        // Handle cases where the response is not JSON
        const text = await response.text();
        try {
            const errorData = JSON.parse(text);
            throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
        } catch (e) {
             throw new Error(text || `HTTP error! status: ${response.status}`);
        }
    }

    return response.json();
  } catch (error) {
    console.error(`🚨 Network Error for ${API_URL}${endpoint}:`, error);
    throw error;
  }
};

export default apiFetch;