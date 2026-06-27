import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
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

type Filter = 'TOUTES' | 'ENTREE' | 'SORTIE';

const FILTERS: { key: Filter; label: string }[] = [
  { key: 'TOUTES', label: 'Toutes'  },
  { key: 'ENTREE', label: 'Entrées' },
  { key: 'SORTIE', label: 'Sorties' },
];

function mru(n: number) {
  return `${n.toLocaleString('fr-FR', { maximumFractionDigits: 0 })} MRU`;
}

export default function TransactionsScreen() {
  const navigation = useNavigation<NavProp>();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [filter,       setFilter]       = useState<Filter>('TOUTES');
  const [loading,      setLoading]      = useState(true);
  const [refreshing,   setRefreshing]   = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await transactionsAPI.getAll();
      const data: Transaction[] = res.data?.data ?? res.data ?? [];
      setTransactions(
        data.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      );
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Rafraîchir au retour depuis NouvelleTransaction
  useEffect(() => {
    const unsub = navigation.addListener('focus', load);
    return unsub;
  }, [navigation, load]);

  const displayed = filter === 'TOUTES'
    ? transactions
    : transactions.filter(t => t.type === filter);

  const renderItem = ({ item }: { item: Transaction }) => {
    const isIn = item.type === 'ENTREE';
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
          <Text style={styles.desc} numberOfLines={1}>
            {item.description ?? item.categorie?.nom ?? 'Transaction'}
          </Text>
          <View style={styles.meta}>
            <Text style={styles.date}>{new Date(item.date).toLocaleDateString('fr-FR')}</Text>
            {item.compte      && <Text style={styles.metaChip}>{item.compte.nom}</Text>}
            {item.sourcePaiement && <Text style={[styles.metaChip, styles.source]}>{item.sourcePaiement}</Text>}
          </View>
        </View>
        <Text style={[styles.amt, { color: isIn ? colors.success : colors.danger }]}>
          {isIn ? '+' : '-'}{mru(item.montant)}
        </Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.title}>Transactions</Text>
        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => navigation.navigate('NouvelleTransaction')}
        >
          <Ionicons name="add" size={22} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Filtres */}
      <View style={styles.filterRow}>
        {FILTERS.map(f => (
          <TouchableOpacity
            key={f.key}
            style={[styles.filterBtn, filter === f.key && styles.filterBtnActive]}
            onPress={() => setFilter(f.key)}
          >
            <Text style={[styles.filterText, filter === f.key && styles.filterTextActive]}>
              {f.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={colors.accent} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={displayed}
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
              <Ionicons name="receipt-outline" size={46} color={colors.textMuted} />
              <Text style={styles.emptyText}>Aucune transaction</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12 },
  title:  { fontSize: 22, fontWeight: '700', color: colors.text },
  addBtn: { width: 38, height: 38, borderRadius: 12, backgroundColor: colors.accent, justifyContent: 'center', alignItems: 'center' },
  filterRow: { flexDirection: 'row', paddingHorizontal: 20, gap: 8, marginBottom: 12 },
  filterBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterBtnActive: { backgroundColor: colors.accent, borderColor: colors.accent },
  filterText:      { fontSize: 13, color: colors.textMuted, fontWeight: '500' },
  filterTextActive: { color: '#fff' },
  list: { paddingHorizontal: 20, paddingBottom: 24 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    gap: 12,
  },
  icon:   { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  info:   { flex: 1 },
  desc:   { fontSize: 14, color: colors.text, fontWeight: '500' },
  meta:   { flexDirection: 'row', flexWrap: 'wrap', marginTop: 4, gap: 6 },
  date:   { fontSize: 12, color: colors.textMuted },
  metaChip: { fontSize: 12, color: colors.textMuted },
  source: { color: colors.accent },
  amt:    { fontSize: 14, fontWeight: '700' },
  emptyBox:  { alignItems: 'center', paddingTop: 60, gap: 12 },
  emptyText: { fontSize: 15, color: colors.textMuted },
});
