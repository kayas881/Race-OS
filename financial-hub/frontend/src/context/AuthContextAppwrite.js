import React, { createContext, useContext, useState, useEffect } from 'react';
import appwrite from '../config/appwrite';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState(null);

  // Check if user is authenticated on app load
  useEffect(() => {
    const checkAuth = async () => {
      try {
        console.log('🔍 Checking Appwrite session...');
        const currentUser = await appwrite.account.get();
        console.log('✅ Appwrite user found:', currentUser);
        setUser(currentUser);
        
        // Get user session
        const currentSession = await appwrite.account.getSession('current');
        console.log('✅ Appwrite session found:', currentSession);
        setSession(currentSession);
        
        // Store session secret globally for API calls
        console.log('🔍 Session object structure:', Object.keys(currentSession));
        console.log('🔍 Session secret:', currentSession?.secret);
        console.log('🔍 Session token:', currentSession?.token);
        console.log('🔍 Session $id:', currentSession?.$id);
        
        if (currentSession?.secret) {
          window.appwriteSession = currentSession.secret;
          console.log('🔑 Session token stored globally');
        } else if (currentSession?.$id) {
          // Use session ID as token if secret is not available
          window.appwriteSession = currentSession.$id;
          console.log('🔑 Session ID stored globally as token');
        } else {
          console.log('❌ No session secret or ID found to store');
        }
      } catch (error) {
        console.log('❌ No active Appwrite session:', error.message);
        setUser(null);
        setSession(null);
        
        // Clear any invalid cookies
        const cookies = document.cookie.split(';');
        for (let cookie of cookies) {
          const eqPos = cookie.indexOf('=');
          const name = eqPos > -1 ? cookie.substr(0, eqPos).trim() : cookie.trim();
          if (name.startsWith('a_session_')) {
            console.log('🧹 Clearing invalid session cookie:', name);
            document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
          }
        }
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  const login = async (email, password) => {
    try {
      // Create email session
      const newSession = await appwrite.account.createEmailPasswordSession(email, password);
      setSession(newSession);
      
      // Store session secret globally for API calls
      console.log('🔍 Login session structure:', Object.keys(newSession));
      console.log('🔍 Login session secret:', newSession?.secret);
      console.log('🔍 Login session $id:', newSession?.$id);
      
      if (newSession?.secret) {
        window.appwriteSession = newSession.secret;
        console.log('🔑 Session token stored globally after login');
      } else if (newSession?.$id) {
        // Use session ID as token if secret is not available
        window.appwriteSession = newSession.$id;
        console.log('🔑 Session ID stored globally as token after login');
      } else {
        console.log('❌ No session secret or ID found after login');
      }
      
      // Get user details
      const userData = await appwrite.account.get();
      setUser(userData);
      
      return { success: true };
    } catch (error) {
      console.error('Login error:', error);
      return {
        success: false,
        error: error.message || 'Login failed'
      };
    }
  };

  const register = async (userData) => {
    try {
      const { email, password, name, firstName, lastName, businessName, businessType } = userData;
      const displayName = (name && name.trim()) || [firstName, lastName].filter(Boolean).join(' ').trim() || (email ? email.split('@')[0] : undefined);
      
      // Create user account
      const newUser = await appwrite.account.create('unique()', email, password, displayName);
      
      // Create session
      const newSession = await appwrite.account.createEmailPasswordSession(email, password);
      setSession(newSession);
      
      // Get user details
      const currentUser = await appwrite.account.get();
      setUser(currentUser);
      
      // Store additional profile data in database through API
      try {
        await fetch('/api/auth/profile', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${newSession.secret}`
          },
          body: JSON.stringify({
            businessName,
            businessType
          })
        });
      } catch (profileError) {
        console.error('Profile creation error:', profileError);
        // Continue even if profile creation fails
      }
      
      return { success: true };
    } catch (error) {
      console.error('Registration error:', error);
      return {
        success: false,
        error: error.message || 'Registration failed'
      };
    }
  };

  const logout = async () => {
    try {
      await appwrite.account.deleteSession('current');
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setUser(null);
      setSession(null);
      // Clear global session token
      window.appwriteSession = null;
      console.log('🔑 Session token cleared');
    }
  };

  const updateProfile = async (profileData) => {
    try {
      // Update name in Appwrite if provided
      if (profileData.name) {
        await appwrite.account.updateName(profileData.name);
      }
      
      // Update other profile data through API
      const response = await fetch('/api/auth/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.secret}`
        },
        body: JSON.stringify(profileData)
      });
      
      if (!response.ok) {
        throw new Error('Profile update failed');
      }
      
      // Refresh user data
  const updatedUser = await appwrite.account.get();
      setUser(updatedUser);
      
      return { success: true };
    } catch (error) {
      console.error('Profile update error:', error);
      return {
        success: false,
        error: error.message || 'Profile update failed'
      };
    }
  };

  const changePassword = async (currentPassword, newPassword) => {
    try {
      await appwrite.account.updatePassword(newPassword, currentPassword);
      return { success: true };
    } catch (error) {
      console.error('Password change error:', error);
      return {
        success: false,
        error: error.message || 'Password change failed'
      };
    }
  };

  const forgotPassword = async (email) => {
    try {
      await appwrite.account.createRecovery(
        email,
        `${window.location.origin}/reset-password`
      );
      return { success: true };
    } catch (error) {
      console.error('Forgot password error:', error);
      return {
        success: false,
        error: error.message || 'Failed to send reset email'
      };
    }
  };

  const resetPassword = async (userId, secret, password) => {
    try {
      await appwrite.account.updateRecovery(userId, secret, password);
      return { success: true };
    } catch (error) {
      console.error('Reset password error:', error);
      return {
        success: false,
        error: error.message || 'Password reset failed'
      };
    }
  };

  const value = {
    user,
    session,
    loading,
    login,
    register,
    logout,
    updateProfile,
    changePassword,
    forgotPassword,
    resetPassword,
    isAuthenticated: !!user
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};