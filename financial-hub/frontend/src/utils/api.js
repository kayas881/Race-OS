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

// apiFetch is a plain function called from ~15+ files outside any component, but
// Clerk's getToken() is only reachable via the useAuth() hook. ClerkTokenBridge
// (mounted once near the root - see index.js) stores the current getToken
// reference here so this module doesn't need every call site converted into a hook.
let clerkGetToken = null;
export const setClerkGetToken = (fn) => {
  clerkGetToken = fn;
};

// For the handful of call sites that can't go through apiFetch (multipart uploads,
// which need to omit the JSON Content-Type apiFetch always sets) but still need a
// valid Clerk token for their own Authorization header.
export const getAuthToken = async () => {
  if (!clerkGetToken) return null;
  return clerkGetToken();
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

  if (clerkGetToken) {
    // getToken() caches internally and only hits the network once the token is
    // actually expired, so calling it fresh on every request is cheap.
    const token = await clerkGetToken();
    if (token) {
      defaultOptions.headers['Authorization'] = `Bearer ${token}`;
    }
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
