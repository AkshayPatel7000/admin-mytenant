import React, { createContext, useContext, useEffect, useState } from 'react';
import { auth, loginWithEmail, logoutAdmin } from '../firebase';
import { onAuthStateChanged } from 'firebase/auth';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState('');

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const login = async (email, password) => {
    setAuthError('');
    try {
      const user = await loginWithEmail(email, password);
      setCurrentUser(user);
      return user;
    } catch (err) {
      setAuthError(err.message || 'Invalid Email ID or Password.');
      throw err;
    }
  };

  const logout = async () => {
    setAuthError('');
    return await logoutAdmin();
  };

  const value = {
    currentUser,
    login,
    logout,
    loading,
    authError
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
