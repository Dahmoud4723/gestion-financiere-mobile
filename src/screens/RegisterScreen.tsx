import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, Alert, ActivityIndicator,
  ScrollView, Modal, FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { colors } from '../theme/colors';
import { authAPI, organisationsAPI } from '../services/api';

interface Organisation { id: string; nom: string; }

export default function RegisterScreen() {
  const navigation = useNavigation<any>();
  const [nom,      setNom]      = useState('');
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [confirm,  setConfirm]  = useState('');
  const [showPwd,  setShowPwd]  = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [orgMode,  setOrgMode]  = useState<'existante' | 'nouvelle'>('existante');
  const [orgNom,   setOrgNom]   = useState('');
  const [organisations,   setOrganisations]   = useState<Organisation[]>([]);
  const [orgSelected,     setOrgSelected]     = useState<Organisation | null>(null);
  const [orgModalVisible, setOrgModalVisible] = useState(false);

  useEffect(() => {
    organisationsAPI.getAll()
      .then(res => setOrganisations(res.data?.data ?? []))
      .catch(console.error);
  }, []);

  const handleRegister = async () => {
    if (!nom.trim() || !email.trim() || !password || !confirm) {
      Alert.alert('Erreur', 'Veuillez remplir tous les champs.');
      return;
    }
    if (password !== confirm) {
      Alert.alert('Erreur', 'Les mots de passe ne correspondent pas.');
      return;
    }
    if (password.length < 8) {
      Alert.alert('Erreur', 'Le mot de passe doit contenir au moins 8 caractères.');
      return;
    }
    if (orgMode === 'existante' && !orgSelected) {
      Alert.alert('Erreur', "Veuillez sélectionner une organisation.");
      return;
    }
    if (orgMode === 'nouvelle' && !orgNom.trim()) {
      Alert.alert('Erreur', "Le nom de l'organisation est requis.");
      return;
    }

    setLoading(true);
    try {
      await authAPI.register(
        nom.trim(),
        email.trim(),
        password,
        orgMode === 'existante' ? orgSelected!.id : orgNom.trim()
      );
      Alert.alert(
        'Compte créé !',
        'Votre compte a été créé avec succès. Connectez-vous.',
        [{ text: 'OK', onPress: () => navigation.navigate('Login') }]
      );
    } catch (err: any) {
      Alert.alert('Erreur', err.response?.data?.message ?? 'Inscription échouée.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView style={styles.kav} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">

          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
              <Ionicons name="arrow-back" size={22} color={colors.text} />
            </TouchableOpacity>
          </View>

          {/* Logo */}
          <View style={styles.logoBlock}>
            <View style={styles.logoCircle}>
              <Text style={styles.logoEmoji}>💰</Text>
            </View>
            <Text style={styles.title}>Créer un compte</Text>
            <Text style={styles.subtitle}>Rejoignez IDER SI</Text>
          </View>

          {/* Card formulaire */}
          <View style={styles.card}>

            {/* Nom */}
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Nom complet *</Text>
              <View style={styles.inputWrap}>
                <Ionicons name="person-outline" size={18} color={colors.textMuted} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  value={nom}
                  onChangeText={setNom}
                  placeholder="Votre nom"
                  placeholderTextColor={colors.textMuted}
                  autoCapitalize="words"
                />
              </View>
            </View>

            {/* Email */}
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Adresse e-mail *</Text>
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

            {/* Mot de passe */}
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Mot de passe *</Text>
              <View style={styles.inputWrap}>
                <Ionicons name="lock-closed-outline" size={18} color={colors.textMuted} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  value={password}
                  onChangeText={setPassword}
                  placeholder="Min. 8 caractères"
                  placeholderTextColor={colors.textMuted}
                  secureTextEntry={!showPwd}
                />
                <TouchableOpacity onPress={() => setShowPwd(!showPwd)} style={styles.eyeBtn}>
                  <Ionicons name={showPwd ? 'eye-off-outline' : 'eye-outline'} size={18} color={colors.textMuted} />
                </TouchableOpacity>
              </View>
            </View>

            {/* Confirmer mot de passe */}
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Confirmer le mot de passe *</Text>
              <View style={[styles.inputWrap, confirm && confirm !== password ? { borderColor: colors.danger } : {}]}>
                <Ionicons name="lock-closed-outline" size={18} color={colors.textMuted} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  value={confirm}
                  onChangeText={setConfirm}
                  placeholder="Répétez le mot de passe"
                  placeholderTextColor={colors.textMuted}
                  secureTextEntry={!showPwd}
                />
                {confirm.length > 0 && (
                  <Ionicons
                    name={confirm === password ? 'checkmark-circle' : 'close-circle'}
                    size={18}
                    color={confirm === password ? colors.success : colors.danger}
                  />
                )}
              </View>
            </View>

            {/* Organisation */}
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Organisation *</Text>
              <View style={styles.typeRow}>
                <TouchableOpacity
                  style={[styles.typeBtn, orgMode === 'existante' && styles.typeBtnActive]}
                  onPress={() => setOrgMode('existante')}
                >
                  <Ionicons name="business-outline" size={14} color={orgMode === 'existante' ? '#fff' : colors.textMuted} />
                  <Text style={[styles.typeBtnText, orgMode === 'existante' && { color: '#fff' }]}>Existante</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.typeBtn, orgMode === 'nouvelle' && styles.typeBtnActive]}
                  onPress={() => setOrgMode('nouvelle')}
                >
                  <Ionicons name="add-circle-outline" size={14} color={orgMode === 'nouvelle' ? '#fff' : colors.textMuted} />
                  <Text style={[styles.typeBtnText, orgMode === 'nouvelle' && { color: '#fff' }]}>Nouvelle</Text>
                </TouchableOpacity>
              </View>

              {orgMode === 'existante' ? (
                <TouchableOpacity style={styles.selectWrap} onPress={() => setOrgModalVisible(true)}>
                  <Ionicons name="business-outline" size={18} color={colors.textMuted} style={styles.inputIcon} />
                  <Text style={[styles.selectText, !orgSelected && { color: colors.textMuted }]}>
                    {orgSelected?.nom ?? 'Sélectionner une organisation...'}
                  </Text>
                  <Ionicons name="chevron-down" size={16} color={colors.textMuted} />
                </TouchableOpacity>
              ) : (
                <View style={styles.inputWrap}>
                  <Ionicons name="business-outline" size={18} color={colors.textMuted} style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    value={orgNom}
                    onChangeText={setOrgNom}
                    placeholder="Nom de la nouvelle organisation"
                    placeholderTextColor={colors.textMuted}
                  />
                </View>
              )}
            </View>

            {/* Bouton inscription */}
            <TouchableOpacity
              style={[styles.btn, loading && styles.btnDisabled]}
              onPress={handleRegister}
              disabled={loading}
              activeOpacity={0.85}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Ionicons name="person-add-outline" size={20} color="#fff" />
                  <Text style={styles.btnText}>Créer mon compte</Text>
                </>
              )}
            </TouchableOpacity>

            {/* Lien connexion */}
            <TouchableOpacity style={styles.loginLink} onPress={() => navigation.navigate('Login')}>
              <Text style={styles.loginLinkText}>
                Déjà un compte ?{' '}
                <Text style={{ color: colors.accent, fontWeight: '600' }}>Se connecter</Text>
              </Text>
            </TouchableOpacity>

          </View>

          <Text style={styles.footer}>© 2026 IDER SI — Tous droits réservés</Text>

        </ScrollView>
      </KeyboardAvoidingView>

      {/* Modal organisations */}
      <Modal visible={orgModalVisible} transparent animationType="slide" onRequestClose={() => setOrgModalVisible(false)}>
        <View style={styles.modalWrap}>
          <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => setOrgModalVisible(false)} />
          <View style={styles.sheet}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Choisir une organisation</Text>
              <TouchableOpacity onPress={() => setOrgModalVisible(false)}>
                <Ionicons name="close" size={22} color={colors.textMuted} />
              </TouchableOpacity>
            </View>
            <FlatList
              data={organisations}
              keyExtractor={o => o.id}
              renderItem={({ item }) => {
                const active = orgSelected?.id === item.id;
                return (
                  <TouchableOpacity
                    style={styles.orgOption}
                    onPress={() => { setOrgSelected(item); setOrgModalVisible(false); }}
                  >
                    <Ionicons name="business-outline" size={18} color={active ? colors.accent : colors.textMuted} />
                    <Text style={[styles.orgOptionText, active && { color: colors.accent, fontWeight: '600' }]}>
                      {item.nom}
                    </Text>
                    {active && <Ionicons name="checkmark" size={18} color={colors.accent} />}
                  </TouchableOpacity>
                );
              }}
            />
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: colors.background },
  kav:    { flex: 1 },
  scroll: { paddingHorizontal: 24, paddingBottom: 40 },
  header:  { paddingTop: 16, marginBottom: 8 },
  backBtn: { width: 38, height: 38, borderRadius: 12, backgroundColor: colors.card, justifyContent: 'center', alignItems: 'center' },
  logoBlock: { alignItems: 'center', marginBottom: 28, marginTop: 8 },
  logoCircle: {
    width: 80, height: 80, borderRadius: 24,
    backgroundColor: `${colors.accent}20`,
    borderWidth: 1.5, borderColor: `${colors.accent}50`,
    justifyContent: 'center', alignItems: 'center', marginBottom: 14,
  },
  logoEmoji: { fontSize: 38 },
  title:     { fontSize: 24, fontWeight: '800', color: colors.text },
  subtitle:  { fontSize: 13, color: colors.textMuted, marginTop: 4 },
  card: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: 20, padding: 24, gap: 16 },
  fieldGroup: { gap: 8 },
  label:      { fontSize: 13, color: colors.textMuted, fontWeight: '500' },
  inputWrap: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.background,
    borderWidth: 1, borderColor: colors.border,
    borderRadius: 12, paddingHorizontal: 14,
  },
  inputIcon: { marginRight: 10 },
  input:     { flex: 1, paddingVertical: 14, color: colors.text, fontSize: 15 },
  eyeBtn:    { padding: 4 },
  selectWrap: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.background,
    borderWidth: 1, borderColor: colors.border,
    borderRadius: 12, paddingHorizontal: 14, paddingVertical: 14,
  },
  selectText: { flex: 1, fontSize: 15, color: colors.text },
  typeRow: { flexDirection: 'row', gap: 10, marginBottom: 10 },
  typeBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 12, borderRadius: 12,
    backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border,
  },
  typeBtnActive: { backgroundColor: colors.accent, borderColor: colors.accent },
  typeBtnText:   { fontSize: 13, fontWeight: '600', color: colors.textMuted },
  btn: {
    backgroundColor: colors.accent, borderRadius: 12, paddingVertical: 15,
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, marginTop: 4,
  },
  btnDisabled:   { opacity: 0.55 },
  btnText:       { color: '#fff', fontSize: 16, fontWeight: '700' },
  loginLink:     { alignItems: 'center', paddingVertical: 4 },
  loginLinkText: { fontSize: 14, color: colors.textMuted },
  footer: { textAlign: 'center', color: colors.textMuted, fontSize: 11, marginTop: 24 },
  modalWrap: { flex: 1, justifyContent: 'flex-end' },
  overlay:   { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.55)' },
  sheet:     { backgroundColor: '#0d1230', borderTopLeftRadius: 22, borderTopRightRadius: 22, padding: 20, maxHeight: '70%' },
  sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  sheetTitle:  { fontSize: 17, fontWeight: '600', color: colors.text },
  orgOption: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: colors.border },
  orgOptionText: { flex: 1, fontSize: 15, color: colors.text },
});