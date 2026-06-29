import React, { useState, useEffect, useCallback } from 'react';
import {
    View, Text, ScrollView, StyleSheet, ActivityIndicator,
    RefreshControl, Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { BarChart, LineChart } from 'react-native-chart-kit';
import Svg, { Circle, Text as SvgText } from 'react-native-svg';

import { colors } from '../theme/colors';
import { transactionsAPI, comptesAPI } from '../services/api';
import type { Transaction, Compte } from '../types';

const { width } = Dimensions.get('window');
const MONTHS = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];

function mru(n: number) {
    return `${n.toLocaleString('fr-FR', { maximumFractionDigits: 0 })} MRU`;
}

const CHART_CONFIG = {
    backgroundColor: 'transparent',
    backgroundGradientFrom: 'rgba(82,113,255,0.08)',
    backgroundGradientTo: 'transparent',
    decimalPlaces: 0,
    color: (o = 1) => `rgba(82,113,255,${o})`,
    labelColor: (o = 1) => `rgba(255,255,255,${o * 0.55})`,
    propsForDots: { r: '4', strokeWidth: '2', stroke: colors.accent },
    barPercentage: 0.6,
};

export default function StatsScreen() {
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [comptes, setComptes] = useState<Compte[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const load = useCallback(async () => {
        try {
            const [tRes, cRes] = await Promise.all([
                transactionsAPI.getAll(),
                comptesAPI.getAll(),
            ]);
            setTransactions(tRes.data?.data ?? tRes.data ?? []);
            setComptes(cRes.data?.data ?? cRes.data ?? []);
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

    // ── Revenus vs Dépenses 6 mois ──
    const last6Months = Array.from({ length: 6 }, (_, i) => {
        const d = new Date(thisY, thisM - (5 - i), 1);
        return { month: d.getMonth(), year: d.getFullYear(), label: MONTHS[d.getMonth()] };
    });

    const revenusData = last6Months.map(m =>
        transactions
            .filter(t => {
                const d = new Date(t.dateTransaction);
                return t.type === 'ENTREE' && d.getMonth() === m.month && d.getFullYear() === m.year;
            })
            .reduce((s, t) => s + t.montant, 0)
    );

    const depensesData = last6Months.map(m =>
        transactions
            .filter(t => {
                const d = new Date(t.dateTransaction);
                return t.type === 'DEPENSE' && d.getMonth() === m.month && d.getFullYear() === m.year;
            })
            .reduce((s, t) => s + t.montant, 0)
    );

    // ── Comparaison mois actuel vs précédent ──
    const prevM = thisM === 0 ? 11 : thisM - 1;
    const prevY = thisM === 0 ? thisY - 1 : thisY;

    const revenusCeMois = revenusData[5];
    const revenusPrevious = transactions
        .filter(t => {
            const d = new Date(t.dateTransaction);
            return t.type === 'ENTREE' && d.getMonth() === prevM && d.getFullYear() === prevY;
        })
        .reduce((s, t) => s + t.montant, 0);

    const depensesCeMois = depensesData[5];
    const depensesPrevious = transactions
        .filter(t => {
            const d = new Date(t.dateTransaction);
            return t.type === 'DEPENSE' && d.getMonth() === prevM && d.getFullYear() === prevY;
        })
        .reduce((s, t) => s + t.montant, 0);

    const revenusDiff = revenusPrevious > 0 ? Math.round(((revenusCeMois - revenusPrevious) / revenusPrevious) * 100) : 0;
    const depensesDiff = depensesPrevious > 0 ? Math.round(((depensesCeMois - depensesPrevious) / depensesPrevious) * 100) : 0;

    // ── Top catégories dépenses ──
    const catMap: Record<string, number> = {};
    transactions
        .filter(t => t.type === 'DEPENSE')
        .forEach(t => {
            const cat = t.categorieNom ?? 'Autre';
            catMap[cat] = (catMap[cat] ?? 0) + t.montant;
        });

    const topCats = Object.entries(catMap)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);

    const totalDepenses = topCats.reduce((s, [, v]) => s + v, 0);

    // ── Évolution patrimoine ──
    const totalSolde = comptes.reduce((s, c) => s + (c.soldeActuel ?? 0), 0);

    const patrimoineData = last6Months.map((m, i) => {
        const netMois = transactions
            .filter(t => {
                const d = new Date(t.dateTransaction);
                return d.getMonth() === m.month && d.getFullYear() === m.year;
            })
            .reduce((s, t) => s + (t.type === 'ENTREE' ? t.montant : -t.montant), 0);
        return netMois;
    });

    const TINT_COLORS = [colors.accent, colors.success, colors.warning, colors.danger, '#a855f7'];

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
                    <Text style={styles.title}>Statistiques</Text>
                    <Text style={styles.subtitle}>
                        {now.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}
                    </Text>
                </View>

                {/* Comparaison mois */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Comparaison vs mois précédent</Text>
                    <View style={styles.compareRow}>
                        <View style={styles.compareCard}>
                            <View style={[styles.compareIcon, { backgroundColor: `${colors.success}22` }]}>
                                <Ionicons name="trending-up-outline" size={20} color={colors.success} />
                            </View>
                            <Text style={styles.compareLabel}>Revenus</Text>
                            <Text style={[styles.compareValue, { color: colors.success }]}>{mru(revenusCeMois)}</Text>
                            <View style={[styles.diffBadge, { backgroundColor: revenusDiff >= 0 ? `${colors.success}22` : `${colors.danger}22` }]}>
                                <Ionicons
                                    name={revenusDiff >= 0 ? 'arrow-up' : 'arrow-down'}
                                    size={12}
                                    color={revenusDiff >= 0 ? colors.success : colors.danger}
                                />
                                <Text style={[styles.diffText, { color: revenusDiff >= 0 ? colors.success : colors.danger }]}>
                                    {Math.abs(revenusDiff)}%
                                </Text>
                            </View>
                        </View>

                        <View style={styles.compareCard}>
                            <View style={[styles.compareIcon, { backgroundColor: `${colors.danger}22` }]}>
                                <Ionicons name="trending-down-outline" size={20} color={colors.danger} />
                            </View>
                            <Text style={styles.compareLabel}>Dépenses</Text>
                            <Text style={[styles.compareValue, { color: colors.danger }]}>{mru(depensesCeMois)}</Text>
                            <View style={[styles.diffBadge, { backgroundColor: depensesDiff <= 0 ? `${colors.success}22` : `${colors.danger}22` }]}>
                                <Ionicons
                                    name={depensesDiff >= 0 ? 'arrow-up' : 'arrow-down'}
                                    size={12}
                                    color={depensesDiff <= 0 ? colors.success : colors.danger}
                                />
                                <Text style={[styles.diffText, { color: depensesDiff <= 0 ? colors.success : colors.danger }]}>
                                    {Math.abs(depensesDiff)}%
                                </Text>
                            </View>
                        </View>

                        <View style={styles.compareCard}>
                            <View style={[styles.compareIcon, { backgroundColor: `${colors.accent}22` }]}>
                                <Ionicons name="wallet-outline" size={20} color={colors.accent} />
                            </View>
                            <Text style={styles.compareLabel}>Patrimoine</Text>
                            <Text style={[styles.compareValue, { color: colors.accent }]}>{mru(totalSolde)}</Text>
                            <View style={[styles.diffBadge, { backgroundColor: `${colors.accent}22` }]}>
                                <Text style={[styles.diffText, { color: colors.accent }]}>Total</Text>
                            </View>
                        </View>
                    </View>
                </View>

                {/* Revenus vs Dépenses */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Revenus vs Dépenses (6 mois)</Text>
                    <BarChart
                        data={{
                            labels: last6Months.map(m => m.label),
                            datasets: [
                                { data: revenusData, color: () => colors.success },
                                { data: depensesData, color: () => colors.danger },
                            ],
                        }}
                        width={width - 48}
                        height={200}
                        chartConfig={{
                            ...CHART_CONFIG,
                            color: (o = 1) => `rgba(82,113,255,${o})`,
                        }}
                        style={{ borderRadius: 10, marginTop: 10 }}
                        showValuesOnTopOfBars={false}
                        withInnerLines={false}
                        yAxisLabel=""
                        yAxisSuffix=""
                    />
                    <View style={styles.legendRow}>
                        <View style={styles.legendItem}>
                            <View style={[styles.legendDot, { backgroundColor: colors.success }]} />
                            <Text style={styles.legendText}>Revenus</Text>
                        </View>
                        <View style={styles.legendItem}>
                            <View style={[styles.legendDot, { backgroundColor: colors.danger }]} />
                            <Text style={styles.legendText}>Dépenses</Text>
                        </View>
                    </View>
                </View>

                {/* Top catégories */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Top catégories de dépenses</Text>
                    {topCats.length === 0 ? (
                        <Text style={styles.empty}>Aucune dépense enregistrée</Text>
                    ) : (
                        topCats.map(([cat, montant], i) => {
                            const pct = totalDepenses > 0 ? Math.round((montant / totalDepenses) * 100) : 0;
                            const tint = TINT_COLORS[i % TINT_COLORS.length];
                            return (
                                <View key={cat} style={styles.catRow}>
                                    <View style={styles.catLeft}>
                                        <View style={[styles.catRank, { backgroundColor: `${tint}22` }]}>
                                            <Text style={[styles.catRankText, { color: tint }]}>{i + 1}</Text>
                                        </View>
                                        <Text style={styles.catNom} numberOfLines={1}>{cat}</Text>
                                    </View>
                                    <View style={styles.catRight}>
                                        <Text style={[styles.catMontant, { color: tint }]}>{mru(montant)}</Text>
                                        <Text style={styles.catPct}>{pct}%</Text>
                                    </View>
                                    <View style={styles.catBarBg}>
                                        <View style={[styles.catBarFill, { width: `${pct}%` as any, backgroundColor: tint }]} />
                                    </View>
                                </View>
                            );
                        })
                    )}
                </View>

                {/* Évolution net mensuel */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Solde net mensuel</Text>
                    <LineChart
                        data={{
                            labels: last6Months.map(m => m.label),
                            datasets: [{ data: patrimoineData.map(v => Math.max(0, v)) }],
                        }}
                        width={width - 48}
                        height={180}
                        chartConfig={CHART_CONFIG}
                        bezier
                        style={{ borderRadius: 10, marginTop: 10 }}
                    />
                </View>

                <View style={{ height: 32 }} />
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.background },
    loader: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background },
    header: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8 },
    title: { fontSize: 22, fontWeight: '700', color: colors.text },
    subtitle: { fontSize: 13, color: colors.textMuted, marginTop: 2, textTransform: 'capitalize' },
    section: { marginHorizontal: 20, marginBottom: 16, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: 16, padding: 16 },
    sectionTitle: { fontSize: 15, fontWeight: '600', color: colors.text, marginBottom: 12 },
    compareRow: { flexDirection: 'row', gap: 10 },
    compareCard: { flex: 1, backgroundColor: colors.background, borderRadius: 12, padding: 12, alignItems: 'center', gap: 6, borderWidth: 1, borderColor: colors.border },
    compareIcon: { width: 38, height: 38, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
    compareLabel: { fontSize: 11, color: colors.textMuted, fontWeight: '500' },
    compareValue: { fontSize: 12, fontWeight: '700' },
    diffBadge: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
    diffText: { fontSize: 11, fontWeight: '700' },
    legendRow: { flexDirection: 'row', justifyContent: 'center', gap: 20, marginTop: 8 },
    legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    legendDot: { width: 10, height: 10, borderRadius: 5 },
    legendText: { fontSize: 12, color: colors.textMuted },
    catRow: { marginBottom: 14 },
    catLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 6 },
    catRight: { position: 'absolute', right: 0, top: 0, alignItems: 'flex-end' },
    catRank: { width: 26, height: 26, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
    catRankText: { fontSize: 12, fontWeight: '700' },
    catNom: { fontSize: 14, color: colors.text, fontWeight: '500', flex: 1 },
    catMontant: { fontSize: 13, fontWeight: '700' },
    catPct: { fontSize: 11, color: colors.textMuted },
    catBarBg: { height: 6, backgroundColor: colors.border, borderRadius: 3, overflow: 'hidden', marginTop: 4 },
    catBarFill: { height: '100%', borderRadius: 3 },
    empty: { color: colors.textMuted, textAlign: 'center', paddingVertical: 20 },
});