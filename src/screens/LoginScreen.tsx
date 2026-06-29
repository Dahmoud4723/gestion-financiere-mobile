import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, Alert, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors } from '../theme/colors';
import { authAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { isBiometricAvailable, authenticateWithBiometrics } from '../services/biometrics';

export default function LoginScreen() {
  const navigation = useNavigation<any>();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const { signIn } = useAuth();

  useEffect(() => {
    isBiometricAvailable().then(setBiometricAvailable);
  }, []);

  const handleLogin = async () => {
    if (!email.trim() || !password) {
      Alert.alert('Champs manquants', 'Veuillez remplir tous les champs.');
      return;
    }
    setLoading(true);
    try {
      const res = await authAPI.login(email.trim(), password);
      const token = res.data?.token ?? res.data?.data?.token;
      if (!token) throw new Error('Token manquant dans la réponse');
      await AsyncStorage.setItem('lastToken', token);
      await signIn(token);
    } catch (err: any) {
      Alert.alert(
        'Connexion échouée',
        err.response?.data?.message ?? err.message ?? 'Vérifiez vos identifiants.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleBiometricLogin = async () => {
    const savedToken = await AsyncStorage.getItem('lastToken');
    if (!savedToken) {
      Alert.alert('Info', 'Connectez-vous d\'abord avec votre mot de passe pour activer Face ID.');
      return;
    }
    const success = await authenticateWithBiometrics();
    if (success) {
      await signIn(savedToken);
    } else {
      Alert.alert('Échec', 'Authentification biométrique échouée.');
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView style={styles.kav} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={styles.content}>
          <View style={styles.logoBlock}>
            <View style={styles.logoCircle}>
              <Text style={styles.logoEmoji}>💰</Text>
            </View>
            <Text style={styles.title}>Gestion Financière</Text>
            <Text style={styles.subtitle}>IDER SI — Nouakchott</Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Connexion</Text>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Adresse e-mail</Text>
              <View style={styles.inputWrap}>
                <Ionicons name="mail-outline" size={18} color={colors.textMuted} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  value={email}
                  onChangeText={setEmail}
                  placeholder="exemple@email.com"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Mot de passe</Text>
              <View style={styles.inputWrap}>
                <Ionicons name="lock-closed-outline" size={18} color={colors.textMuted} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  value={password}
                  onChangeText={setPassword}
                  placeholder="••••••••"
                  placeholderTextColor={colors.textMuted}
                  secureTextEntry={!showPwd}
                />
                <TouchableOpacity onPress={() => setShowPwd(!showPwd)} style={styles.eyeBtn}>
                  <Ionicons name={showPwd ? 'eye-off-outline' : 'eye-outline'} size={18} color={colors.textMuted} />
                </TouchableOpacity>
              </View>
            </View>

            <TouchableOpacity
              style={[styles.btn, loading && styles.btnDisabled]}
              onPress={handleLogin}
              disabled={loading}
              activeOpacity={0.85}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Ionicons name="log-in-outline" size={20} color="#fff" />
                  <Text style={styles.btnText}>Se connecter</Text>
                </>
              )}
            </TouchableOpacity>

            {biometricAvailable && (
              <TouchableOpacity style={styles.biometricBtn} onPress={handleBiometricLogin}>
                <Ionicons name="finger-print-outline" size={22} color={colors.accent} />
                <Text style={styles.biometricText}>Face ID / Touch ID</Text>
              </TouchableOpacity>
            )}

            <View style={styles.separator}>
              <View style={styles.sepLine} />
              <Text style={styles.sepText}>ou</Text>
              <View style={styles.sepLine} />
            </View>

            <TouchableOpacity
              style={styles.registerBtn}
              onPress={() => navigation.navigate('Register')}
              activeOpacity={0.85}
            >
              <Ionicons name="person-add-outline" size={20} color={colors.accent} />
              <Text style={styles.registerBtnText}>Créer un compte</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.footer}>© 2026 IDER SI — Tous droits réservés</Text>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  kav: { flex: 1 },
  content: { flex: 1, justifyContent: 'center', paddingHorizontal: 24 },
  logoBlock: { alignItems: 'center', marginBottom: 32 },
  logoCircle: {
    width: 88, height: 88, borderRadius: 26,
    backgroundColor: `${colors.accent}20`,
    borderWidth: 1.5, borderColor: `${colors.accent}50`,
    justifyContent: 'center', alignItems: 'center', marginBottom: 16,
  },
  logoEmoji: { fontSize: 42 },
  title: { fontSize: 26, fontWeight: '800', color: colors.text, letterSpacing: 0.3 },
  subtitle: { fontSize: 13, color: colors.textMuted, marginTop: 4 },
  card: {
    backgroundColor: colors.card,
    borderWidth: 1, borderColor: colors.border,
    borderRadius: 20, padding: 24, gap: 16,
  },
  cardTitle: { fontSize: 18, fontWeight: '700', color: colors.text, marginBottom: 4 },
  fieldGroup: { gap: 8 },
  label: { fontSize: 13, color: colors.textMuted, fontWeight: '500' },
  inputWrap: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.background,
    borderWidth: 1, borderColor: colors.border,
    borderRadius: 12, paddingHorizontal: 14,
  },
  inputIcon: { marginRight: 10 },
  input: { flex: 1, paddingVertical: 14, color: colors.text, fontSize: 15 },
  eyeBtn: { padding: 4 },
  btn: {
    backgroundColor: colors.accent,
    borderRadius: 12, paddingVertical: 15,
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8,
  },
  btnDisabled: { opacity: 0.55 },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  biometricBtn: {
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8,
    paddingVertical: 14, borderRadius: 12,
    borderWidth: 1.5, borderColor: `${colors.accent}50`,
    backgroundColor: `${colors.accent}10`,
  },
  biometricText: { color: colors.accent, fontSize: 15, fontWeight: '600' },
  separator: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  sepLine: { flex: 1, height: 1, backgroundColor: colors.border },
  sepText: { fontSize: 13, color: colors.textMuted },
  registerBtn: {
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8,
    borderWidth: 1.5, borderColor: colors.accent,
    borderRadius: 12, paddingVertical: 14,
  },
  registerBtnText: { color: colors.accent, fontSize: 15, fontWeight: '600' },
  footer: { textAlign: 'center', color: colors.textMuted, fontSize: 11, marginTop: 24 },
});