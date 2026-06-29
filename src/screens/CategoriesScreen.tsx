import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  RefreshControl, ActivityIndicator, ScrollView,
  Modal, TextInput, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { colors } from '../theme/colors';
import { categoriesAPI } from '../services/api';
import type { Categorie } from '../types';

export default function CategoriesScreen() {
  const navigation = useNavigation();
  const [categories, setCategories] = useState<Categorie[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form
  const [nom, setNom] = useState('');
  const [type, setType] = useState<'ENTREE' | 'DEPENSE'>('DEPENSE');

  const load = useCallback(async () => {
    try {
      const res = await categoriesAPI.getAll();
      setCategories(res.data?.data ?? res.data ?? []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const resetForm = () => { setNom(''); setType('DEPENSE'); };

  const handleCreate = async () => {
    if (!nom.trim()) { Alert.alert('Erreur', 'Le nom est requis.'); return; }
    setSaving(true);
    try {
      await categoriesAPI.create({ nom: nom.trim(), type });
      Alert.alert('Succès', 'Catégorie créée !');
      setModalVisible(false);
      resetForm();
      load();
    } catch (e: any) {
      Alert.alert('Erreur', e.response?.data?.message ?? 'Création échouée.');
    } finally {
      setSaving(false);
    }
  };

  const entrees = categories.filter(c => c.type === 'ENTREE');
  const depenses = categories.filter(c => c.type === 'DEPENSE');

  const renderSection = (
    label: string,
    list: Categorie[],
    tint: string,
    icon: keyof typeof Ionicons.glyphMap
  ) => (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <View style={[styles.sectionIcon, { backgroundColor: `${tint}22` }]}>
          <Ionicons name={icon} size={16} color={tint} />
        </View>
        <Text style={styles.sectionTitle}>{label}</Text>
        <View style={[styles.countBadge, { backgroundColor: `${tint}22` }]}>
          <Text style={[styles.countText, { color: tint }]}>{list.length}</Text>
        </View>
      </View>
      {list.map(cat => (
        <View key={cat.id} style={styles.row}>
          <View style={[styles.dot, { backgroundColor: tint }]} />
          <Text style={styles.catNom}>{cat.nom}</Text>
          <View style={[styles.typeBadge, { backgroundColor: `${tint}22` }]}>
            <Text style={[styles.typeText, { color: tint }]}>
              {cat.type === 'ENTREE' ? 'Entrée' : 'Dépense'}
            </Text>
          </View>
        </View>
      ))}
    </View>
  );

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back-outline" size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Catégories</Text>
        <View style={styles.totalBadge}>
          <Text style={styles.totalText}>{categories.length}</Text>
        </View>
        <TouchableOpacity style={styles.addBtn} onPress={() => setModalVisible(true)}>
          <Ionicons name="add" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={colors.accent} style={{ marginTop: 40 }} />
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scroll}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => { setRefreshing(true); load(); }}
              tintColor={colors.accent}
            />
          }
        >
          {categories.length === 0 ? (
            <View style={styles.emptyBox}>
              <Ionicons name="pricetag-outline" size={48} color={colors.textMuted} />
              <Text style={styles.emptyText}>Aucune catégorie</Text>
            </View>
          ) : (
            <>
              {entrees.length > 0 && renderSection('Entrées', entrees, colors.success, 'trending-up-outline')}
              {depenses.length > 0 && renderSection('Dépenses', depenses, colors.danger, 'trending-down-outline')}
            </>
          )}
        </ScrollView>
      )}

      {/* Modal création */}
      <Modal visible={modalVisible} transparent animationType="slide" onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalWrap}>
          <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => setModalVisible(false)} />
          <View style={styles.sheet}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Nouvelle catégorie</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={22} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            {/* Nom */}
            <Text style={styles.fieldLabel}>Nom *</Text>
            <TextInput
              style={styles.input}
              value={nom}
              onChangeText={setNom}
              placeholder="Ex: Alimentation"
              placeholderTextColor={colors.textMuted}
            />

            {/* Type */}
            <Text style={styles.fieldLabel}>Type *</Text>
            <View style={styles.typeRow}>
              <TouchableOpacity
                style={[styles.typeBtn, type === 'ENTREE' && styles.typeBtnActive]}
                onPress={() => setType('ENTREE')}
              >
                <Ionicons name="trending-up-outline" size={16} color={type === 'ENTREE' ? '#fff' : colors.textMuted} />
                <Text style={[styles.typeBtnText, type === 'ENTREE' && { color: '#fff' }]}>Entrée</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.typeBtn, type === 'DEPENSE' && styles.typeBtnDanger]}
                onPress={() => setType('DEPENSE')}
              >
                <Ionicons name="trending-down-outline" size={16} color={type === 'DEPENSE' ? '#fff' : colors.textMuted} />
                <Text style={[styles.typeBtnText, type === 'DEPENSE' && { color: '#fff' }]}>Dépense</Text>
              </TouchableOpacity>
            </View>

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
                  <Text style={styles.createBtnText}>Créer la catégorie</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12 },
  backBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: colors.card, justifyContent: 'center', alignItems: 'center' },
  title: { flex: 1, fontSize: 22, fontWeight: '700', color: colors.text },
  totalBadge: { backgroundColor: `${colors.accent}22`, paddingHorizontal: 10, paddingVertical: 3, borderRadius: 12 },
  totalText: { color: colors.accent, fontWeight: '700', fontSize: 13 },
  addBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: colors.accent, justifyContent: 'center', alignItems: 'center' },
  scroll: { paddingHorizontal: 20, paddingBottom: 32 },
  section: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: 16, padding: 16, marginBottom: 16 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  sectionIcon: { width: 32, height: 32, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  sectionTitle: { flex: 1, fontSize: 15, fontWeight: '600', color: colors.text },
  countBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  countText: { fontSize: 12, fontWeight: '700' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 11, borderTopWidth: 1, borderTopColor: colors.border },
  dot: { width: 8, height: 8, borderRadius: 4 },
  catNom: { flex: 1, fontSize: 14, color: colors.text, fontWeight: '500' },
  typeBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  typeText: { fontSize: 11, fontWeight: '600' },
  emptyBox: { alignItems: 'center', paddingTop: 60, gap: 12 },
  emptyText: { fontSize: 15, color: colors.textMuted },
  // Modal
  modalWrap: { flex: 1, justifyContent: 'flex-end' },
  overlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.55)' },
  sheet: { backgroundColor: '#0d1230', borderTopLeftRadius: 22, borderTopRightRadius: 22, padding: 20 },
  sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  sheetTitle: { fontSize: 17, fontWeight: '600', color: colors.text },
  fieldLabel: { fontSize: 13, color: colors.textMuted, fontWeight: '500', marginBottom: 8, marginTop: 16 },
  input: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, color: colors.text, fontSize: 15 },
  typeRow: { flexDirection: 'row', gap: 10 },
  typeBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 12, borderRadius: 12, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border },
  typeBtnActive: { backgroundColor: colors.success, borderColor: colors.success },
  typeBtnDanger: { backgroundColor: colors.danger, borderColor: colors.danger },
  typeBtnText: { fontSize: 14, fontWeight: '600', color: colors.textMuted },
  createBtn: { backgroundColor: colors.accent, borderRadius: 14, paddingVertical: 16, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, marginTop: 24, marginBottom: 8 },
  createBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});