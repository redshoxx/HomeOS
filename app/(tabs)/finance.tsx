import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Screen } from '@/components/Screen';
import { Card } from '@/components/Card';
import { TextField } from '@/components/TextField';
import { Button } from '@/components/Button';
import { EmptyState } from '@/components/EmptyState';
import { SwipeActionRow } from '@/components/SwipeActionRow';
import { addExpense, deleteTransaction, listTransactions, monthSpend } from '@/repositories/financeRepo';
import type { Transaction } from '@/types/models';
import { useAppStore } from '@/store/appStore';
import { colors, radius, spacing } from '@/theme/theme';
import { formatMoney } from '@/utils/money';

const messageOf = (error: unknown) => error instanceof Error ? error.message : 'Unbekannter Fehler';

export default function Finance() {
  const householdId = useAppStore(s => s.activeHouseholdId);
  const revision = useAppStore(s => s.revision);
  const bump = useAppStore(s => s.bump);
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [items, setItems] = useState<Transaction[]>([]);
  const [spent, setSpent] = useState(0);
  const [saving, setSaving] = useState(false);

  const monthKey = new Date().toISOString().slice(0, 7);
  const month = new Intl.DateTimeFormat('de-AT', { month: 'long', year: 'numeric' }).format(new Date());

  const load = useCallback(async () => {
    if (!householdId) return;
    const [nextItems, total] = await Promise.all([listTransactions(householdId), monthSpend(householdId, monthKey)]);
    setItems(nextItems);
    setSpent(total);
  }, [householdId, monthKey]);

  useEffect(() => {
    void load().catch(error => Alert.alert('Finanzen', messageOf(error)));
  }, [load, revision]);

  const monthItems = useMemo(() => items.filter(item => item.date?.startsWith(monthKey)), [items, monthKey]);
  const average = monthItems.length ? spent / monthItems.length : 0;

  const add = async () => {
    const parsed = Number(amount.replace(',', '.'));
    if (!householdId || saving) return;
    if (!title.trim() || !Number.isFinite(parsed) || parsed <= 0) {
      Alert.alert('Eingabe prüfen', 'Bitte Titel und einen Betrag größer 0 eingeben.');
      return;
    }
    setSaving(true);
    try {
      await addExpense(householdId, title.trim(), parsed);
      setTitle('');
      setAmount('');
      await load();
      bump();
    } catch (error) {
      Alert.alert('Speichern fehlgeschlagen', messageOf(error));
    } finally {
      setSaving(false);
    }
  };

  const remove = async (item: Transaction) => {
    if (saving) return;
    setSaving(true);
    try {
      await deleteTransaction(item.id);
      await load();
      bump();
    } catch (error) {
      Alert.alert('Löschen fehlgeschlagen', messageOf(error));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen>
      <View style={styles.hero}>
        <View style={styles.flex}>
          <Text style={styles.kicker}>HAUSHALTSBUDGET</Text>
          <Text style={styles.h1}>Finanzen</Text>
          <Text style={styles.sub}>{month}</Text>
        </View>
        <View style={styles.heroIcon}><Ionicons name="wallet-outline" size={25} color={colors.accent} /></View>
      </View>

      <View style={styles.balance}>
        <View style={styles.balanceTop}>
          <View>
            <Text style={styles.balanceLabel}>AUSGABEN DIESEN MONAT</Text>
            <Text style={styles.money}>{formatMoney(spent)}</Text>
          </View>
          <View style={styles.walletIcon}><Ionicons name="card-outline" size={23} color="#fff" /></View>
        </View>
        <View style={styles.balanceStats}>
          <View style={styles.balanceStat}><Text style={styles.balanceStatValue}>{monthItems.length}</Text><Text style={styles.balanceStatLabel}>Buchungen</Text></View>
          <View style={styles.balanceDivider} />
          <View style={styles.balanceStat}><Text style={styles.balanceStatValue}>{formatMoney(average)}</Text><Text style={styles.balanceStatLabel}>Ø Buchung</Text></View>
        </View>
      </View>

      <Card>
        <View style={styles.sectionTop}>
          <View>
            <Text style={styles.section}>Ausgabe erfassen</Text>
            <Text style={styles.meta}>Offline gespeichert und später synchronisiert</Text>
          </View>
          <View style={styles.smallIcon}><Ionicons name="add-outline" size={20} color={colors.accent} /></View>
        </View>
        <TextField label="Titel" value={title} onChangeText={setTitle} placeholder="z. B. Supermarkt" editable={!saving} />
        <TextField label="Betrag" value={amount} onChangeText={setAmount} keyboardType="decimal-pad" placeholder="0,00" editable={!saving} />
        <Button label="Ausgabe speichern" loading={saving} disabled={!householdId} onPress={() => void add()} />
      </Card>

      <View style={styles.swipeHint}>
        <Ionicons name="arrow-back-outline" size={16} color={colors.textMuted} />
        <Text style={styles.swipeHintText}>Buchung nach links wischen, um sie zu löschen</Text>
      </View>

      <View style={styles.sectionTop}>
        <View><Text style={styles.section}>Letzte Buchungen</Text><Text style={styles.meta}>Neueste zuerst</Text></View>
        <View style={styles.count}><Text style={styles.countText}>{items.length}</Text></View>
      </View>

      {items.length ? (
        <View style={styles.rows}>
          {items.map(item => (
            <SwipeActionRow key={item.id} disabled={saving} onDelete={() => void remove(item)}>
              <View style={styles.row}>
                <View style={styles.rowIcon}><Ionicons name="receipt-outline" size={20} color={colors.accent} /></View>
                <View style={styles.flex}>
                  <Text style={styles.name} numberOfLines={1}>{item.title}</Text>
                  <Text style={styles.meta}>{item.category} · {item.date}</Text>
                </View>
                <View style={styles.valueWrap}>
                  <Text style={styles.value}>− {formatMoney(item.amount)}</Text>
                  <Text style={styles.valueMeta}>Ausgabe</Text>
                </View>
              </View>
            </SwipeActionRow>
          ))}
        </View>
      ) : <EmptyState icon="receipt-outline" title="Noch keine Ausgaben" body="Erfasste Haushaltsausgaben erscheinen hier chronologisch." />}
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  hero: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  kicker: { fontSize: 11, fontWeight: '800', letterSpacing: 1.2, color: colors.textMuted },
  h1: { fontSize: 38, lineHeight: 44, fontWeight: '800', letterSpacing: -1.35, color: colors.text },
  sub: { marginTop: 2, fontSize: 15, color: colors.textMuted, textTransform: 'capitalize' },
  heroIcon: { width: 54, height: 54, borderRadius: 18, backgroundColor: colors.accentSoft, alignItems: 'center', justifyContent: 'center' },
  balance: { padding: 19, borderRadius: radius.lg, backgroundColor: colors.accent, gap: 18 },
  balanceTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  balanceLabel: { fontSize: 10, fontWeight: '800', letterSpacing: 1.05, color: 'rgba(255,255,255,.62)' },
  money: { marginTop: 4, fontSize: 39, lineHeight: 45, fontWeight: '800', letterSpacing: -1.25, color: '#fff' },
  walletIcon: { width: 44, height: 44, borderRadius: 15, backgroundColor: 'rgba(255,255,255,.13)', alignItems: 'center', justifyContent: 'center' },
  balanceStats: { flexDirection: 'row', alignItems: 'center', paddingTop: 14, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,.14)' },
  balanceStat: { flex: 1 },
  balanceDivider: { width: 1, height: 35, backgroundColor: 'rgba(255,255,255,.14)', marginHorizontal: 14 },
  balanceStatValue: { fontSize: 17, fontWeight: '800', color: '#fff' },
  balanceStatLabel: { marginTop: 2, fontSize: 11, color: 'rgba(255,255,255,.62)' },
  sectionTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  section: { fontSize: 20, fontWeight: '800', letterSpacing: -0.4, color: colors.text },
  meta: { fontSize: 12, lineHeight: 17, color: colors.textMuted },
  smallIcon: { width: 38, height: 38, borderRadius: 12, backgroundColor: colors.accentSoft, alignItems: 'center', justifyContent: 'center' },
  swipeHint: { flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 4 },
  swipeHintText: { fontSize: 11, color: colors.textMuted },
  count: { minWidth: 31, height: 31, paddingHorizontal: 9, borderRadius: 16, backgroundColor: colors.surfaceMuted, alignItems: 'center', justifyContent: 'center' },
  countText: { fontSize: 12, fontWeight: '800', color: colors.textMuted },
  rows: { gap: 8 },
  row: { minHeight: 72, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 13, paddingVertical: 11, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, backgroundColor: colors.surface },
  rowIcon: { width: 42, height: 42, borderRadius: 14, backgroundColor: colors.accentSoft, alignItems: 'center', justifyContent: 'center' },
  name: { fontSize: 16, fontWeight: '700', color: colors.text },
  valueWrap: { alignItems: 'flex-end', gap: 2 },
  value: { fontSize: 15, fontWeight: '800', color: colors.text },
  valueMeta: { fontSize: 10, color: colors.textMuted },
});
