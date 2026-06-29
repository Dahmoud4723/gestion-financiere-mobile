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
  CAISSE: 'cash-outline',
  MOBILE: 'phone-portrait-outline',
  INVESTISSEMENT: 'bar-chart-outline',
};

const TYPES = ['COURANT', 'EPARGNE', 'MOBILE', 'CAISSE', 'INVESTISSEMENT'];

function mru(n: number) {
  return `${n.toLocaleString('fr-FR', { maximumFractionDigits: 0 })} MRU`;
}

export default function ComptesScreen() {
  const [comptes, setComptes] = useState<Compte[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [virementVisible, setVirementVisible] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form création
  const [nom, setNom] = useState('');
  const [type, setType] = useState('COURANT');
  const [soldeInitial, setSoldeInitial] = useState('0');

  // Form virement
  const [sourceId, setSourceId] = useState('');
  const [destId, setDestId] = useState('');
  const [montant, setMontant] = useState('');
  const [description, setDescription] = useState('');
  const [dateVirement, setDateVirement] = useState(new Date().toISOString().split('T')[0]);

  const load = useCallback(async () => {
    try {
      const res = await comptesAPI.getAll();
      const data = res.data?.data ?? res.data ?? [];
      setComptes(data);
      if (data.length >= 2) {
        setSourceId(data[0].id);
        setDestId(data[1].id);
      }
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

  const handleVirement = async () => {
    if (!sourceId || !destId) { Alert.alert('Erreur', 'Sélectionnez les deux comptes.'); return; }
    if (sourceId === destId) { Alert.alert('Erreur', 'Les comptes source et destination doivent être différents.'); return; }
    const amt = parseFloat(montant);
    if (!montant || isNaN(amt) || amt <= 0) { Alert.alert('Erreur', 'Montant invalide.'); return; }

    const source = comptes.find(c => c.id === sourceId);
    if (source && (source.soldeActuel ?? 0) < amt) {
      Alert.alert('Erreur', 'Solde insuffisant.');
      return;
    }

    setSaving(true);
    try {
      await comptesAPI.virement({
        compteSourceId: sourceId,
        compteDestinationId: destId,
        montant: amt,
        description: description.trim() || undefined,
        dateTransaction: dateVirement,
      });
      Alert.alert('Succès', 'Virement effectué !');
      setVirementVisible(false);
      setMontant('');
      setDescription('');
      load();
    } catch (e: any) {
      Alert.alert('Erreur', e.response?.data?.message ?? 'Virement échoué.');
    } finally {
      setSaving(false);
    }
  };

  const total = comptes.reduce((s, c) => s + (c.soldeActuel ?? 0), 0);
  const sourceCompte = comptes.find(c => c.id === sourceId);

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

  const CompteSelector = ({
    label, value, onChange, exclude,
  }: { label: string; value: string; onChange: (id: string) => void; exclude?: string }) => (
    <View style={styles.fieldGroup}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {comptes.filter(c => c.id !== exclude).map(c => (
            <TouchableOpacity
              key={c.id}
              style={[styles.compteChip, value === c.id && styles.compteChipActive]}
              onPress={() => onChange(c.id)}
            >
              <Ionicons
                name={TYPE_ICONS[c.type] ?? 'wallet-outline'}
                size={14}
                color={value === c.id ? '#fff' : colors.textMuted}
              />
              <Text style={[styles.compteChipText, value === c.id && { color: '#fff' }]}>
                {c.nom}
              </Text>
              <Text style={[styles.compteChipSolde, value === c.id && { color: '#ffffffaa' }]}>
                {mru(c.soldeActuel ?? 0)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </View>
  );

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Comptes</Text>
        <View style={styles.headerBtns}>
          <TouchableOpacity style={styles.virementBtn} onPress={() => setVirementVisible(true)}>
            <Ionicons name="swap-horizontal-outline" size={18} color={colors.accent} />
            <Text style={styles.virementBtnText}>Virement</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.addBtn} onPress={() => setModalVisible(true)}>
            <Ionicons name="add" size={24} color="#fff" />
          </TouchableOpacity>
        </View>
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

      {/* Modal création compte */}
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
              <Text style={styles.fieldLabel}>Nom du compte *</Text>
              <TextInput
                style={styles.input}
                value={nom}
                onChangeText={setNom}
                placeholder="Ex: Compte Principal"
                placeholderTextColor={colors.textMuted}
              />
              <Text style={styles.fieldLabel}>Type *</Text>
              <View style={styles.typeGrid}>
                {TYPES.map(t => (
                  <TouchableOpacity
                    key={t}
                    style={[styles.typeChip, type === t && styles.typeChipActive]}
                    onPress={() => setType(t)}
                  >
                    <Ionicons name={TYPE_ICONS[t] ?? 'wallet-outline'} size={14} color={type === t ? '#fff' : colors.textMuted} />
                    <Text style={[styles.typeChipText, type === t && { color: '#fff' }]}>{t}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <Text style={styles.fieldLabel}>Solde initial (MRU)</Text>
              <TextInput
                style={styles.input}
                value={soldeInitial}
                onChangeText={setSoldeInitial}
                placeholder="0"
                placeholderTextColor={colors.textMuted}
                keyboardType="numeric"
              />
              <TouchableOpacity
                style={[styles.createBtn, saving && { opacity: 0.6 }]}
                onPress={handleCreate}
                disabled={saving}
              >
                {saving ? <ActivityIndicator color="#fff" /> : (
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

      {/* Modal virement */}
      <Modal visible={virementVisible} transparent animationType="slide" onRequestClose={() => setVirementVisible(false)}>
        <View style={styles.modalWrap}>
          <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => setVirementVisible(false)} />
          <View style={styles.sheet}>
            <View style={styles.sheetHeader}>
              <View style={styles.sheetTitleRow}>
                <Ionicons name="swap-horizontal-outline" size={20} color={colors.accent} />
                <Text style={styles.sheetTitle}>Virement entre comptes</Text>
              </View>
              <TouchableOpacity onPress={() => setVirementVisible(false)}>
                <Ionicons name="close" size={22} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <CompteSelector
                label="Compte source *"
                value={sourceId}
                onChange={setSourceId}
                exclude={destId}
              />

              {sourceCompte && (
                <View style={styles.soldeDisponible}>
                  <Text style={styles.soldeDisponibleText}>
                    Solde disponible : <Text style={{ color: colors.accent, fontWeight: '700' }}>{mru(sourceCompte.soldeActuel ?? 0)}</Text>
                  </Text>
                </View>
              )}

              <View style={styles.versRow}>
                <View style={styles.versLine} />
                <View style={styles.versIcon}>
                  <Ionicons name="arrow-down" size={16} color={colors.accent} />
                  <Text style={styles.versText}>vers</Text>
                </View>
                <View style={styles.versLine} />
              </View>

              <CompteSelector
                label="Compte destination *"
                value={destId}
                onChange={setDestId}
                exclude={sourceId}
              />

              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Montant (MRU) *</Text>
                <TextInput
                  style={styles.input}
                  value={montant}
                  onChangeText={setMontant}
                  placeholder="0.00"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="numeric"
                />
              </View>

              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Description (optionnel)</Text>
                <TextInput
                  style={styles.input}
                  value={description}
                  onChangeText={setDescription}
                  placeholder="Ex: Épargne mensuelle"
                  placeholderTextColor={colors.textMuted}
                />
              </View>

              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Date</Text>
                <TextInput
                  style={styles.input}
                  value={dateVirement}
                  onChangeText={setDateVirement}
                  placeholder="AAAA-MM-JJ"
                  placeholderTextColor={colors.textMuted}
                />
              </View>

              <TouchableOpacity
                style={[styles.createBtn, saving && { opacity: 0.6 }]}
                onPress={handleVirement}
                disabled={saving}
              >
                {saving ? <ActivityIndicator color="#fff" /> : (
                  <>
                    <Ionicons name="swap-horizontal-outline" size={20} color="#fff" />
                    <Text style={styles.createBtnText}>Effectuer le virement</Text>
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
  safe: { flex: 1, backgroundColor: colors.background },
  header: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: 22, fontWeight: '700', color: colors.text },
  headerBtns: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  virementBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: `${colors.accent}18`, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, borderWidth: 1, borderColor: `${colors.accent}44` },
  virementBtnText: { color: colors.accent, fontSize: 13, fontWeight: '600' },
  addBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: colors.accent, justifyContent: 'center', alignItems: 'center' },
  totalBanner: { marginHorizontal: 20, marginBottom: 16, backgroundColor: `${colors.accent}18`, borderWidth: 1, borderColor: `${colors.accent}40`, borderRadius: 14, padding: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  totalLabel: { fontSize: 13, color: colors.textMuted },
  totalValue: { fontSize: 18, fontWeight: '700', color: colors.text },
  list: { paddingHorizontal: 20, paddingBottom: 24 },
  card: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: 16, padding: 16, marginBottom: 12, gap: 14 },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconBox: { width: 46, height: 46, borderRadius: 14, backgroundColor: `${colors.accent}20`, justifyContent: 'center', alignItems: 'center' },
  cardInfo: { flex: 1 },
  cardNom: { fontSize: 15, fontWeight: '600', color: colors.text },
  cardType: { fontSize: 12, color: colors.textMuted, marginTop: 3 },
  cardBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.border },
  soldeLabel: { fontSize: 12, color: colors.textMuted },
  solde: { fontSize: 17, fontWeight: '700' },
  emptyBox: { alignItems: 'center', paddingTop: 60, gap: 12 },
  emptyText: { fontSize: 15, color: colors.textMuted },
  modalWrap: { flex: 1, justifyContent: 'flex-end' },
  overlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.55)' },
  sheet: { backgroundColor: '#0d1230', borderTopLeftRadius: 22, borderTopRightRadius: 22, padding: 20, maxHeight: '85%' },
  sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  sheetTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sheetTitle: { fontSize: 17, fontWeight: '600', color: colors.text },
  fieldGroup: { marginBottom: 16 },
  fieldLabel: { fontSize: 13, color: colors.textMuted, fontWeight: '500', marginBottom: 8, marginTop: 4 },
  input: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, color: colors.text, fontSize: 15 },
  typeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 4 },
  typeChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border },
  typeChipActive: { backgroundColor: colors.accent, borderColor: colors.accent },
  typeChipText: { fontSize: 12, color: colors.textMuted, fontWeight: '500' },
  compteChip: { flexDirection: 'column', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, gap: 4, minWidth: 120 },
  compteChipActive: { backgroundColor: colors.accent, borderColor: colors.accent },
  compteChipText: { fontSize: 13, color: colors.textMuted, fontWeight: '600' },
  compteChipSolde: { fontSize: 11, color: colors.textMuted },
  soldeDisponible: { backgroundColor: `${colors.accent}15`, borderRadius: 10, padding: 10, marginBottom: 8 },
  soldeDisponibleText: { fontSize: 13, color: colors.textMuted },
  versRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginVertical: 12 },
  versLine: { flex: 1, height: 1, backgroundColor: colors.border },
  versIcon: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: `${colors.accent}20`, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  versText: { fontSize: 13, color: colors.accent, fontWeight: '600' },
  createBtn: { backgroundColor: colors.accent, borderRadius: 14, paddingVertical: 16, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, marginTop: 8, marginBottom: 8 },
  createBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});