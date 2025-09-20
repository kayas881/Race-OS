// Import Appwrite client for session management
import { account } from './appwrite';

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

// Function to get Appwrite session token
const getSessionToken = async () => {
  try {
    // Try to get current session from Appwrite
    const session = await account.getSession('current');
    console.log('🔍 Retrieved session for API:', session?.$id);
    if (session?.$id) {
      return session.$id;
    }
    if (session?.secret) {
      return session.secret;
    }
  } catch (error) {
    console.log('❌ Could not get session from Appwrite:', error.message);
  }

  // Fallback to cookie parsing
  console.log('🍪 All cookies:', document.cookie);
  
  const cookies = document.cookie.split(';');
  const projectId = process.env.REACT_APP_APPWRITE_PROJECT_ID;
  
  console.log('🔍 Looking for session cookie with project ID:', projectId);
  
  // Check all possible Appwrite session cookie patterns
  const possibleNames = [
    `a_session_${projectId}`,
    `a_session_${projectId}_legacy`,
    `a_session_console`,
    `a_session`
  ];
  
  for (let cookie of cookies) {
    const [name, value] = cookie.trim().split('=');
    console.log('🍪 Found cookie:', name, 'with value length:', value?.length || 0);
    
    // Check if this cookie matches any of our expected patterns
    if (possibleNames.includes(name) || name.startsWith('a_session_')) {
      console.log('✅ Found potential session cookie:', name);
      if (value && value !== 'null' && value !== '') {
        const decoded = decodeURIComponent(value);
        console.log('🔓 Decoded session token preview:', decoded.substring(0, 20) + '...');
        return decoded;
      }
    }
  }
  
  // Fallback to window variable
  if (window.appwriteSession) {
    console.log('🔑 Using session from window variable');
    return window.appwriteSession;
  }
  
  console.log('❌ No valid session token found');
  return null;
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

  // Get Appwrite session token (now async)
  let sessionToken = await getSessionToken();
  
  // Add session token as Authorization header if available
  if (sessionToken) {
    defaultOptions.headers['Authorization'] = `Bearer ${sessionToken}`;
  }

  try {
    const response = await fetch(url, defaultOptions);
    
    // Log API calls in development
    if (process.env.NODE_ENV === 'development') {
      console.log(`🌐 API Call: ${options.method || 'GET'} ${url}`);
      console.log(`🔑 Session Token: ${sessionToken ? 'Present' : 'Missing'}`);
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
