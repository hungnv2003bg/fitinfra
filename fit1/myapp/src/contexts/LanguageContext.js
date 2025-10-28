import React, { createContext, useContext, useState, useEffect } from 'react';

const LanguageContext = createContext();

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};

export const LanguageProvider = ({ children }) => {
  const [lang, setLang] = useState(() => {
    return localStorage.getItem('language') || 'vi';
  });

  useEffect(() => {

    localStorage.setItem('language', lang);
  }, [lang]);

  const toggleLanguage = () => {
    setLang(prev => prev === 'vi' ? 'zh' : 'vi');
  };

  const value = {
    lang,
    setLang,
    toggleLanguage
  };

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
};

