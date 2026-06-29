import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity,
  RefreshControl, ActivityIndicator, Modal, ScrollView,
  Alert, TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Svg, { Circle, Text as SvgText } from 'react-native-svg';

import { colors } from '../theme/colors';
import { budgetsAPI, categoriesAPI } from '../services/api';
import type { Budget, Categorie } from '../types';
import type { BudgetsStackParamList } from '../navigation/AppNavigator';

type NavProp = NativeStackNavigationProp<BudgetsStackParamList, 'BudgetsList'>;

function mru(n: number) {
  return `${n.toLocaleString('fr-FR', { maximumFractionDigits: 0 })} MRU`;
}

function barColor(pct: number): string {
  if (pct >= 100) return colors.danger;
  if (pct >= 80) return colors.warning;
  return colors.success;
}

function DonutChart({ budgets }: { budgets: Budget[] }) {
  const total = budgets.reduce((s, b) => s + b.montantLimite, 0);
  if (total === 0) return null;

  const size = 140;
  const cx = size / 2;
  const cy = size / 2;
  const r = 50;
  const stroke = 18;
  const circumference = 2 * Math.PI * r;

  let offset = 0;
  const segments = budgets.map((b) => {
    const pct = b.montantLimite / total;
    const dash = pct * circumference;
    const color = barColor(
      b.montantLimite > 0 ? Math.round((b.montantDepense / b.montantLimite) * 100) : 0
    );
    const seg = { offset, dash, color };
    offset += dash;
    return seg;
  });

  const totalDepense = budgets.reduce((s, b) => s + b.montantDepense, 0);
  const totalLimite = budgets.reduce((s, b) => s + b.montantLimite, 0);
  const globalPct = totalLimite > 0 ? Math.round((totalDepense / totalLimite) * 100) : 0;

  return (
    <View style={chart.wrap}>
      <Text style={chart.title}>Vue d'ensemble</Text>
      <View style={chart.row}>
        <Svg width={size} height={size}>
          <Circle cx={cx} cy={cy} r={r} fill="none" stroke={colors.border} strokeWidth={stroke} />
          {segments.map((seg, i) => (
            <Circle
              key={i}
              cx={cx} cy={cy} r={r}
              fill="none"
              stroke={seg.color}
              strokeWidth={stroke}
              strokeDasharray={`${seg.dash} ${circumference - seg.dash}`}
              strokeDashoffset={-seg.offset + circumference / 4}
              strokeLinecap="round"
            />
          ))}
          <SvgText x={cx} y={cy - 6} textAnchor="middle" fill={colors.text} fontSize="16" fontWeight="bold">
            {globalPct}%
          </SvgText>
          <SvgText x={cx} y={cy + 12} textAnchor="middle" fill={colors.textMuted} fontSize="9">
            utilisé
          </SvgText>
        </Svg>

        <View style={chart.legend}>
          {budgets.slice(0, 5).map((b, i) => {
            const pct = b.montantLimite > 0
              ? Math.round((b.montantDepense / b.montantLimite) * 100) : 0;
            const tint = barColor(pct);
            return (
              <View key={i} style={chart.legendRow}>
                <View style={[chart.dot, { backgroundColor: tint }]} />
                <Text style={chart.legendNom} numberOfLines={1}>{b.categorieNom ?? 'Cat.'}</Text>
                <Text style={[chart.legendPct, { color: tint }]}>{pct}%</Text>
              </View>
            );
          })}
        </View>
      </View>

      <View style={chart.totals}>
        <View style={chart.totalItem}>
          <Text style={chart.totalLabel}>Dépensé</Text>
          <Text style={[chart.totalValue, { color: colors.danger }]}>{mru(totalDepense)}</Text>
        </View>
        <View style={chart.totalItem}>
          <Text style={chart.totalLabel}>Budget</Text>
          <Text style={chart.totalValue}>{mru(totalLimite)}</Text>
        </View>
        <View style={chart.totalItem}>
          <Text style={chart.totalLabel}>Restant</Text>
          <Text style={[chart.totalValue, { color: colors.success }]}>
            {mru(Math.max(0, totalLimite - totalDepense))}
          </Text>
        </View>
      </View>
    </View>
  );
}

export default function BudgetsScreen() {
  const navigation = useNavigation<NavProp>();
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [categories, setCategories] = useState<Categorie[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [saving, setSaving] = useState(false);

  const [categorieId, setCategorieId] = useState('');
  const [montantLimite, setMontantLimite] = useState('');
  const [dateDebut, setDateDebut] = useState(
    new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]
  );
  const [dateFin, setDateFin] = useState(
    new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString().split('T')[0]
  );

  const load = useCallback(async () => {
    try {
      const [bRes, cRes] = await Promise.all([
        budgetsAPI.getAll(),
        categoriesAPI.getAll(),
      ]);
      setBudgets(bRes.data?.data ?? bRes.data ?? []);
      setCategories(cRes.data?.data ?? cRes.data ?? []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleCreate = async () => {
    if (!categorieId) { Alert.alert('Erreur', 'Choisissez une catégorie.'); return; }
    const montant = parseFloat(montantLimite);
    if (!montantLimite || isNaN(montant) || montant <= 0) {
      Alert.alert('Erreur', 'Montant invalide.');
      return;
    }

    setSaving(true);
    try {
      await budgetsAPI.create({ categorieId, montantLimite: montant, dateDebut, dateFin });
      Alert.alert('Succès', 'Budget créé !');
      setModalVisible(false);
      setCategorieId('');
      setMontantLimite('');
      load();
    } catch (e: any) {
      Alert.alert('Erreur', e.response?.data?.message ?? 'Création échouée.');
    } finally {
      setSaving(false);
    }
  };

  const catOptions = categories.filter(c => c.type === 'DEPENSE');

  const renderItem = ({ item }: { item: Budget }) => {
    const pct = item.montantLimite > 0
      ? Math.min(100, Math.round((item.montantDepense / item.montantLimite) * 100))
      : 0;
    const tint = barColor(pct);
    const restant = Math.max(0, item.montantLimite - item.montantDepense);

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={[styles.catIcon, { backgroundColor: `${tint}22` }]}>
            <Ionicons name="pie-chart-outline" size={18} color={tint} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.catNom} numberOfLines={1}>
              {item.categorieNom ?? 'Catégorie'}
            </Text>
            <Text style={styles.dates}>
              {new Date(item.dateDebut).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}
              {' → '}
              {new Date(item.dateFin).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}
            </Text>
          </View>
          <View style={[styles.pctBadge, { backgroundColor: `${tint}22` }]}>
            <Text style={[styles.pctText, { color: tint }]}>{pct}%</Text>
          </View>
        </View>

        <View style={styles.barBg}>
          <View style={[styles.barFill, { width: `${pct}%` as any, backgroundColor: tint }]} />
        </View>

        <View style={styles.amounts}>
          <View style={styles.amtBlock}>
            <Text style={styles.amtLabel}>Dépensé</Text>
            <Text style={[styles.amtValue, { color: tint }]}>{mru(item.montantDepense)}</Text>
          </View>
          <View style={[styles.amtBlock, { alignItems: 'center' }]}>
            <Text style={styles.amtLabel}>Limite</Text>
            <Text style={styles.amtValue}>{mru(item.montantLimite)}</Text>
          </View>
          <View style={[styles.amtBlock, { alignItems: 'flex-end' }]}>
            <Text style={styles.amtLabel}>Restant</Text>
            <Text style={[styles.amtValue, { color: restant > 0 ? colors.success : colors.danger }]}>
              {mru(restant)}
            </Text>
          </View>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.title}>Budgets</Text>
        <View style={styles.headerBtns}>
          <TouchableOpacity style={styles.catBtn} onPress={() => navigation.navigate('CategoriesList')}>
            <Ionicons name="pricetag-outline" size={16} color={colors.accent} />
            <Text style={styles.catBtnText}>Catégories</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.addBtn} onPress={() => setModalVisible(true)}>
            <Ionicons name="add" size={22} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={colors.accent} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={budgets}
          keyExtractor={item => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          ListHeaderComponent={budgets.length > 0 ? <DonutChart budgets={budgets} /> : null}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => { setRefreshing(true); load(); }}
              tintColor={colors.accent}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <Ionicons name="pie-chart-outline" size={48} color={colors.textMuted} />
              <Text style={styles.emptyText}>Aucun budget défini</Text>
              <TouchableOpacity style={styles.emptyBtn} onPress={() => setModalVisible(true)}>
                <Text style={styles.emptyBtnText}>Créer un budget</Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}

      {/* Modal création budget */}
      <Modal visible={modalVisible} transparent animationType="slide" onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalWrap}>
          <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => setModalVisible(false)} />
          <View style={styles.sheet}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Nouveau budget</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={22} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.fieldLabel}>Catégorie *</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  {catOptions.map(c => (
                    <TouchableOpacity
                      key={c.id}
                      style={[styles.catChip, categorieId === c.id && styles.catChipActive]}
                      onPress={() => setCategorieId(c.id)}
                    >
                      <Text style={[styles.catChipText, categorieId === c.id && { color: '#fff' }]}>
                        {c.nom}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>

              <Text style={styles.fieldLabel}>Montant limite (MRU) *</Text>
              <TextInput
                style={styles.input}
                value={montantLimite}
                onChangeText={setMontantLimite}
                placeholder="Ex: 15000"
                placeholderTextColor={colors.textMuted}
                keyboardType="numeric"
              />

              <Text style={styles.fieldLabel}>Date début</Text>
              <TextInput
                style={styles.input}
                value={dateDebut}
                onChangeText={setDateDebut}
                placeholder="AAAA-MM-JJ"
                placeholderTextColor={colors.textMuted}
              />

              <Text style={styles.fieldLabel}>Date fin</Text>
              <TextInput
                style={styles.input}
                value={dateFin}
                onChangeText={setDateFin}
                placeholder="AAAA-MM-JJ"
                placeholderTextColor={colors.textMuted}
              />

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
                    <Text style={styles.createBtnText}>Créer le budget</Text>
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

const chart = StyleSheet.create({
  wrap: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: 16, padding: 16, marginBottom: 16 },
  title: { fontSize: 15, fontWeight: '600', color: colors.text, marginBottom: 12 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 12 },
  legend: { flex: 1, gap: 8 },
  legendRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  legendNom: { flex: 1, fontSize: 12, color: colors.text },
  legendPct: { fontSize: 12, fontWeight: '700' },
  totals: { flexDirection: 'row', justifyContent: 'space-between', paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.border },
  totalItem: { alignItems: 'center', gap: 2 },
  totalLabel: { fontSize: 11, color: colors.textMuted },
  totalValue: { fontSize: 13, fontWeight: '700', color: colors.text },
});

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12 },
  title: { fontSize: 22, fontWeight: '700', color: colors.text },
  headerBtns: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  catBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: `${colors.accent}18`, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, borderWidth: 1, borderColor: `${colors.accent}44` },
  catBtnText: { color: colors.accent, fontSize: 13, fontWeight: '600' },
  addBtn: { width: 38, height: 38, borderRadius: 12, backgroundColor: colors.accent, justifyContent: 'center', alignItems: 'center' },
  list: { paddingHorizontal: 20, paddingBottom: 24 },
  card: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: 16, padding: 16, marginBottom: 14, gap: 12 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  catIcon: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  catNom: { fontSize: 15, fontWeight: '600', color: colors.text },
  dates: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  pctBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  pctText: { fontSize: 13, fontWeight: '700' },
  barBg: { height: 8, backgroundColor: colors.border, borderRadius: 4, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 4 },
  amounts: { flexDirection: 'row', justifyContent: 'space-between' },
  amtBlock: { gap: 2 },
  amtLabel: { fontSize: 11, color: colors.textMuted },
  amtValue: { fontSize: 13, fontWeight: '600', color: colors.text },
  emptyBox: { alignItems: 'center', paddingTop: 60, gap: 12 },
  emptyText: { fontSize: 15, color: colors.textMuted },
  emptyBtn: { backgroundColor: colors.accent, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 12, marginTop: 8 },
  emptyBtnText: { color: '#fff', fontWeight: '600' },
  modalWrap: { flex: 1, justifyContent: 'flex-end' },
  overlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.55)' },
  sheet: { backgroundColor: '#0d1230', borderTopLeftRadius: 22, borderTopRightRadius: 22, padding: 20, maxHeight: '80%' },
  sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  sheetTitle: { fontSize: 17, fontWeight: '600', color: colors.text },
  fieldLabel: { fontSize: 13, color: colors.textMuted, fontWeight: '500', marginBottom: 8, marginTop: 12 },
  input: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, color: colors.text, fontSize: 15, marginBottom: 4 },
  catChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border },
  catChipActive: { backgroundColor: colors.accent, borderColor: colors.accent },
  catChipText: { fontSize: 13, color: colors.textMuted, fontWeight: '500' },
  createBtn: { backgroundColor: colors.accent, borderRadius: 14, paddingVertical: 16, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, marginTop: 20, marginBottom: 8 },
  createBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});