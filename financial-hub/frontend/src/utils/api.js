// API utility for handling different environments (local vs Codespaces)
const API_BASE_URL = process.env.REACT_APP_API_URL || '';

// Helper function to construct full API URLs
export const getApiUrl = (endpoint) => {
  // Remove leading slash if present
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;
  
  if (API_BASE_URL) {
    return `${API_BASE_URL}/${cleanEndpoint}`;
  }
  
  // Fallback to relative URLs for local development with proxy
  return `/${cleanEndpoint}`;
};

// Enhanced fetch wrapper that handles API URL construction and common options
export const apiFetch = async (endpoint, options = {}) => {
  const url = getApiUrl(endpoint);
  
  const defaultOptions = {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    credentials: 'include', // Important for CORS in Codespaces
    ...options,
  };

  // Add Authorization header if token exists
  const token = localStorage.getItem('token');
  if (token) {
    defaultOptions.headers['Authorization'] = `Bearer ${token}`;
  }

  try {
    const response = await fetch(url, defaultOptions);
    
    // Log API calls in development
    if (process.env.NODE_ENV === 'development') {
      console.log(`🌐 API Call: ${options.method || 'GET'} ${url}`);
      if (!response.ok) {
        console.error(`❌ API Error: ${response.status} ${response.statusText}`);
      }
    }
    
    return response;
  } catch (error) {
    console.error(`🚨 Network Error for ${url}:`, error);
    throw error;
  }
};

export default { getApiUrl, apiFetch };
