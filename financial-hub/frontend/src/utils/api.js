import { getSessionToken } from '../context/AuthContextAppwrite';

// Ensure there's no trailing slash here
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
    // **THE FIX:** The 'endpoint' variable already starts with a slash (e.g., '/api/dashboard').
    // This correctly combines to http://localhost:5000/api/dashboard
    const response = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers,
      credentials: 'include',
    });

    if (process.env.NODE_ENV === 'development') {
      console.log(`🌐 API Call: ${options.method || 'GET'} ${API_URL}${endpoint}`);
      if (!response.ok) {
        console.error(`❌ API Error: ${response.status} ${response.statusText}`);
      }
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: `Request failed with status ${response.status}` }));
      throw new Error(errorData.error);
    }

    return response.json();
  } catch (error) {
    console.error(`🚨 Network Error for ${API_URL}${endpoint}:`, error);
    throw error;
  }
};

export default apiFetch;