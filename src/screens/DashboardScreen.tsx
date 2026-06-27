import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet, RefreshControl,
  TouchableOpacity, Dimensions, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LineChart } from 'react-native-chart-kit';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { comptesAPI, transactionsAPI, alertesAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import type { Compte, Transaction, Alerte } from '../types';

const { width } = Dimensions.get('window');
const MONTHS = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];

function mru(n: number) {
  return `${n.toLocaleString('fr-FR', { maximumFractionDigits: 0 })} MRU`;
}

interface StatCardProps {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  tint?: string;
}
function StatCard({ icon, label, value, tint = colors.accent }: StatCardProps) {
  return (
    <View style={styles.statCard}>
      <View style={[styles.statIconBox, { backgroundColor: `${tint}22` }]}>
        <Ionicons name={icon} size={20} color={tint} />
      </View>
      <Text style={styles.statValue} numberOfLines={1}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

export default function DashboardScreen() {
  const { signOut } = useAuth();
  const [comptes, setComptes] = useState<Compte[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [alertes, setAlertes] = useState<Alerte[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const [cRes, tRes, aRes] = await Promise.all([
        comptesAPI.getAll(),
        transactionsAPI.getAll(),
        alertesAPI.getAll(),
      ]);
      const unwrap = (r: any) => r.data?.data ?? r.data ?? [];
      setComptes(unwrap(cRes));
      setTransactions(unwrap(tRes));
      setAlertes(unwrap(aRes));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const now = new Date();
  const thisM = now.getMonth();
  const thisY = now.getFullYear();

  const totalSolde = comptes.reduce((s, c) => s + (c.soldeActuel ?? 0), 0);

  const revenusMois = transactions
    .filter(t => {
      const d = new Date(t.dateTransaction);
      return t.type === 'ENTREE' && d.getMonth() === thisM && d.getFullYear() === thisY;
    })
    .reduce((s, t) => s + t.montant, 0);

  const depensesMois = transactions
    .filter(t => {
      const d = new Date(t.dateTransaction);
      return t.type === 'DEPENSE' && d.getMonth() === thisM && d.getFullYear() === thisY;
    })
    .reduce((s, t) => s + t.montant, 0);

  const alertesNonLues = alertes.filter(a => !a.lue).length;

  const derniers = [...transactions]
    .sort((a, b) => new Date(b.dateTransaction).getTime() - new Date(a.dateTransaction).getTime())
    .slice(0, 5);

  const chartLabels: string[] = [];
  const chartData: number[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(thisY, thisM - i, 1);
    chartLabels.push(MONTHS[d.getMonth()]);
    const net = transactions
      .filter(t => {
        const td = new Date(t.dateTransaction);
        return td.getMonth() === d.getMonth() && td.getFullYear() === d.getFullYear();
      })
      .reduce((s, t) => s + (t.type === 'ENTREE' ? t.montant : -t.montant), 0);
    chartData.push(Math.max(0, net));
  }
  const safeChart = chartData.every(v => v === 0) ? [1, 1, 1, 1, 1, 1] : chartData;

  if (loading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); load(); }}
            tintColor={colors.accent}
          />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.headerTitle}>Tableau de bord</Text>
            <Text style={styles.headerSub}>
              {now.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}
            </Text>
          </View>
          <TouchableOpacity onPress={signOut} style={styles.logoutBtn}>
            <Ionicons name="log-out-outline" size={22} color={colors.textMuted} />
          </TouchableOpacity>
        </View>

        {/* Stat cards */}
        <View style={styles.grid}>
          <StatCard icon="wallet-outline" label="Total comptes" value={mru(totalSolde)} />
          <StatCard icon="trending-up-outline" label="Revenus" value={mru(revenusMois)} tint={colors.success} />
          <StatCard icon="trending-down-outline" label="Dépenses" value={mru(depensesMois)} tint={colors.danger} />
          <StatCard
            icon="notifications-outline"
            label="Alertes"
            value={alertesNonLues.toString()}
            tint={alertesNonLues > 0 ? colors.warning : colors.success}
          />
        </View>

        {/* Chart */}
        <View style={styles.chartCard}>
          <Text style={styles.sectionTitle}>Évolution solde net (6 mois)</Text>
          <LineChart
            data={{ labels: chartLabels, datasets: [{ data: safeChart }] }}
            width={width - 48}
            height={180}
            chartConfig={{
              backgroundColor: 'transparent',
              backgroundGradientFrom: 'rgba(82,113,255,0.08)',
              backgroundGradientTo: 'transparent',
              decimalPlaces: 0,
              color: (o = 1) => `rgba(82,113,255,${o})`,
              labelColor: (o = 1) => `rgba(255,255,255,${o * 0.55})`,
              propsForDots: { r: '4', strokeWidth: '2', stroke: colors.accent },
            }}
            bezier
            style={{ borderRadius: 10, marginTop: 10 }}
          />
        </View>

        {/* Recent transactions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Dernières transactions</Text>
          {derniers.length === 0 ? (
            <Text style={styles.empty}>Aucune transaction</Text>
          ) : (
            derniers.map((t) => {
              const isIn = t.type === 'ENTREE';
              return (
                <View key={t.id} style={styles.txRow}>
                  <View style={[styles.txIcon, { backgroundColor: `${isIn ? colors.success : colors.danger}22` }]}>
                    <Ionicons
                      name={isIn ? 'arrow-down-outline' : 'arrow-up-outline'}
                      size={15}
                      color={isIn ? colors.success : colors.danger}
                    />
                  </View>
                  <View style={styles.txInfo}>
                    <Text style={styles.txDesc} numberOfLines={1}>
                      {t.description ?? t.categorieNom ?? 'Transaction'}
                    </Text>
                    <Text style={styles.txDate}>
                      {new Date(t.dateTransaction).toLocaleDateString('fr-FR')}
                    </Text>
                  </View>
                  <Text style={[styles.txAmt, { color: isIn ? colors.success : colors.danger }]}>
                    {isIn ? '+' : '-'}{mru(t.montant)}
                  </Text>
                </View>
              );
            })
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  loader: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 10 },
  headerTitle: { fontSize: 22, fontWeight: '700', color: colors.text },
  headerSub: { fontSize: 13, color: colors.textMuted, marginTop: 2, textTransform: 'capitalize' },
  logoutBtn: { padding: 6 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 16, gap: 10, marginBottom: 16 },
  statCard: { flex: 1, minWidth: '45%', backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: 16, padding: 14, gap: 6 },
  statIconBox: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  statValue: { fontSize: 15, fontWeight: '700', color: colors.text },
  statLabel: { fontSize: 11, color: colors.textMuted },
  chartCard: { marginHorizontal: 20, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: 16, padding: 16, marginBottom: 20 },
  section: { marginHorizontal: 20, marginBottom: 32 },
  sectionTitle: { fontSize: 15, fontWeight: '600', color: colors.text, marginBottom: 12 },
  empty: { color: colors.textMuted, textAlign: 'center', paddingVertical: 20 },
  txRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: colors.border, gap: 12 },
  txIcon: { width: 34, height: 34, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  txInfo: { flex: 1 },
  txDesc: { fontSize: 13, color: colors.text, fontWeight: '500' },
  txDate: { fontSize: 11, color: colors.textMuted, marginTop: 2 },
  txAmt: { fontSize: 13, fontWeight: '700' },
});