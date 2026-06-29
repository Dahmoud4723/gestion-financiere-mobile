import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { I18nManager, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { translations, Lang, Translations } from '../i18n/translations';

interface LanguageContextType {
  lang: Lang;
  t: Translations;
  isRTL: boolean;
  setLanguage: (lang: Lang) => Promise<void>;
}

const LanguageContext = createContext<LanguageContextType | null>(null);

const LANG_KEY = '@app_language';

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>('fr');

  useEffect(() => {
    AsyncStorage.getItem(LANG_KEY).then((saved) => {
      if (saved === 'ar' || saved === 'fr') {
        setLang(saved);
        const needsRTL = saved === 'ar';
        if (I18nManager.isRTL !== needsRTL) {
          I18nManager.forceRTL(needsRTL);
        }
      }
    });
  }, []);

  const setLanguage = async (newLang: Lang) => {
    const needsRTL = newLang === 'ar';
    const rtlChanged = I18nManager.isRTL !== needsRTL;

    await AsyncStorage.setItem(LANG_KEY, newLang);
    I18nManager.forceRTL(needsRTL);
    setLang(newLang);

    if (rtlChanged) {
      const t = translations[newLang];
      Alert.alert(
        t.profil.rtlRestartTitle,
        t.profil.rtlRestartMsg,
      );
    }
  };

  return (
    <LanguageContext.Provider
      value={{
        lang,
        t: translations[lang],
        isRTL: lang === 'ar',
        setLanguage,
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage(): LanguageContextType {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLanguage must be used inside LanguageProvider');
  return ctx;
}
