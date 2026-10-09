import React, { createContext, useContext, useState, useEffect } from 'react';
import en from '../i18n/en.json';
import hi from '../i18n/hi.json';
import mr from '../i18n/mr.json';

const translations = { en, hi, mr };

const LanguageContext = createContext();

export const LanguageProvider = ({ children }) => {
  const [language, setLanguage] = useState(() => {
    return localStorage.getItem('kisansetu_lang') || 'en';
  });

  useEffect(() => {
    localStorage.setItem('kisansetu_lang', language);
  }, [language]);

  const t = (key, fallback = '') => {
    const currentDict = translations[language] || translations.en;
    if (currentDict && currentDict[key]) {
      return currentDict[key];
    }
    // Fallback to English if translation missing in chosen language
    if (translations.en && translations.en[key]) {
      return translations.en[key];
    }
    return fallback || key;
  };

  const changeLanguage = (newLang) => {
    if (['en', 'hi', 'mr'].includes(newLang)) {
      setLanguage(newLang);
    }
  };

  return (
    <LanguageContext.Provider value={{ language, changeLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
