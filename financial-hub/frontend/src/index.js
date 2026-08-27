import React, { useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from 'react-query';
import { ReactQueryDevtools } from 'react-query/devtools';
import { Toaster } from 'react-hot-toast';
import { ClerkProvider, useAuth } from '@clerk/react';
import App from './App';
import { AuthProvider } from './context/AuthContext';
import { setClerkGetToken } from './utils/api';
import './index.css';

const CLERK_PUBLISHABLE_KEY = process.env.REACT_APP_CLERK_PUBLISHABLE_KEY;
if (!CLERK_PUBLISHABLE_KEY) {
  throw new Error('Missing REACT_APP_CLERK_PUBLISHABLE_KEY');
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

// apiFetch (utils/api.js) is a plain function called from many places outside any
// component, but Clerk's getToken() only exists via the useAuth() hook. This bridges
// the two: mounted once here, it keeps utils/api.js's stored getToken reference
// current every time Clerk's auth state changes.
function ClerkTokenBridge() {
  const { isLoaded, getToken } = useAuth();

  useEffect(() => {
    if (isLoaded) {
      setClerkGetToken(getToken);
    }
  }, [isLoaded, getToken]);

  return null;
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <ClerkProvider publishableKey={CLERK_PUBLISHABLE_KEY}>
      <ClerkTokenBridge />
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <AuthProvider>
            <App />
            <Toaster
              position="top-right"
              toastOptions={{
                duration: 4000,
                style: {
                  background: '#363636',
                  color: '#fff',
                },
              }}
            />
          </AuthProvider>
        </BrowserRouter>
        <ReactQueryDevtools initialIsOpen={false} />
      </QueryClientProvider>
    </ClerkProvider>
  </React.StrictMode>
);
