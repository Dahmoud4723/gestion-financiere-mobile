import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, Modal, FlatList, Alert, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { colors } from '../theme/colors';
import { transactionsAPI, comptesAPI, categoriesAPI } from '../services/api';
import type { Compte, Categorie } from '../types';

const SOURCES = ['CASH', 'VIREMENT', 'BANKILY', 'MASRVI', 'SEDAD'] as const;

interface DropdownOption { label: string; value: string }
interface DropdownProps {
  label: string;
  value: string;
  options: DropdownOption[];
  placeholder?: string;
  onSelect: (v: string) => void;
}

function Dropdown({ label, value, options, placeholder = 'Sélectionner…', onSelect }: DropdownProps) {
  const [open, setOpen] = useState(false);
  const selected = options.find(o => o.value === value);

  return (
    <View style={dd.wrap}>
      <Text style={dd.label}>{label}</Text>
      <TouchableOpacity style={dd.trigger} onPress={() => setOpen(true)} activeOpacity={0.8}>
        <Text style={[dd.triggerText, !selected && dd.placeholder]}>
          {selected?.label ?? placeholder}
        </Text>
        <Ionicons name="chevron-down" size={15} color={colors.textMuted} />
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
        <View style={dd.modalWrap}>
          <TouchableOpacity style={dd.overlay} activeOpacity={1} onPress={() => setOpen(false)} />
          <View style={dd.sheet}>
            <View style={dd.sheetHeader}>
              <Text style={dd.sheetTitle}>{label}</Text>
              <TouchableOpacity onPress={() => setOpen(false)}>
                <Ionicons name="close" size={22} color={colors.textMuted} />
              </TouchableOpacity>
            </View>
            <FlatList
              data={options}
              keyExtractor={o => o.value}
              renderItem={({ item }) => {
                const active = item.value === value;
                return (
                  <TouchableOpacity
                    style={dd.option}
                    onPress={() => { onSelect(item.value); setOpen(false); }}
                  >
                    <Text style={[dd.optText, active && dd.optTextActive]}>{item.label}</Text>
                    {active && <Ionicons name="checkmark" size={18} color={colors.accent} />}
                  </TouchableOpacity>
                );
              }}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const dd = StyleSheet.create({
  wrap: { gap: 7, marginBottom: 16 },
  label: { fontSize: 13, color: colors.textMuted, fontWeight: '500' },
  trigger: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  triggerText: { fontSize: 15, color: colors.text },
  placeholder: { color: colors.textMuted },
  modalWrap: { flex: 1, justifyContent: 'flex-end' },
  overlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.55)' },
  sheet: {
    backgroundColor: '#0d1230',
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    padding: 20,
    maxHeight: '65%',
  },
  sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  sheetTitle: { fontSize: 17, fontWeight: '600', color: colors.text },
  option: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  optText: { fontSize: 15, color: colors.text },
  optTextActive: { color: colors.accent, fontWeight: '600' },
});

export default function NouvelleTransactionScreen() {
  const navigation = useNavigation<any>();

  const [comptes, setComptes] = useState<Compte[]>([]);
  const [categories, setCategories] = useState<Categorie[]>([]);
  const [initLoading, setInitLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [compteId, setCompteId] = useState('');
  const [categorieId, setCategorieId] = useState('');
  const [montant, setMontant] = useState('');
  const [type, setType] = useState<'ENTREE' | 'DEPENSE'>('ENTREE');
  const [source, setSource] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    (async () => {
      try {
        const [cRes, catRes] = await Promise.all([
          comptesAPI.getAll(),
          categoriesAPI.getAll().catch(() => ({ data: [] })),
        ]);
        setComptes(cRes.data?.data ?? cRes.data ?? []);
        setCategories(catRes.data?.data ?? catRes.data ?? []);
      } catch (e) {
        console.error(e);
      } finally {
        setInitLoading(false);
      }
    })();
  }, []);

  const switchType = (t: 'ENTREE' | 'DEPENSE') => {
    setType(t);
    setCategorieId('');
  };

  const handleCreate = async () => {
    const amt = parseFloat(montant);
    if (!compteId) { Alert.alert('Erreur', 'Choisissez un compte.'); return; }
    if (!montant || isNaN(amt) || amt <= 0) { Alert.alert('Erreur', 'Montant invalide.'); return; }
    if (!source) { Alert.alert('Erreur', 'Choisissez une source de paiement.'); return; }

    setSaving(true);
    try {
      await transactionsAPI.create({
        compteId,
        ...(categorieId && { categorieId }),
        montant: amt,
        type,
        sourcePaiement: source,
        description: description.trim() || undefined,
        date,
      });
      Alert.alert('Succès', 'Transaction créée !', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (e: any) {
      Alert.alert('Erreur', e.response?.data?.message ?? 'Création échouée.');
    } finally {
      setSaving(false);
    }
  };

  if (initLoading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  const compteOptions = comptes.map(c => ({
    label: `${c.nom}  (${(c.soldeActuel ?? 0).toLocaleString('fr-FR')} MRU)`,
    value: c.id,
  }));
  const catOptions = categories.filter(c => c.type === type).map(c => ({ label: c.nom, value: c.id }));
  const sourceOptions = SOURCES.map(s => ({ label: s, value: s }));

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Nouvelle transaction</Text>
        <View style={{ width: 38 }} />
      </View>

      <ScrollView contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled">
        {/* Toggle ENTREE / DEPENSE */}
        <View style={styles.typeRow}>
          <TouchableOpacity
            style={[styles.typeBtn, type === 'ENTREE' && styles.typeBtnIn]}
            onPress={() => switchType('ENTREE')}
          >
            <Ionicons name="arrow-down" size={15} color={type === 'ENTREE' ? '#fff' : colors.textMuted} />
            <Text style={[styles.typeBtnTxt, type === 'ENTREE' && { color: '#fff' }]}>Entrée</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.typeBtn, type === 'DEPENSE' && styles.typeBtnOut]}
            onPress={() => switchType('DEPENSE')}
          >
            <Ionicons name="arrow-up" size={15} color={type === 'DEPENSE' ? '#fff' : colors.textMuted} />
            <Text style={[styles.typeBtnTxt, type === 'DEPENSE' && { color: '#fff' }]}>Dépense</Text>
          </TouchableOpacity>
        </View>

        {/* Montant */}
        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>Montant (MRU) *</Text>
          <TextInput
            style={styles.input}
            value={montant}
            onChangeText={setMontant}
            placeholder="0"
            placeholderTextColor={colors.textMuted}
            keyboardType="numeric"
          />
        </View>

        <Dropdown label="Compte *" value={compteId} options={compteOptions} onSelect={setCompteId} placeholder="Choisir un compte…" />
        {catOptions.length > 0 && (
          <Dropdown label="Catégorie" value={categorieId} options={catOptions} onSelect={setCategorieId} placeholder="Choisir une catégorie…" />
        )}
        <Dropdown label="Source de paiement *" value={source} options={sourceOptions} onSelect={setSource} placeholder="Choisir la source…" />

        {/* Description */}
        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>Description</Text>
          <TextInput
            style={[styles.input, { height: 80, textAlignVertical: 'top' }]}
            value={description}
            onChangeText={setDescription}
            placeholder="Ajouter une note…"
            placeholderTextColor={colors.textMuted}
            multiline
          />
        </View>

        {/* Date */}
        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>Date (AAAA-MM-JJ)</Text>
          <TextInput
            style={styles.input}
            value={date}
            onChangeText={setDate}
            placeholder="2026-01-01"
            placeholderTextColor={colors.textMuted}
          />
        </View>

        <TouchableOpacity
          style={[styles.createBtn, saving && { opacity: 0.6 }]}
          onPress={handleCreate}
          disabled={saving}
          activeOpacity={0.85}
        >
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="checkmark-circle-outline" size={20} color="#fff" />
              <Text style={styles.createBtnText}>Créer la transaction</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  loader: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
  },
  backBtn: { padding: 4 },
  title: { fontSize: 18, fontWeight: '700', color: colors.text },
  form: { paddingHorizontal: 20, paddingBottom: 48 },
  typeRow: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    padding: 4,
    gap: 6,
    marginBottom: 20,
  },
  typeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
  },
  typeBtnIn: { backgroundColor: colors.success },
  typeBtnOut: { backgroundColor: colors.danger },
  typeBtnTxt: { fontSize: 14, fontWeight: '600', color: colors.textMuted },
  fieldGroup: { gap: 7, marginBottom: 16 },
  fieldLabel: { fontSize: 13, color: colors.textMuted, fontWeight: '500' },
  input: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: colors.text,
    fontSize: 15,
  },
  createBtn: {
    backgroundColor: colors.accent,
    borderRadius: 14,
    paddingVertical: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  createBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});