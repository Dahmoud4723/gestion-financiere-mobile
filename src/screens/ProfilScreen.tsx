import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  ScrollView, ActivityIndicator, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { colors } from '../theme/colors';
import { profilAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import type { Lang } from '../i18n/translations';
import type { Profil } from '../types';

const LANG_OPTIONS: { value: Lang; label: string; flag: string }[] = [
  { value: 'fr', label: 'Français', flag: '🇫🇷' },
  { value: 'ar', label: 'العربية', flag: '🇲🇷' },
];

export default function ProfilScreen() {
  const { signOut } = useAuth();
  const { t, lang, setLanguage } = useLanguage();
  const [profil, setProfil] = useState<Profil | null>(null);
  const [loading, setLoading] = useState(true);

  const [editNom, setEditNom] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [saving, setSaving] = useState(false);

  const [oldPass, setOldPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [confPass, setConfPass] = useState('');
  const [savingPwd, setSavingPwd] = useState(false);
  const [showPwd, setShowPwd] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await profilAPI.get();
      const p: Profil = res.data?.data ?? res.data;
      setProfil(p);
      setEditNom(p.nom);
      setEditEmail(p.email);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleSaveProfil = async () => {
    if (!editNom.trim() && !editEmail.trim()) {
      Alert.alert(t.common.error, t.profil.atLeastOneField);
      return;
    }
    setSaving(true);
    try {
      const res = await profilAPI.update({ nom: editNom.trim(), email: editEmail.trim() });
      const updated: Profil = res.data?.data ?? res.data;
      setProfil(updated);
      Alert.alert(t.common.success, t.profil.profilUpdated);
    } catch (e: any) {
      Alert.alert(t.common.error, e?.response?.data?.message ?? t.profil.errorUpdate);
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (!oldPass || !newPass || !confPass) {
      Alert.alert(t.common.error, t.profil.allFieldsRequired);
      return;
    }
    if (newPass !== confPass) {
      Alert.alert(t.common.error, t.profil.passwordMismatch);
      return;
    }
    if (newPass.length < 6) {
      Alert.alert(t.common.error, t.profil.passwordTooShort);
      return;
    }
    setSavingPwd(true);
    try {
      await profilAPI.updatePassword({ ancienMotDePasse: oldPass, nouveauMotDePasse: newPass });
      setOldPass(''); setNewPass(''); setConfPass('');
      Alert.alert(t.common.success, t.profil.passwordChanged);
    } catch (e: any) {
      Alert.alert(t.common.error, e?.response?.data?.message ?? t.profil.errorPassword);
    } finally {
      setSavingPwd(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView showsVerticalScrollIndicator={false}>

          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>{t.profil.title}</Text>
            <TouchableOpacity onPress={signOut} style={styles.logoutBtn}>
              <Ionicons name="log-out-outline" size={18} color={colors.danger} />
              <Text style={styles.logoutText}>{t.profil.logout}</Text>
            </TouchableOpacity>
          </View>

          {/* Avatar */}
          {profil && (
            <View style={styles.avatarCard}>
              <View style={styles.avatar}>
                <Text style={styles.avatarLetter}>
                  {profil.nom.charAt(0).toUpperCase()}
                </Text>
              </View>
              <Text style={styles.profilNom}>{profil.nom}</Text>
              <Text style={styles.profilEmail}>{profil.email}</Text>
              <View style={styles.roleBadge}>
                <Text style={styles.roleText}>{profil.role}</Text>
              </View>
            </View>
          )}

          {/* Sélecteur de langue */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="language-outline" size={16} color={colors.accent} />
              <Text style={styles.sectionTitle}>{t.profil.languageSection}</Text>
            </View>
            <View style={styles.langRow}>
              {LANG_OPTIONS.map((opt) => {
                const active = lang === opt.value;
                return (
                  <TouchableOpacity
                    key={opt.value}
                    style={[styles.langBtn, active && styles.langBtnActive]}
                    onPress={() => setLanguage(opt.value)}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.langFlag}>{opt.flag}</Text>
                    <Text style={[styles.langLabel, active && styles.langLabelActive]}>
                      {opt.label}
                    </Text>
                    {active && (
                      <Ionicons name="checkmark-circle" size={16} color={colors.accent} style={styles.langCheck} />
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Modifier profil */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="person-outline" size={16} color={colors.accent} />
              <Text style={styles.sectionTitle}>{t.profil.editSection}</Text>
            </View>

            <Text style={styles.label}>{t.profil.name}</Text>
            <View style={styles.inputWrap}>
              <Ionicons name="person-outline" size={17} color={colors.textMuted} />
              <TextInput
                style={styles.input}
                value={editNom}
                onChangeText={setEditNom}
                placeholder={t.profil.namePlaceholder}
                placeholderTextColor={colors.textMuted}
              />
            </View>

            <Text style={styles.label}>{t.profil.email}</Text>
            <View style={styles.inputWrap}>
              <Ionicons name="mail-outline" size={17} color={colors.textMuted} />
              <TextInput
                style={styles.input}
                value={editEmail}
                onChangeText={setEditEmail}
                placeholder={t.profil.emailPlaceholder}
                placeholderTextColor={colors.textMuted}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            <TouchableOpacity
              style={[styles.btn, saving && styles.btnDisabled]}
              onPress={handleSaveProfil}
              disabled={saving}
            >
              {saving
                ? <ActivityIndicator size="small" color="#fff" />
                : <Text style={styles.btnText}>{t.profil.save}</Text>
              }
            </TouchableOpacity>
          </View>

          {/* Changer mot de passe */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="lock-closed-outline" size={16} color={colors.accent} />
              <Text style={styles.sectionTitle}>{t.profil.passwordSection}</Text>
              <TouchableOpacity onPress={() => setShowPwd(v => !v)} style={{ marginLeft: 'auto' }}>
                <Ionicons
                  name={showPwd ? 'eye-off-outline' : 'eye-outline'}
                  size={18}
                  color={colors.textMuted}
                />
              </TouchableOpacity>
            </View>

            <Text style={styles.label}>{t.profil.oldPassword}</Text>
            <View style={styles.inputWrap}>
              <Ionicons name="lock-closed-outline" size={17} color={colors.textMuted} />
              <TextInput
                style={styles.input}
                value={oldPass}
                onChangeText={setOldPass}
                placeholder={t.profil.passwordPlaceholder}
                placeholderTextColor={colors.textMuted}
                secureTextEntry={!showPwd}
              />
            </View>

            <Text style={styles.label}>{t.profil.newPassword}</Text>
            <View style={styles.inputWrap}>
              <Ionicons name="lock-open-outline" size={17} color={colors.textMuted} />
              <TextInput
                style={styles.input}
                value={newPass}
                onChangeText={setNewPass}
                placeholder={t.profil.passwordPlaceholder}
                placeholderTextColor={colors.textMuted}
                secureTextEntry={!showPwd}
              />
            </View>

            <Text style={styles.label}>{t.profil.confirmPassword}</Text>
            <View style={styles.inputWrap}>
              <Ionicons name="lock-open-outline" size={17} color={colors.textMuted} />
              <TextInput
                style={styles.input}
                value={confPass}
                onChangeText={setConfPass}
                placeholder={t.profil.passwordPlaceholder}
                placeholderTextColor={colors.textMuted}
                secureTextEntry={!showPwd}
              />
            </View>

            <TouchableOpacity
              style={[styles.btn, styles.btnOutline, savingPwd && styles.btnDisabled]}
              onPress={handleChangePassword}
              disabled={savingPwd}
            >
              {savingPwd
                ? <ActivityIndicator size="small" color={colors.accent} />
                : <Text style={[styles.btnText, { color: colors.accent }]}>{t.profil.passwordSection}</Text>
              }
            </TouchableOpacity>
          </View>

          <View style={{ height: 32 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: colors.background },
  loader: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8 },
  title:  { fontSize: 22, fontWeight: '700', color: colors.text },
  logoutBtn:  { flexDirection: 'row', alignItems: 'center', gap: 6 },
  logoutText: { color: colors.danger, fontSize: 14, fontWeight: '500' },
  avatarCard: { alignItems: 'center', paddingVertical: 24, gap: 8 },
  avatar:       { width: 72, height: 72, borderRadius: 36, backgroundColor: `${colors.accent}28`, justifyContent: 'center', alignItems: 'center', marginBottom: 4 },
  avatarLetter: { fontSize: 30, fontWeight: '700', color: colors.accent },
  profilNom:    { fontSize: 18, fontWeight: '700', color: colors.text },
  profilEmail:  { fontSize: 14, color: colors.textMuted },
  roleBadge:    { backgroundColor: `${colors.accent}22`, paddingHorizontal: 12, paddingVertical: 4, borderRadius: 20, marginTop: 2 },
  roleText:     { color: colors.accent, fontWeight: '600', fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5 },
  section:       { marginHorizontal: 20, marginBottom: 16, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: 16, padding: 18, gap: 10 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  sectionTitle:  { fontSize: 15, fontWeight: '600', color: colors.text },
  langRow: { flexDirection: 'row', gap: 10 },
  langBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: 12, borderRadius: 12,
    borderWidth: 1.5, borderColor: colors.border,
    backgroundColor: colors.background,
  },
  langBtnActive: { borderColor: colors.accent, backgroundColor: `${colors.accent}15` },
  langFlag:  { fontSize: 20 },
  langLabel: { fontSize: 14, fontWeight: '600', color: colors.textMuted },
  langLabelActive: { color: colors.accent },
  langCheck: { marginLeft: 2 },
  label:     { fontSize: 13, color: colors.textMuted, fontWeight: '500' },
  inputWrap: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 11 },
  input:     { flex: 1, color: colors.text, fontSize: 15 },
  btn:         { backgroundColor: colors.accent, borderRadius: 12, paddingVertical: 13, alignItems: 'center', marginTop: 4 },
  btnOutline:  { backgroundColor: 'transparent', borderWidth: 1.5, borderColor: colors.accent },
  btnDisabled: { opacity: 0.55 },
  btnText:     { color: '#fff', fontWeight: '700', fontSize: 15 },
});
