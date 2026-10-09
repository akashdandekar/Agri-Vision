import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';
import { useLanguage } from './LanguageContext';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem('kisansetu_token'));
  const [loading, setLoading] = useState(true);
  const { changeLanguage } = useLanguage();

  useEffect(() => {
    const initAuth = async () => {
      const storedToken = localStorage.getItem('kisansetu_token');
      const storedUser = localStorage.getItem('kisansetu_user');

      if (storedToken && storedUser) {
        try {
          const parsedUser = JSON.parse(storedUser);
          setUser(parsedUser);
          setToken(storedToken);

          // Verify with backend
          const res = await api.get('/auth/me');
          if (res.data.success && res.data.user) {
            setUser(res.data.user);
            localStorage.setItem('kisansetu_user', JSON.stringify(res.data.user));
            if (res.data.user.preferred_language) {
              changeLanguage(res.data.user.preferred_language);
            }
          }
        } catch (err) {
          console.warn('Session verification error:', err.message);
          // Token might be invalid or expired
          logout();
        }
      }
      setLoading(false);
    };

    initAuth();
  }, []);

  const loginFarmer = async (phone, password) => {
    const res = await api.post('/auth/farmer/login', { phone, password });
    if (res.data.success) {
      const { token: newToken, user: newUser } = res.data;
      setToken(newToken);
      setUser(newUser);
      localStorage.setItem('kisansetu_token', newToken);
      localStorage.setItem('kisansetu_user', JSON.stringify(newUser));
      if (newUser.preferredLanguage) {
        changeLanguage(newUser.preferredLanguage);
      }
      return newUser;
    }
    throw new Error(res.data.error || 'Login failed');
  };

  const registerFarmer = async (farmerData) => {
    const res = await api.post('/auth/farmer/register', farmerData);
    if (res.data.success) {
      const { token: newToken, user: newUser } = res.data;
      setToken(newToken);
      setUser(newUser);
      localStorage.setItem('kisansetu_token', newToken);
      localStorage.setItem('kisansetu_user', JSON.stringify(newUser));
      if (newUser.preferredLanguage) {
        changeLanguage(newUser.preferredLanguage);
      }
      return newUser;
    }
    throw new Error(res.data.error || 'Registration failed');
  };

  const loginAdmin = async (identifier, password) => {
    const res = await api.post('/auth/admin/login', { identifier, password });
    if (res.data.success) {
      const { token: newToken, user: newUser } = res.data;
      setToken(newToken);
      setUser(newUser);
      localStorage.setItem('kisansetu_token', newToken);
      localStorage.setItem('kisansetu_user', JSON.stringify(newUser));
      return newUser;
    }
    throw new Error(res.data.error || 'Admin login failed');
  };

  const logout = () => {
    const currentRole = user?.role;
    setUser(null);
    setToken(null);
    localStorage.removeItem('kisansetu_token');
    localStorage.removeItem('kisansetu_user');
    window.location.href = currentRole === 'ADMIN' ? '/admin/login' : '/farmer/login';
  };

  const updateUserProfile = (updatedFields) => {
    setUser(prev => {
      const updated = { ...prev, ...updatedFields };
      localStorage.setItem('kisansetu_user', JSON.stringify(updated));
      return updated;
    });
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        isAuthenticated: !!token && !!user,
        isFarmer: user?.role === 'FARMER',
        isAdmin: user?.role === 'ADMIN',
        loginFarmer,
        registerFarmer,
        loginAdmin,
        logout,
        updateUserProfile
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
