import React, { createContext, useContext, useState, useEffect } from 'react';
import { account, databases, DATABASE_ID, COLLECTIONS } from '../utils/appwrite';
import { ID } from 'appwrite';

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

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const currentUser = await account.get();
        const userDocument = await databases.getDocument(
            DATABASE_ID,
            COLLECTIONS.users,
            currentUser.$id
        );
        setUser(userDocument);
      } catch (error) {
        setUser(null);
      }
      setLoading(false);
    };

    checkAuth();
  }, []);

  const login = async (email, password) => {
    try {
      await account.createEmailPasswordSession(email, password);
      const currentUser = await account.get();
        const userDocument = await databases.getDocument(
            DATABASE_ID,
            COLLECTIONS.users,
            currentUser.$id
        );
      setUser(userDocument);
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error.message || 'Login failed'
      };
    }
  };

  const register = async (userData) => {
    try {
        const { email, password, firstName, lastName } = userData;
      const newUser = await account.create(ID.unique(), email, password, `${firstName} ${lastName}`);
      const userDocument = await databases.createDocument(
            DATABASE_ID,
            COLLECTIONS.users,
            newUser.$id,
            userData
      );
      setUser(userDocument);
      await account.createEmailPasswordSession(email, password);
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error.message || 'Registration failed'
      };
    }
  };

  const logout = async () => {
    try {
      await account.deleteSession('current');
      setUser(null);
    } catch (error) {
        console.error("Logout failed:", error);
    }
  };

  const updateProfile = async (profileData) => {
    try {
      const response = await databases.updateDocument(
            DATABASE_ID,
            COLLECTIONS.users,
            user.$id,
            profileData
      );
      setUser(response);
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error.message || 'Profile update failed'
      };
    }
  };

  const value = {
    user,
    loading,
    login,
    register,
    logout,
    updateProfile,
    isAuthenticated: !!user
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
