import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  ActivityIndicator, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
import { colors } from '../theme/colors';
import { transactionsAPI, comptesAPI, budgetsAPI } from '../services/api';
import type { Transaction, Compte, Budget } from '../types';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmt(n: number) {
  return `${n.toLocaleString('fr-FR', { maximumFractionDigits: 0 })} MRU`;
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('fr-FR');
}

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function getMonthOptions() {
  const options: { label: string; year: number; month: number }[] = [];
  const now = new Date();
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    options.push({
      label: d.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }),
      year: d.getFullYear(),
      month: d.getMonth(),
    });
  }
  return options;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

interface KpiCardProps {
  label: string;
  value: string;
  tint: string;
  icon: keyof typeof Ionicons.glyphMap;
}
function KpiCard({ label, value, tint, icon }: KpiCardProps) {
  return (
    <View style={styles.kpiCard}>
      <View style={[styles.kpiIcon, { backgroundColor: `${tint}22` }]}>
        <Ionicons name={icon} size={18} color={tint} />
      </View>
      <Text style={[styles.kpiValue, { color: tint }]} numberOfLines={1}>{value}</Text>
      <Text style={styles.kpiLabel}>{label}</Text>
    </View>
  );
}

// ─── HTML template ────────────────────────────────────────────────────────────

function buildHTML(
  monthLabel: string,
  txMonth: Transaction[],
  budgetsMois: Budget[],
  totalRevenus: number,
  totalDepenses: number,
  soldeNet: number,
) {
  const genDate = new Date().toLocaleDateString('fr-FR', {
    day: '2-digit', month: 'long', year: 'numeric',
  });

  const txRows = txMonth.map(tx => `
    <tr>
      <td>${fmtDate(tx.dateTransaction)}</td>
      <td>${tx.description ?? '-'}</td>
      <td>${tx.categorieNom ?? '-'}</td>
      <td>${tx.compteNom ?? '-'}</td>
      <td class="${tx.type === 'ENTREE' ? 'in' : 'out'}">${tx.type === 'ENTREE' ? 'Entrée' : 'Dépense'}</td>
      <td class="${tx.type === 'ENTREE' ? 'in' : 'out'}" style="text-align:right">
        ${tx.type === 'ENTREE' ? '+' : '-'}${fmt(tx.montant)}
      </td>
      <td>${tx.sourcePaiement ?? '-'}</td>
    </tr>`).join('');

  const budgetRows = budgetsMois.map(b => {
    const pct = b.montantLimite > 0 ? Math.round((b.montantDepense / b.montantLimite) * 100) : 0;
    const over = pct > 100;
    return `
    <tr>
      <td>${b.categorieNom ?? '-'}</td>
      <td style="text-align:right">${fmt(b.montantLimite)}</td>
      <td style="text-align:right" class="${over ? 'out' : ''}">${fmt(b.montantDepense)}</td>
      <td style="text-align:right">${fmt(Math.max(0, b.montantLimite - b.montantDepense))}</td>
      <td style="text-align:right" class="${over ? 'out' : 'in'}">${pct}%${over ? ' ⚠' : ''}</td>
    </tr>`;
  }).join('');

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1.0"/>
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{font-family:Arial,Helvetica,sans-serif;color:#1e293b;background:#fff;font-size:12px}
    .header{background:linear-gradient(135deg,#0a0f2e 0%,#1a2060 100%);color:#fff;padding:28px 32px}
    .logo{font-size:22px;font-weight:800;color:#fff}
    .logo span{color:#5271ff}
    .sub{font-size:12px;color:#94a3b8;margin-top:4px}
    .month{font-size:17px;font-weight:700;color:#5271ff;margin-top:14px}
    .body{padding:28px 32px}
    h2{font-size:13px;font-weight:700;color:#0a0f2e;margin:0 0 12px;padding-bottom:6px;
       border-bottom:2px solid #5271ff;text-transform:uppercase;letter-spacing:.5px}
    .kpis{display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin-bottom:28px}
    .kpi{background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:14px}
    .kpi-lbl{font-size:10px;color:#64748b;text-transform:uppercase;letter-spacing:.5px}
    .kpi-val{font-size:16px;font-weight:800;margin-top:6px}
    .in{color:#10b981;font-weight:600}
    .out{color:#ef4444;font-weight:600}
    .acc{color:#5271ff;font-weight:600}
    table{width:100%;border-collapse:collapse;margin-bottom:28px}
    th{background:#0a0f2e;color:#fff;padding:9px 8px;text-align:left;
       font-size:10px;text-transform:uppercase;letter-spacing:.4px}
    td{padding:8px;border-bottom:1px solid #e2e8f0;font-size:11px}
    tr:nth-child(even) td{background:#f8fafc}
    .empty{text-align:center;color:#94a3b8;padding:20px;font-style:italic}
    .footer{margin-top:28px;padding-top:14px;border-top:1px solid #e2e8f0;
            display:flex;justify-content:space-between;color:#94a3b8;font-size:10px}
  </style>
</head>
<body>
  <div class="header">
    <div class="logo">Gestion Financière <span>IDER SI</span></div>
    <div class="sub">Nouakchott, Mauritanie — Rapport financier mensuel</div>
    <div class="month">${capitalize(monthLabel)}</div>
  </div>
  <div class="body">

    <h2>Indicateurs clés</h2>
    <div class="kpis">
      <div class="kpi">
        <div class="kpi-lbl">Total revenus</div>
        <div class="kpi-val in">+${fmt(totalRevenus)}</div>
      </div>
      <div class="kpi">
        <div class="kpi-lbl">Total dépenses</div>
        <div class="kpi-val out">-${fmt(totalDepenses)}</div>
      </div>
      <div class="kpi">
        <div class="kpi-lbl">Solde net</div>
        <div class="kpi-val ${soldeNet >= 0 ? 'in' : 'out'}">${soldeNet >= 0 ? '+' : ''}${fmt(soldeNet)}</div>
      </div>
      <div class="kpi">
        <div class="kpi-lbl">Nb transactions</div>
        <div class="kpi-val acc">${txMonth.length}</div>
      </div>
    </div>

    <h2>Transactions du mois (${txMonth.length})</h2>
    ${txMonth.length === 0
      ? '<p class="empty">Aucune transaction ce mois-ci.</p>'
      : `<table>
          <thead><tr>
            <th>Date</th><th>Description</th><th>Catégorie</th>
            <th>Compte</th><th>Type</th><th style="text-align:right">Montant</th><th>Source</th>
          </tr></thead>
          <tbody>${txRows}</tbody>
        </table>`
    }

    <h2>Budgets du mois (${budgetsMois.length})</h2>
    ${budgetsMois.length === 0
      ? '<p class="empty">Aucun budget ce mois-ci.</p>'
      : `<table>
          <thead><tr>
            <th>Catégorie</th>
            <th style="text-align:right">Limite</th>
            <th style="text-align:right">Dépensé</th>
            <th style="text-align:right">Restant</th>
            <th style="text-align:right">Utilisation</th>
          </tr></thead>
          <tbody>${budgetRows}</tbody>
        </table>`
    }

    <div class="footer">
      <span>© 2026 IDER SI — Tous droits réservés</span>
      <span>Généré le ${genDate}</span>
    </div>
  </div>
</body>
</html>`;
}

// ─── Screen ───────────────────────────────────────────────────────────────────

const MONTH_OPTIONS = getMonthOptions();

export default function RapportScreen() {
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [comptes, setComptes] = useState<Compte[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [tRes, cRes, bRes] = await Promise.all([
        transactionsAPI.getAll(),
        comptesAPI.getAll(),
        budgetsAPI.getAll(),
      ]);
      const unwrap = (r: any) => r.data?.data ?? r.data ?? [];
      setTransactions(unwrap(tRes));
      setComptes(unwrap(cRes));
      setBudgets(unwrap(bRes));
    } catch {
      Alert.alert('Erreur', 'Impossible de charger les données.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // ── Computed ────────────────────────────────────────────────────────────────

  const selected = MONTH_OPTIONS[selectedIdx];

  const txMonth = transactions.filter(tx => {
    const d = new Date(tx.dateTransaction);
    return d.getMonth() === selected.month && d.getFullYear() === selected.year;
  });

  const totalRevenus = txMonth
    .filter(t => t.type === 'ENTREE')
    .reduce((s, t) => s + t.montant, 0);

  const totalDepenses = txMonth
    .filter(t => t.type === 'DEPENSE' || t.type === 'SORTIE')
    .reduce((s, t) => s + t.montant, 0);

  const soldeNet = totalRevenus - totalDepenses;

  const totalComptes = comptes.reduce((s, c) => s + (c.soldeActuel ?? 0), 0);

  const selFirst = new Date(selected.year, selected.month, 1);
  const budgetsMois = budgets.filter(b => {
    const debut = new Date(b.dateDebut);
    const fin = new Date(b.dateFin);
    return debut <= selFirst && fin >= selFirst;
  });

  // ── Exports ─────────────────────────────────────────────────────────────────

  const handleExportPDF = async () => {
    setExporting(true);
    try {
      const html = buildHTML(
        selected.label, txMonth, budgetsMois,
        totalRevenus, totalDepenses, soldeNet,
      );
      const { uri } = await Print.printToFileAsync({ html });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, {
          mimeType: 'application/pdf',
          dialogTitle: 'Partager le rapport PDF',
          UTI: 'com.adobe.pdf',
        });
      } else {
        Alert.alert('PDF généré', uri);
      }
    } catch (e: any) {
      Alert.alert('Erreur PDF', e.message ?? 'Génération échouée.');
    } finally {
      setExporting(false);
    }
  };

  const handleExportCSV = async () => {
    setExporting(true);
    try {
      const BOM = '﻿';
      const sep = ';';
      const headers = ['Date', 'Description', 'Catégorie', 'Compte', 'Type', 'Montant (MRU)', 'Source'];

      const rows = txMonth.map(tx =>
        [
          fmtDate(tx.dateTransaction),
          tx.description ?? '',
          tx.categorieNom ?? '',
          tx.compteNom ?? '',
          tx.type === 'ENTREE' ? 'Entrée' : 'Dépense',
          tx.type === 'ENTREE' ? tx.montant : -tx.montant,
          tx.sourcePaiement ?? '',
        ]
          .map(cell => `"${String(cell).replace(/"/g, '""')}"`)
          .join(sep),
      );

      const csv = BOM + [headers.join(sep), ...rows].join('\n');
      const slug = `${selected.year}-${String(selected.month + 1).padStart(2, '0')}`;
      const fileUri = `${FileSystem.documentDirectory}rapport_idersi_${slug}.csv`;

      await FileSystem.writeAsStringAsync(fileUri, csv, {
  encoding: 'utf8',
});


      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri, {
          mimeType: 'text/csv',
          dialogTitle: 'Partager le rapport Excel',
          UTI: 'public.comma-separated-values-text',
        });
      } else {
        Alert.alert('CSV généré', fileUri);
      }
    } catch (e: any) {
      Alert.alert('Erreur CSV', e.message ?? 'Génération échouée.');
    } finally {
      setExporting(false);
    }
  };

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView showsVerticalScrollIndicator={false}>

        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Rapports</Text>
            <Text style={styles.subtitle}>Export PDF & Excel</Text>
          </View>
          <TouchableOpacity onPress={load} style={styles.refreshBtn} disabled={loading}>
            <Ionicons name="refresh-outline" size={20} color={colors.accent} />
          </TouchableOpacity>
        </View>

        {/* Month selector */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.monthRow}
        >
          {MONTH_OPTIONS.map((opt, i) => (
            <TouchableOpacity
              key={i}
              style={[styles.chip, i === selectedIdx && styles.chipActive]}
              onPress={() => setSelectedIdx(i)}
            >
              <Text style={[styles.chipText, i === selectedIdx && styles.chipTextActive]}>
                {capitalize(opt.label)}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {loading ? (
          <View style={styles.loaderBox}>
            <ActivityIndicator size="large" color={colors.accent} />
          </View>
        ) : (
          <>
            {/* Export buttons */}
            <View style={styles.exportRow}>
              <TouchableOpacity
                style={[styles.btnPDF, exporting && styles.btnDisabled]}
                onPress={handleExportPDF}
                disabled={exporting}
                activeOpacity={0.85}
              >
                {exporting
                  ? <ActivityIndicator size="small" color="#fff" />
                  : <>
                      <Ionicons name="document-text-outline" size={18} color="#fff" />
                      <Text style={styles.btnPDFText}>Exporter PDF</Text>
                    </>
                }
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.btnCSV, exporting && styles.btnDisabled]}
                onPress={handleExportCSV}
                disabled={exporting}
                activeOpacity={0.85}
              >
                {exporting
                  ? <ActivityIndicator size="small" color={colors.accent} />
                  : <>
                      <Ionicons name="grid-outline" size={18} color={colors.accent} />
                      <Text style={styles.btnCSVText}>Exporter Excel</Text>
                    </>
                }
              </TouchableOpacity>
            </View>

            {/* KPIs */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Indicateurs du mois</Text>
              <View style={styles.kpiGrid}>
                <KpiCard
                  icon="trending-up-outline"
                  label="Revenus"
                  value={`+${fmt(totalRevenus)}`}
                  tint={colors.success}
                />
                <KpiCard
                  icon="trending-down-outline"
                  label="Dépenses"
                  value={`-${fmt(totalDepenses)}`}
                  tint={colors.danger}
                />
                <KpiCard
                  icon="wallet-outline"
                  label="Solde net"
                  value={`${soldeNet >= 0 ? '+' : ''}${fmt(soldeNet)}`}
                  tint={soldeNet >= 0 ? colors.success : colors.danger}
                />
                <KpiCard
                  icon="swap-horizontal-outline"
                  label="Transactions"
                  value={String(txMonth.length)}
                  tint={colors.accent}
                />
              </View>

              {/* Total comptes line */}
              <View style={styles.totalRow}>
                <Ionicons name="albums-outline" size={15} color={colors.textMuted} />
                <Text style={styles.totalLabel}>Solde total tous comptes</Text>
                <Text style={styles.totalValue}>{fmt(totalComptes)}</Text>
              </View>
            </View>

            {/* Transactions preview */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>
                Transactions{txMonth.length > 0 ? ` (${txMonth.length})` : ''}
              </Text>
              {txMonth.length === 0 ? (
                <Text style={styles.empty}>Aucune transaction ce mois-ci.</Text>
              ) : (
                <>
                  {txMonth.slice(0, 8).map(tx => {
                    const isIn = tx.type === 'ENTREE';
                    return (
                      <View key={tx.id} style={styles.txRow}>
                        <View style={[styles.txIconBox, { backgroundColor: `${isIn ? colors.success : colors.danger}22` }]}>
                          <Ionicons
                            name={isIn ? 'arrow-down-outline' : 'arrow-up-outline'}
                            size={14}
                            color={isIn ? colors.success : colors.danger}
                          />
                        </View>
                        <View style={styles.txInfo}>
                          <Text style={styles.txDesc} numberOfLines={1}>
                            {tx.description ?? tx.categorieNom ?? 'Transaction'}
                          </Text>
                          <Text style={styles.txMeta}>
                            {fmtDate(tx.dateTransaction)}
                            {tx.compteNom ? ` · ${tx.compteNom}` : ''}
                            {tx.sourcePaiement ? ` · ${tx.sourcePaiement}` : ''}
                          </Text>
                        </View>
                        <Text style={[styles.txAmt, { color: isIn ? colors.success : colors.danger }]}>
                          {isIn ? '+' : '-'}{fmt(tx.montant)}
                        </Text>
                      </View>
                    );
                  })}
                  {txMonth.length > 8 && (
                    <Text style={styles.moreHint}>
                      +{txMonth.length - 8} autres transactions incluses dans le PDF
                    </Text>
                  )}
                </>
              )}
            </View>

            {/* Budgets preview */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>
                Budgets{budgetsMois.length > 0 ? ` (${budgetsMois.length})` : ''}
              </Text>
              {budgetsMois.length === 0 ? (
                <Text style={styles.empty}>Aucun budget actif ce mois-ci.</Text>
              ) : (
                budgetsMois.map(b => {
                  const pct = b.montantLimite > 0
                    ? (b.montantDepense / b.montantLimite) * 100
                    : 0;
                  const over = pct > 100;
                  const fill = Math.min(pct, 100);
                  return (
                    <View key={b.id} style={styles.budgetRow}>
                      <View style={styles.budgetTop}>
                        <Text style={styles.budgetCat}>{b.categorieNom ?? 'Budget'}</Text>
                        <Text style={[styles.budgetPct, { color: over ? colors.danger : colors.success }]}>
                          {Math.round(pct)}%{over ? ' ⚠' : ''}
                        </Text>
                      </View>
                      <View style={styles.progressBg}>
                        <View
                          style={[
                            styles.progressFill,
                            { width: `${fill}%`, backgroundColor: over ? colors.danger : colors.accent },
                          ]}
                        />
                      </View>
                      <Text style={styles.budgetAmts}>
                        {fmt(b.montantDepense)} dépensé sur {fmt(b.montantLimite)}
                      </Text>
                    </View>
                  );
                })
              )}
            </View>
          </>
        )}

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },

  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8,
  },
  title:    { fontSize: 22, fontWeight: '700', color: colors.text },
  subtitle: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  refreshBtn: { padding: 6 },

  monthRow: { paddingHorizontal: 16, paddingVertical: 12, gap: 8 },
  chip: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
    borderWidth: 1, borderColor: colors.border,
    backgroundColor: colors.card,
  },
  chipActive:     { borderColor: colors.accent, backgroundColor: `${colors.accent}20` },
  chipText:       { fontSize: 13, color: colors.textMuted, fontWeight: '500' },
  chipTextActive: { color: colors.accent, fontWeight: '700' },

  loaderBox: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 60 },

  exportRow: { flexDirection: 'row', paddingHorizontal: 20, gap: 12, marginBottom: 20 },
  btnPDF: {
    flex: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8,
    backgroundColor: colors.accent, borderRadius: 14, paddingVertical: 14,
  },
  btnCSV: {
    flex: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8,
    borderWidth: 1.5, borderColor: colors.accent,
    borderRadius: 14, paddingVertical: 14, backgroundColor: `${colors.accent}10`,
  },
  btnDisabled:   { opacity: 0.5 },
  btnPDFText:    { color: '#fff', fontWeight: '700', fontSize: 14 },
  btnCSVText:    { color: colors.accent, fontWeight: '700', fontSize: 14 },

  section: {
    marginHorizontal: 20, marginBottom: 16,
    backgroundColor: colors.card,
    borderWidth: 1, borderColor: colors.border,
    borderRadius: 16, padding: 16, gap: 10,
  },
  sectionTitle: { fontSize: 14, fontWeight: '600', color: colors.text, marginBottom: 2 },
  empty:        { color: colors.textMuted, textAlign: 'center', paddingVertical: 12, fontSize: 13 },

  kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  kpiCard: {
    flex: 1, minWidth: '45%',
    backgroundColor: colors.background,
    borderWidth: 1, borderColor: colors.border,
    borderRadius: 12, padding: 12, gap: 4,
  },
  kpiIcon:  { width: 32, height: 32, borderRadius: 9, justifyContent: 'center', alignItems: 'center' },
  kpiValue: { fontSize: 14, fontWeight: '700' },
  kpiLabel: { fontSize: 11, color: colors.textMuted },

  totalRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingTop: 10, borderTopWidth: 1, borderTopColor: colors.border,
  },
  totalLabel: { flex: 1, fontSize: 13, color: colors.textMuted },
  totalValue: { fontSize: 13, fontWeight: '700', color: colors.text },

  txRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  txIconBox: { width: 32, height: 32, borderRadius: 9, justifyContent: 'center', alignItems: 'center' },
  txInfo:    { flex: 1 },
  txDesc:    { fontSize: 13, color: colors.text, fontWeight: '500' },
  txMeta:    { fontSize: 11, color: colors.textMuted, marginTop: 2 },
  txAmt:     { fontSize: 13, fontWeight: '700' },
  moreHint:  { textAlign: 'center', fontSize: 12, color: colors.textMuted, paddingTop: 8, fontStyle: 'italic' },

  budgetRow:  { gap: 6 },
  budgetTop:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  budgetCat:  { fontSize: 13, color: colors.text, fontWeight: '500' },
  budgetPct:  { fontSize: 13, fontWeight: '700' },
  progressBg: { height: 6, backgroundColor: colors.border, borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: 6, borderRadius: 3 },
  budgetAmts: { fontSize: 11, color: colors.textMuted },
});
