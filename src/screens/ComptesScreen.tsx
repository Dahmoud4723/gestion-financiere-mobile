import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
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
};

function mru(n: number) {
  return `${n.toLocaleString('fr-FR', { maximumFractionDigits: 0 })} MRU`;
}

export default function ComptesScreen() {
  const [comptes,    setComptes]    = useState<Compte[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);

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

  const total = comptes.reduce((s, c) => s + (c.solde ?? 0), 0);

  const renderItem = ({ item }: { item: Compte }) => {
    const soldePos = (item.solde ?? 0) >= 0;
    return (
      <View style={styles.card}>
        {/* Ligne nom + icône type */}
        <View style={styles.cardTop}>
          <View style={styles.iconBox}>
            <Ionicons
              name={TYPE_ICONS[item.type] ?? 'wallet-outline'}
              size={22}
              color={colors.accent}
            />
          </View>
          <View style={styles.cardInfo}>
            <Text style={styles.cardNom}>{item.nom}</Text>
            <Text style={styles.cardType}>{item.type}</Text>
          </View>
        </View>
        {/* Ligne solde */}
        <View style={styles.cardBottom}>
          <Text style={styles.soldeLabel}>Solde</Text>
          <Text style={[styles.solde, { color: soldePos ? colors.success : colors.danger }]}>
            {mru(item.solde ?? 0)}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.title}>Comptes</Text>
      </View>

      {/* Bannière total */}
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: colors.background },
  header: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12 },
  title:  { fontSize: 22, fontWeight: '700', color: colors.text },
  totalBanner: {
    marginHorizontal: 20,
    marginBottom: 16,
    backgroundColor: `${colors.accent}18`,
    borderWidth: 1,
    borderColor: `${colors.accent}40`,
    borderRadius: 14,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalLabel: { fontSize: 13, color: colors.textMuted },
  totalValue: { fontSize: 18, fontWeight: '700', color: colors.text },
  list: { paddingHorizontal: 20, paddingBottom: 24 },
  card: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    gap: 14,
  },
  cardTop:    { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconBox: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: `${colors.accent}20`,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardInfo: { flex: 1 },
  cardNom:  { fontSize: 15, fontWeight: '600', color: colors.text },
  cardType: { fontSize: 12, color: colors.textMuted, marginTop: 3 },
  cardBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  soldeLabel: { fontSize: 12, color: colors.textMuted },
  solde:      { fontSize: 17, fontWeight: '700' },
  emptyBox:   { alignItems: 'center', paddingTop: 60, gap: 12 },
  emptyText:  { fontSize: 15, color: colors.textMuted },
});
