import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { registerForPushNotifications, sendLocalNotification } from '../services/notifications';

interface AuthContextType {
  isLoggedIn: boolean;
  isLoading: boolean;
  signIn: (token: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    AsyncStorage.getItem('token').then((token) => {
      setIsLoggedIn(!!token);
      setIsLoading(false);
    });
  }, []);

  const signIn = async (token: string) => {
    await AsyncStorage.setItem('token', token);
    setIsLoggedIn(true);
    // Demander permission notifications
    await registerForPushNotifications();
    // Notification de bienvenue
    await sendLocalNotification(
      '👋 Bienvenue !',
      'Vous êtes connecté à Gestion Financière IDER SI.'
    );
  };

  const signOut = async () => {
    await AsyncStorage.removeItem('token');
    setIsLoggedIn(false);
  };

  return (
    <AuthContext.Provider value={{ isLoggedIn, isLoading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);