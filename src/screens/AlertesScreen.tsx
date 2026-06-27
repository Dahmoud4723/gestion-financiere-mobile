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

import { colors } from '../theme/colors';
import { alertesAPI } from '../services/api';
import type { Alerte } from '../types';

const TYPE_COLOR: Record<string, string> = {
  SOLDE_FAIBLE: colors.warning,
  TRANSACTION:  colors.accent,
  SYSTEME:      colors.textMuted,
};

export default function AlertesScreen() {
  const [alertes,    setAlertes]    = useState<Alerte[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await alertesAPI.getAll();
      setAlertes(res.data?.data ?? res.data ?? []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const marquerLue = async (id: number) => {
    try {
      await alertesAPI.marquerLue(id);
      setAlertes(prev => prev.map(a => a.id === id ? { ...a, lue: true } : a));
    } catch (e) {
      console.error(e);
    }
  };

  const nonLues = alertes.filter(a => !a.lue).length;

  const sorted = [...alertes].sort((a, b) => {
    if (!a.lue && b.lue)  return -1;
    if (a.lue  && !b.lue) return  1;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  const renderItem = ({ item }: { item: Alerte }) => {
    const tint = TYPE_COLOR[item.type] ?? colors.accent;
    return (
      <TouchableOpacity
        style={[styles.card, !item.lue && styles.cardUnread]}
        onPress={() => !item.lue && marquerLue(item.id)}
        activeOpacity={item.lue ? 1 : 0.75}
      >
        <View style={[styles.icon, { backgroundColor: `${tint}22` }]}>
          <Ionicons
            name={item.type === 'SOLDE_FAIBLE' ? 'warning-outline' : 'notifications-outline'}
            size={20}
            color={tint}
          />
        </View>
        <View style={styles.content}>
          <Text style={[styles.message, !item.lue && styles.messageUnread]}>
            {item.message}
          </Text>
          <View style={styles.meta}>
            <Text style={styles.date}>
              {new Date(item.createdAt).toLocaleDateString('fr-FR', {
                day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
              })}
            </Text>
            {!item.lue && <View style={styles.dot} />}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header avec badge */}
      <View style={styles.header}>
        <Text style={styles.title}>Alertes</Text>
        {nonLues > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{nonLues}</Text>
          </View>
        )}
      </View>

      {nonLues > 0 && (
        <Text style={styles.hint}>Touchez une alerte pour la marquer comme lue</Text>
      )}

      {loading ? (
        <ActivityIndicator size="large" color={colors.accent} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={sorted}
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
              <Ionicons name="checkmark-circle-outline" size={48} color={colors.success} />
              <Text style={styles.emptyText}>Aucune alerte</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 20, paddingTop: 16, paddingBottom: 6 },
  title:  { fontSize: 22, fontWeight: '700', color: colors.text },
  badge: {
    backgroundColor: colors.danger,
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
    minWidth: 24,
    alignItems: 'center',
  },
  badgeText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  hint:  { fontSize: 12, color: colors.textMuted, paddingHorizontal: 20, marginBottom: 10 },
  list:  { paddingHorizontal: 20, paddingBottom: 24 },
  card: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    gap: 12,
    alignItems: 'flex-start',
  },
  cardUnread: {
    borderColor: `${colors.accent}55`,
    backgroundColor: `${colors.accent}0A`,
  },
  icon:    { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginTop: 1 },
  content: { flex: 1 },
  message: { fontSize: 14, color: colors.textMuted, lineHeight: 20 },
  messageUnread: { color: colors.text, fontWeight: '500' },
  meta:    { flexDirection: 'row', alignItems: 'center', marginTop: 6, gap: 8 },
  date:    { fontSize: 12, color: colors.textMuted },
  dot:     { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.accent },
  emptyBox:  { alignItems: 'center', paddingTop: 60, gap: 12 },
  emptyText: { fontSize: 15, color: colors.textMuted },
});
