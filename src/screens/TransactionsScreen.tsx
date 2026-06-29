import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity,
  RefreshControl, ActivityIndicator, ScrollView, Alert, TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { colors } from '../theme/colors';
import { transactionsAPI } from '../services/api';
import type { Transaction } from '../types';
import type { TransactionsStackParamList } from '../navigation/AppNavigator';

type NavProp = NativeStackNavigationProp<TransactionsStackParamList, 'TransactionsList'>;
type TypeFilter = 'TOUTES' | 'ENTREE' | 'DEPENSE';

const TYPE_FILTERS: { key: TypeFilter; label: string }[] = [
  { key: 'TOUTES', label: 'Toutes' },
  { key: 'ENTREE', label: 'Entrées' },
  { key: 'DEPENSE', label: 'Dépenses' },
];

const MONTHS = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];

function mru(n: number) {
  return `${n.toLocaleString('fr-FR', { maximumFractionDigits: 0 })} MRU`;
}

function getRecentMonths(count: number) {
  const now = new Date();
  return Array.from({ length: count }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (count - 1 - i), 1);
    return { label: `${MONTHS[d.getMonth()]} ${d.getFullYear()}`, month: d.getMonth(), year: d.getFullYear() };
  });
}

const isDepense = (t: Transaction) => t.type === 'DEPENSE' || t.type === 'SORTIE';

export default function TransactionsScreen() {
  const navigation = useNavigation<NavProp>();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('TOUTES');
  const [monthIdx, setMonthIdx] = useState<number | null>(null);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  const months = getRecentMonths(6);

  const load = useCallback(async () => {
    try {
      const res = await transactionsAPI.getAll();
      const data: Transaction[] = res.data?.data ?? res.data ?? [];
      setTransactions(
        [...data].sort((a, b) =>
          new Date(b.dateTransaction).getTime() - new Date(a.dateTransaction).getTime()
        )
      );
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const unsub = navigation.addListener('focus', load);
    return unsub;
  }, [navigation, load]);

  const handleDelete = (id: string, desc: string) => {
    Alert.alert(
      'Supprimer',
      `Supprimer "${desc}" ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            setDeleting(id);
            try {
              await transactionsAPI.delete(id);
              setTransactions(prev => prev.filter(t => t.id !== id));
            } catch {
              Alert.alert('Erreur', 'Impossible de supprimer cette transaction.');
            } finally {
              setDeleting(null);
            }
          },
        },
      ]
    );
  };

  const displayed = transactions.filter(t => {
    if (typeFilter === 'ENTREE' && t.type !== 'ENTREE') return false;
    if (typeFilter === 'DEPENSE' && !isDepense(t)) return false;
    if (monthIdx !== null) {
      const d = new Date(t.dateTransaction);
      const m = months[monthIdx];
      if (d.getMonth() !== m.month || d.getFullYear() !== m.year) return false;
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      const desc = (t.description ?? '').toLowerCase();
      const cat = (t.categorieNom ?? '').toLowerCase();
      const cpt = (t.compteNom ?? '').toLowerCase();
      const src = (t.sourcePaiement ?? '').toLowerCase();
      if (!desc.includes(q) && !cat.includes(q) && !cpt.includes(q) && !src.includes(q)) return false;
    }
    return true;
  });

  const renderItem = ({ item }: { item: Transaction }) => {
    const isIn = item.type === 'ENTREE';
    const desc = item.description ?? item.categorieNom ?? 'Transaction';
    return (
      <View style={styles.card}>
        <View style={[styles.icon, { backgroundColor: `${isIn ? colors.success : colors.danger}22` }]}>
          <Ionicons
            name={isIn ? 'arrow-down-outline' : 'arrow-up-outline'}
            size={18}
            color={isIn ? colors.success : colors.danger}
          />
        </View>
        <View style={styles.info}>
          <Text style={styles.desc} numberOfLines={1}>{desc}</Text>
          <View style={styles.meta}>
            <Text style={styles.date}>
              {new Date(item.dateTransaction).toLocaleDateString('fr-FR')}
            </Text>
            {item.compteNom && <Text style={styles.chip}>{item.compteNom}</Text>}
            {item.sourcePaiement && (
              <Text style={[styles.chip, styles.chipAccent]}>{item.sourcePaiement}</Text>
            )}
          </View>
        </View>
        <View style={styles.right}>
          <Text style={[styles.amt, { color: isIn ? colors.success : colors.danger }]}>
            {isIn ? '+' : '−'}{mru(item.montant)}
          </Text>
          <TouchableOpacity
            onPress={() => handleDelete(item.id, desc)}
            disabled={deleting === item.id}
            style={styles.deleteBtn}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            {deleting === item.id
              ? <ActivityIndicator size={14} color={colors.danger} />
              : <Ionicons name="trash-outline" size={16} color={colors.danger} />
            }
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Transactions</Text>
        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => navigation.navigate('NouvelleTransaction')}
        >
          <Ionicons name="add" size={22} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Barre de recherche */}
      <View style={styles.searchBox}>
        <Ionicons name="search-outline" size={18} color={colors.textMuted} />
        <TextInput
          style={styles.searchInput}
          value={search}
          onChangeText={setSearch}
          placeholder="Rechercher une transaction..."
          placeholderTextColor={colors.textMuted}
          clearButtonMode="while-editing"
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')}>
            <Ionicons name="close-circle" size={18} color={colors.textMuted} />
          </TouchableOpacity>
        )}
      </View>

      {/* Filtre type */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterRow}>
        {TYPE_FILTERS.map(f => (
          <TouchableOpacity
            key={f.key}
            style={[styles.filterChip, typeFilter === f.key && styles.filterChipActive]}
            onPress={() => setTypeFilter(f.key)}
          >
            <Text style={[styles.filterText, typeFilter === f.key && styles.filterTextActive]}>
              {f.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Filtre mois */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterRow}>
        <TouchableOpacity
          style={[styles.filterChip, monthIdx === null && styles.filterChipActive]}
          onPress={() => setMonthIdx(null)}
        >
          <Text style={[styles.filterText, monthIdx === null && styles.filterTextActive]}>
            Tous
          </Text>
        </TouchableOpacity>
        {months.map((m, i) => (
          <TouchableOpacity
            key={i}
            style={[styles.filterChip, monthIdx === i && styles.filterChipActive]}
            onPress={() => setMonthIdx(monthIdx === i ? null : i)}
          >
            <Text style={[styles.filterText, monthIdx === i && styles.filterTextActive]}>
              {m.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Résultats */}
      {search.trim() && (
        <Text style={styles.resultCount}>
          {displayed.length} résultat{displayed.length !== 1 ? 's' : ''}
        </Text>
      )}

      {loading ? (
        <ActivityIndicator size="large" color={colors.accent} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={displayed}
          keyExtractor={item => item.id}
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
              <Ionicons name="receipt-outline" size={46} color={colors.textMuted} />
              <Text style={styles.emptyText}>
                {search.trim() ? 'Aucun résultat trouvé' : 'Aucune transaction'}
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12 },
  title: { fontSize: 22, fontWeight: '700', color: colors.text },
  addBtn: { width: 38, height: 38, borderRadius: 12, backgroundColor: colors.accent, justifyContent: 'center', alignItems: 'center' },
  searchBox: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    marginHorizontal: 20, marginBottom: 10,
    backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border,
    borderRadius: 12, paddingHorizontal: 14, paddingVertical: 11,
  },
  searchInput: { flex: 1, fontSize: 14, color: colors.text },
  resultCount: { fontSize: 12, color: colors.textMuted, paddingHorizontal: 20, marginBottom: 4 },
  filterRow: { paddingHorizontal: 20, gap: 8, paddingBottom: 8 },
  filterChip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border },
  filterChipActive: { backgroundColor: colors.accent, borderColor: colors.accent },
  filterText: { fontSize: 13, color: colors.textMuted, fontWeight: '500' },
  filterTextActive: { color: '#fff' },
  list: { paddingHorizontal: 20, paddingTop: 4, paddingBottom: 24 },
  card: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border,
    borderRadius: 14, padding: 14, marginBottom: 10, gap: 12,
  },
  icon: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  info: { flex: 1 },
  desc: { fontSize: 14, color: colors.text, fontWeight: '500' },
  meta: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 4, gap: 6, alignItems: 'center' },
  date: { fontSize: 12, color: colors.textMuted },
  chip: { fontSize: 11, color: colors.textMuted, backgroundColor: colors.border, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  chipAccent: { color: colors.accent },
  right: { alignItems: 'flex-end', gap: 6 },
  amt: { fontSize: 14, fontWeight: '700' },
  deleteBtn: { padding: 2 },
  emptyBox: { alignItems: 'center', paddingTop: 60, gap: 12 },
  emptyText: { fontSize: 15, color: colors.textMuted },
});