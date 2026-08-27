import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth as useClerkAuth, useClerk } from '@clerk/react';
import { apiFetch } from '../utils/api';

// Clerk owns identity/auth (sign-in, sign-up, password reset, sessions - see
// index.js's ClerkProvider). This context is a thin compatibility layer on top: it
// exposes the app's own Mongo User document (tax info, preferences, business
// details - fields Clerk knows nothing about) under the same {user, loading,
// isAuthenticated, logout} shape the rest of the app already expects, so
// Layout.js and friends didn't need to change.
const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const { isLoaded, isSignedIn } = useClerkAuth();
  const { signOut } = useClerk();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isLoaded) return;

    if (!isSignedIn) {
      setUser(null);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    apiFetch('api/auth/me')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!cancelled) setUser(data);
      })
      .catch((error) => {
        console.error('Failed to fetch user profile:', error);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [isLoaded, isSignedIn]);

  const logout = () => signOut();

  const updateProfile = async (profileData) => {
    try {
      const response = await apiFetch('api/auth/profile', {
        method: 'PUT',
        body: JSON.stringify(profileData)
      });
      const data = await response.json();
      if (response.ok) {
        setUser(data.user);
        return { success: true };
      }
      return { success: false, error: data.error || 'Profile update failed' };
    } catch (error) {
      return { success: false, error: 'Profile update failed' };
    }
  };

  const value = {
    user,
    loading: !isLoaded || loading,
    isAuthenticated: !!isSignedIn,
    logout,
    updateProfile
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
