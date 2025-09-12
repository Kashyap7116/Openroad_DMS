
"use client";

import React, { createContext, useState, useContext, useEffect, PropsWithChildren } from 'react';

type Language = 'en' | 'th';

interface LanguageContextType {
  language: Language;
  setLanguage: (language: Language) => void;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: PropsWithChildren) {
  const [language, setLanguage] = useState<Language>('en');

  useEffect(() => {
    const storedLang = localStorage.getItem('language') as Language;
    if (storedLang && ['en', 'th'].includes(storedLang)) {
      setLanguage(storedLang);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('language', language);
    document.body.classList.remove('lang-en', 'lang-th');
    document.body.classList.add(`lang-${language}`);
  }, [language]);

  return (
    <LanguageContext.Provider value={{ language, setLanguage }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
