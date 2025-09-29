import axios from 'axios';

// Base instance uses CRA proxy (no baseURL) so relative /api/* goes to backend.
// Fallback to environment variable if provided.
const baseURL = process.env.REACT_APP_API_URL || '';

const http = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Attach auth token if present
http.interceptors.request.use((config) => {
  try {
    const stored = localStorage.getItem('token') || localStorage.getItem('authToken');
    if (stored) {
      config.headers.Authorization = `Bearer ${stored}`;
    }
  } catch (e) {
    // ignore storage errors
  }
  return config;
});

// Basic response/error handling
http.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
      // Optionally log or transform
      if (error.response.status === 401) {
        // Could trigger logout flow
        console.warn('Unauthorized - consider redirect to login');
      }
    }
    return Promise.reject(error);
  }
);

export default http;
