import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, FlatList, StyleSheet, RefreshControl, ActivityIndicator,
  TouchableOpacity, Modal, TextInput, Alert, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { comptesAPI } from '../services/api';
import type { Compte } from '../types';

const TYPE_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  COURANT: 'card-outline',
  EPARGNE: 'trending-up-outline',
  CAISSE:  'cash-outline',
  MOBILE:  'phone-portrait-outline',
  INVESTISSEMENT: 'bar-chart-outline',
};

const TYPES = ['COURANT', 'EPARGNE', 'MOBILE', 'CAISSE', 'INVESTISSEMENT'];

function mru(n: number) {
  return `${n.toLocaleString('fr-FR', { maximumFractionDigits: 0 })} MRU`;
}

export default function ComptesScreen() {
  const [comptes,    setComptes]    = useState<Compte[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form state
  const [nom, setNom] = useState('');
  const [type, setType] = useState('COURANT');
  const [soldeInitial, setSoldeInitial] = useState('0');

  const load = useCallback(async () => {
    try {
      const res = await comptesAPI.getAll();
      setComptes(res.data?.data ?? res.data ?? []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const resetForm = () => {
    setNom('');
    setType('COURANT');
    setSoldeInitial('0');
  };

  const handleCreate = async () => {
    if (!nom.trim()) { Alert.alert('Erreur', 'Le nom est requis.'); return; }
    const solde = parseFloat(soldeInitial);
    if (isNaN(solde) || solde < 0) { Alert.alert('Erreur', 'Solde initial invalide.'); return; }

    setSaving(true);
    try {
      await comptesAPI.create({ nom: nom.trim(), type, soldeInitial: solde });
      Alert.alert('Succès', 'Compte créé !');
      setModalVisible(false);
      resetForm();
      load();
    } catch (e: any) {
      Alert.alert('Erreur', e.response?.data?.message ?? 'Création échouée.');
    } finally {
      setSaving(false);
    }
  };

  const total = comptes.reduce((s, c) => s + (c.soldeActuel ?? 0), 0);

  const renderItem = ({ item }: { item: Compte }) => {
    const soldePos = (item.soldeActuel ?? 0) >= 0;
    return (
      <View style={styles.card}>
        <View style={styles.cardTop}>
          <View style={styles.iconBox}>
            <Ionicons name={TYPE_ICONS[item.type] ?? 'wallet-outline'} size={22} color={colors.accent} />
          </View>
          <View style={styles.cardInfo}>
            <Text style={styles.cardNom}>{item.nom}</Text>
            <Text style={styles.cardType}>{item.type}</Text>
          </View>
        </View>
        <View style={styles.cardBottom}>
          <Text style={styles.soldeLabel}>Solde</Text>
          <Text style={[styles.solde, { color: soldePos ? colors.success : colors.danger }]}>
            {mru(item.soldeActuel ?? 0)}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Comptes</Text>
        <TouchableOpacity style={styles.addBtn} onPress={() => setModalVisible(true)}>
          <Ionicons name="add" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      {!loading && comptes.length > 0 && (
        <View style={styles.totalBanner}>
          <Text style={styles.totalLabel}>Total consolidé</Text>
          <Text style={styles.totalValue}>{mru(total)}</Text>
        </View>
      )}

      {loading ? (
        <ActivityIndicator size="large" color={colors.accent} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={comptes}
          keyExtractor={item => item.id.toString()}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => { setRefreshing(true); load(); }}
              tintColor={colors.accent}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <Ionicons name="wallet-outline" size={46} color={colors.textMuted} />
              <Text style={styles.emptyText}>Aucun compte trouvé</Text>
            </View>
          }
        />
      )}

      {/* Modal création */}
      <Modal visible={modalVisible} transparent animationType="slide" onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalWrap}>
          <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => setModalVisible(false)} />
          <View style={styles.sheet}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Nouveau compte</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={22} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Nom */}
              <Text style={styles.fieldLabel}>Nom du compte *</Text>
              <TextInput
                style={styles.input}
                value={nom}
                onChangeText={setNom}
                placeholder="Ex: Compte Principal"
                placeholderTextColor={colors.textMuted}
              />

              {/* Type */}
              <Text style={styles.fieldLabel}>Type *</Text>
              <View style={styles.typeGrid}>
                {TYPES.map(t => (
                  <TouchableOpacity
                    key={t}
                    style={[styles.typeChip, type === t && styles.typeChipActive]}
                    onPress={() => setType(t)}
                  >
                    <Ionicons
                      name={TYPE_ICONS[t] ?? 'wallet-outline'}
                      size={14}
                      color={type === t ? '#fff' : colors.textMuted}
                    />
                    <Text style={[styles.typeChipText, type === t && { color: '#fff' }]}>{t}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Solde initial */}
              <Text style={styles.fieldLabel}>Solde initial (MRU)</Text>
              <TextInput
                style={styles.input}
                value={soldeInitial}
                onChangeText={setSoldeInitial}
                placeholder="0"
                placeholderTextColor={colors.textMuted}
                keyboardType="numeric"
              />

              {/* Bouton créer */}
              <TouchableOpacity
                style={[styles.createBtn, saving && { opacity: 0.6 }]}
                onPress={handleCreate}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Ionicons name="checkmark-circle-outline" size={20} color="#fff" />
                    <Text style={styles.createBtnText}>Créer le compte</Text>
                  </>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: colors.background },
  header: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title:  { fontSize: 22, fontWeight: '700', color: colors.text },
  addBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: colors.accent, justifyContent: 'center', alignItems: 'center' },
  totalBanner: {
    marginHorizontal: 20, marginBottom: 16,
    backgroundColor: `${colors.accent}18`, borderWidth: 1, borderColor: `${colors.accent}40`,
    borderRadius: 14, padding: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  totalLabel: { fontSize: 13, color: colors.textMuted },
  totalValue: { fontSize: 18, fontWeight: '700', color: colors.text },
  list: { paddingHorizontal: 20, paddingBottom: 24 },
  card: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: 16, padding: 16, marginBottom: 12, gap: 14 },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconBox: { width: 46, height: 46, borderRadius: 14, backgroundColor: `${colors.accent}20`, justifyContent: 'center', alignItems: 'center' },
  cardInfo: { flex: 1 },
  cardNom:  { fontSize: 15, fontWeight: '600', color: colors.text },
  cardType: { fontSize: 12, color: colors.textMuted, marginTop: 3 },
  cardBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.border },
  soldeLabel: { fontSize: 12, color: colors.textMuted },
  solde:      { fontSize: 17, fontWeight: '700' },
  emptyBox:   { alignItems: 'center', paddingTop: 60, gap: 12 },
  emptyText:  { fontSize: 15, color: colors.textMuted },
  // Modal
  modalWrap: { flex: 1, justifyContent: 'flex-end' },
  overlay:   { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.55)' },
  sheet:     { backgroundColor: '#0d1230', borderTopLeftRadius: 22, borderTopRightRadius: 22, padding: 20, maxHeight: '80%' },
  sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  sheetTitle:  { fontSize: 17, fontWeight: '600', color: colors.text },
  fieldLabel:  { fontSize: 13, color: colors.textMuted, fontWeight: '500', marginBottom: 8, marginTop: 16 },
  input: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, color: colors.text, fontSize: 15 },
  typeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  typeChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border },
  typeChipActive: { backgroundColor: colors.accent, borderColor: colors.accent },
  typeChipText: { fontSize: 12, color: colors.textMuted, fontWeight: '500' },
  createBtn: { backgroundColor: colors.accent, borderRadius: 14, paddingVertical: 16, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, marginTop: 24, marginBottom: 8 },
  createBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});