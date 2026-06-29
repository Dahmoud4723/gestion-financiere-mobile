import 'react-native-gesture-handler';
import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { AuthProvider } from './src/context/AuthContext';
import AppNavigator from './src/navigation/AppNavigator';

SplashScreen.preventAutoHideAsync();

function SplashScreenCustom({ onFinish }: { onFinish: () => void }) {
  const opacity = new Animated.Value(0);
  const scale = new Animated.Value(0.8);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.spring(scale, { toValue: 1, friction: 4, useNativeDriver: true }),
    ]).start();

    const timer = setTimeout(() => {
      Animated.timing(opacity, { toValue: 0, duration: 400, useNativeDriver: true }).start(() => {
        onFinish();
      });
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  return (
    <View style={styles.splash}>
      <Animated.View style={[styles.logoWrap, { opacity, transform: [{ scale }] }]}>
        <View style={styles.logoCircle}>
          <Text style={styles.logoEmoji}>💰</Text>
        </View>
        <Text style={styles.logoTitle}>Gestion Financière</Text>
        <Text style={styles.logoSub}>IDER SI — Nouakchott</Text>
      </Animated.View>
      <Animated.Text style={[styles.version, { opacity }]}>v1.0.0</Animated.Text>
    </View>
  );
}

export default function App() {
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    SplashScreen.hideAsync();
  }, []);

  if (showSplash) {
    return (
      <>
        <StatusBar style="light" />
        <SplashScreenCustom onFinish={() => setShowSplash(false)} />
      </>
    );
  }

  return (
    <AuthProvider>
      <StatusBar style="light" />
      <AppNavigator />
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  splash: {
    flex: 1,
    backgroundColor: '#0a0f2e',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoWrap: {
    alignItems: 'center',
    gap: 16,
  },
  logoCircle: {
    width: 100,
    height: 100,
    borderRadius: 30,
    backgroundColor: 'rgba(82,113,255,0.2)',
    borderWidth: 2,
    borderColor: 'rgba(82,113,255,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  logoEmoji: { fontSize: 52 },
  logoTitle: { fontSize: 28, fontWeight: '800', color: '#fff', letterSpacing: 0.3 },
  logoSub: { fontSize: 14, color: '#94a3b8' },
  version: { position: 'absolute', bottom: 40, fontSize: 12, color: '#475569' },
});