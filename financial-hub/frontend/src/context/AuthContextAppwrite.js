import React, { createContext, useContext, useState, useEffect } from 'react';
import appwrite from '../config/appwrite'; // Use default import
import { AppwriteException } from 'appwrite';

const AuthContext = createContext();

let sessionToken = null;

export const getSessionToken = () => sessionToken;

export const useAuth = () => {
  return useContext(AuthContext);
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true); // Start with loading as true

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const currentUser = await appwrite.account.get();
        const jwt = await appwrite.account.createJWT();
        sessionToken = jwt.jwt; // Set the token
        setUser(currentUser);
        console.log('✅ Authentication check successful');
        console.log('🔑 JWT token created and stored');
      } catch (error) {
        if (error instanceof AppwriteException && error.code !== 401) {
          console.error("❌ Appwrite auth check error:", error);
        } else {
          console.log('❌ No active session found');
        }
        setUser(null);
        sessionToken = null;
      } finally {
        setLoading(false); // Set loading to false after the check is complete
        console.log('🏁 Authentication check completed');
      }
    };

    checkAuth();
  }, []);

  const login = async (email, password) => {
    try {
      await appwrite.account.createEmailPasswordSession(email, password);
      const currentUser = await appwrite.account.get();
      const jwt = await appwrite.account.createJWT();
      sessionToken = jwt.jwt;
      setUser(currentUser);
      console.log('✅ Login successful, JWT token created');
      return { success: true };
    } catch (error) {
      console.error('❌ Login failed:', error);
      return { success: false, error: error.message };
    }
  };

  const register = async (email, password, name) => {
    try {
      await appwrite.account.create('unique()', email, password, name);
      await appwrite.account.createEmailPasswordSession(email, password);
      const currentUser = await appwrite.account.get();
      const jwt = await appwrite.account.createJWT();
      sessionToken = jwt.jwt;
      setUser(currentUser);
      console.log('✅ Registration and login successful, JWT token created');
      return { success: true };
    } catch (error) {
      console.error('❌ Registration failed:', error);
      return { success: false, error: error.message };
    }
  };

  const logout = async () => {
    try {
      await appwrite.account.deleteSession('current');
      setUser(null);
      sessionToken = null;
      console.log('✅ Logout successful');
    } catch (error) {
      console.error('❌ Logout failed:', error);
      // Still clear local state even if logout request fails
      setUser(null);
      sessionToken = null;
    }
  };

  const value = {
    user,
    loading,
    login,
    register,
    logout,
    isAuthenticated: !!user,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};