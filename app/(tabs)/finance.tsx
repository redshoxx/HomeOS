import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { Screen } from '@/components/Screen';
import { AppHeader } from '@/components/AppHeader';
import { EmptyState } from '@/components/EmptyState';
import { SwipeActionRow } from '@/components/SwipeActionRow';
import { deleteTransaction, listTransactions, monthSpend } from '@/repositories/financeRepo';
import type { Transaction } from '@/types/models';
import { useAppStore } from '@/store/appStore';
import { colors, radius } from '@/theme/theme';
import { formatMoney } from '@/utils/money';

const messageOf = (error: unknown) => error instanceof Error ? error.message : 'Unbekannter Fehler';
const monthKeyLocal = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
};

export default function Finance() {
  const householdId = useAppStore(s => s.activeHouseholdId);
  const revision = useAppStore(s => s.revision);
  const bump = useAppStore(s => s.bump);
  const [items, setItems] = useState<Transaction[]>([]);
  const [spent, setSpent] = useState(0);
  const [showAll, setShowAll] = useState(false);
  const [busy, setBusy] = useState(false);

  const monthKey = monthKeyLocal();
  const month = new Intl.DateTimeFormat('de-AT', { month: 'long', year: 'numeric' }).format(new Date());

  const load = useCallback(async () => {
    if (!householdId) return;
    const [nextItems, total] = await Promise.all([listTransactions(householdId), monthSpend(householdId, monthKey)]);
    setItems(nextItems);
    setSpent(total);
  }, [householdId, monthKey]);

  useEffect(() => {
    void load().catch(error => Alert.alert('Geld', messageOf(error)));
  }, [load, revision]);

  const monthItems = useMemo(() => items.filter(item => item.date?.startsWith(monthKey)), [items, monthKey]);
  const visibleItems = showAll ? items : items.slice(0, 12);

  const remove = async (item: Transaction) => {
    if (busy) return;
    setBusy(true);
    try {
      await deleteTransaction(item.id);
      await load();
      bump();
    } catch (error) {
      Alert.alert('Löschen fehlgeschlagen', messageOf(error));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen>
      <AppHeader eyebrow="GELD" title="Finanzen" subtitle={month} />

      <View style={styles.totalCard}>
        <View style={styles.totalTop}>
          <View><Text style={styles.totalLabel}>AUSGABEN DIESEN MONAT</Text><Text style={styles.total}>{formatMoney(spent)}</Text></View>
          <View style={styles.wallet}><Ionicons name="wallet-outline" size={22} color="#fff" /></View>
        </View>
        <Text style={styles.totalMeta}>{monthItems.length} Buchung{monthItems.length === 1 ? '' : 'en'} im aktuellen Monat</Text>
      </View>

      <Pressable onPress={() => router.push({ pathname: '/(tabs)/add', params: { type: 'expense' } })} style={({ pressed }) => [styles.addShortcut, pressed && styles.pressed]}>
        <View style={styles.addIcon}><Ionicons name="add" size={22} color="#fff" /></View>
        <View style={styles.flex}><Text style={styles.addTitle}>Ausgabe erfassen</Text><Text style={styles.meta}>Titel und Betrag – mehr ist nicht nötig</Text></View>
        <Ionicons name="chevron-forward" size={18} color={colors.textSoft} />
      </Pressable>

      <View style={styles.sectionHead}>
        <View><Text style={styles.sectionTitle}>Letzte Buchungen</Text><Text style={styles.meta}>Neueste zuerst</Text></View>
        <View style={styles.count}><Text style={styles.countText}>{items.length}</Text></View>
      </View>

      {visibleItems.length ? (
        <View style={styles.list}>
          {visibleItems.map(item => (
            <SwipeActionRow key={item.id} disabled={busy} onDelete={() => void remove(item)}>
              <View style={styles.row}>
                <View style={styles.rowIcon}><Ionicons name="receipt-outline" size={18} color={colors.accent} /></View>
                <View style={styles.flex}><Text style={styles.name} numberOfLines={1}>{item.title}</Text><Text style={styles.meta}>{item.category} · {item.date}</Text></View>
                <Text style={styles.value}>− {formatMoney(item.amount)}</Text>
              </View>
            </SwipeActionRow>
          ))}
        </View>
      ) : <EmptyState icon="receipt-outline" title="Noch keine Ausgaben" body="Tippe auf + und erfasse die erste Buchung." />}

      {items.length > 12 ? (
        <Pressable onPress={() => setShowAll(value => !value)} style={({ pressed }) => [styles.showMore, pressed && styles.pressed]}>
          <Text style={styles.showMoreText}>{showAll ? 'Weniger anzeigen' : `Alle ${items.length} anzeigen`}</Text>
          <Ionicons name={showAll ? 'chevron-up' : 'chevron-down'} size={18} color={colors.accent} />
        </Pressable>
      ) : null}

      <Text style={styles.hint}>Buchung nach links wischen, um sie zu löschen</Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  pressed: { opacity: 0.7 },
  totalCard: { padding: 18, borderRadius: radius.lg, backgroundColor: colors.accent, gap: 12 },
  totalTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 },
  totalLabel: { fontSize: 10, fontWeight: '800', letterSpacing: 1, color: 'rgba(255,255,255,.62)' },
  total: { marginTop: 4, fontSize: 36, lineHeight: 42, fontWeight: '800', letterSpacing: -1.1, color: '#fff' },
  wallet: { width: 42, height: 42, borderRadius: 14, backgroundColor: 'rgba(255,255,255,.13)', alignItems: 'center', justifyContent: 'center' },
  totalMeta: { fontSize: 11, color: 'rgba(255,255,255,.68)' },
  addShortcut: { minHeight: 68, padding: 11, borderRadius: radius.md, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, flexDirection: 'row', alignItems: 'center', gap: 11 },
  addIcon: { width: 42, height: 42, borderRadius: 14, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' },
  addTitle: { fontSize: 15, fontWeight: '800', color: colors.text },
  sectionHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  sectionTitle: { fontSize: 20, fontWeight: '800', letterSpacing: -0.4, color: colors.text },
  count: { minWidth: 31, height: 31, paddingHorizontal: 9, borderRadius: 16, backgroundColor: colors.surfaceMuted, alignItems: 'center', justifyContent: 'center' },
  countText: { fontSize: 12, fontWeight: '800', color: colors.textMuted },
  list: { gap: 7 },
  row: { minHeight: 64, paddingHorizontal: 13, paddingVertical: 10, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, flexDirection: 'row', alignItems: 'center', gap: 11 },
  rowIcon: { width: 38, height: 38, borderRadius: 12, backgroundColor: colors.accentSoft, alignItems: 'center', justifyContent: 'center' },
  name: { fontSize: 15, fontWeight: '700', color: colors.text },
  meta: { marginTop: 2, fontSize: 11, lineHeight: 16, color: colors.textMuted },
  value: { fontSize: 14, fontWeight: '800', color: colors.text },
  showMore: { alignSelf: 'center', minHeight: 42, paddingHorizontal: 14, borderRadius: radius.pill, backgroundColor: colors.surfaceMuted, flexDirection: 'row', alignItems: 'center', gap: 6 },
  showMoreText: { fontSize: 12, fontWeight: '800', color: colors.accent },
  hint: { textAlign: 'center', fontSize: 10, color: colors.textSoft },
});
