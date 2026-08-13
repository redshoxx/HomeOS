import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '@/components/Screen';
import { Card } from '@/components/Card';
import { getDashboardStats, type DashboardStats } from '@/repositories/dashboardRepo';
import { getHousehold } from '@/repositories/householdRepo';
import { pendingSyncCount } from '@/database/queue';
import { useAppStore } from '@/store/appStore';
import { colors, radius, spacing } from '@/theme/theme';
import { formatMoney } from '@/utils/money';

const empty: DashboardStats = { shoppingOpen: 0, tasksOpen: 0, pantryCount: 0, billsOpen: 0, monthSpend: 0 };
const statMeta = [
  ['Einkauf', 'shoppingOpen', 'cart-outline'],
  ['Aufgaben', 'tasksOpen', 'checkmark-circle-outline'],
  ['Vorrat', 'pantryCount', 'cube-outline'],
  ['Rechnungen', 'billsOpen', 'receipt-outline'],
] as const;

export default function Today() {
  const id = useAppStore(s => s.activeHouseholdId)!;
  const rev = useAppStore(s => s.revision);
  const [name, setName] = useState('Zuhause');
  const [stats, setStats] = useState(empty);
  const [pending, setPending] = useState(0);

  useEffect(() => {
    let alive = true;
    void Promise.all([getHousehold(id), getDashboardStats(id), pendingSyncCount()])
      .then(([h, s, p]) => {
        if (!alive) return;
        setName(h?.name ?? 'Zuhause');
        setStats(s);
        setPending(p);
      })
      .catch(error => console.error('Dashboard konnte nicht geladen werden', error));
    return () => { alive = false; };
  }, [id, rev]);

  const date = new Intl.DateTimeFormat('de-AT', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date());

  return (
    <Screen>
      <View style={styles.hero}>
        <View style={styles.eyebrow}><View style={styles.dot}/><Text style={styles.eyebrowText}>{name}</Text></View>
        <Text style={styles.greeting}>Guten Tag</Text>
        <Text style={styles.date}>{date}</Text>
      </View>

      {pending > 0 ? (
        <View style={styles.syncPill}>
          <Ionicons name="cloud-upload-outline" size={17} color={colors.warning}/>
          <Text style={styles.syncText}>{pending} {pending === 1 ? 'Änderung wartet' : 'Änderungen warten'} auf Sync</Text>
        </View>
      ) : (
        <View style={[styles.syncPill, styles.syncOk]}>
          <Ionicons name="checkmark-circle" size={17} color={colors.success}/>
          <Text style={[styles.syncText, { color: colors.success }]}>Alles lokal gespeichert</Text>
        </View>
      )}

      <Card>
        <View style={styles.cardHeader}><Text style={styles.section}>Heute im Blick</Text><Text style={styles.caption}>Übersicht</Text></View>
        <View style={styles.grid}>
          {statMeta.map(([label, key, icon]) => (
            <View key={key} style={styles.stat}>
              <View style={styles.iconBox}><Ionicons name={icon} size={20} color={colors.accent}/></View>
              <Text style={styles.number}>{stats[key]}</Text>
              <Text style={styles.meta}>{label}</Text>
            </View>
          ))}
        </View>
      </Card>

      <Card>
        <View style={styles.moneyTop}>
          <View><Text style={styles.caption}>DIESER MONAT</Text><Text style={styles.section}>Ausgaben</Text></View>
          <View style={styles.moneyIcon}><Ionicons name="wallet-outline" size={22} color={colors.accent}/></View>
        </View>
        <Text style={styles.bigMoney}>{formatMoney(stats.monthSpend)}</Text>
        <Text style={styles.meta}>Lokal erfasste Haushaltsausgaben</Text>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { paddingTop: 4, paddingBottom: 4, gap: 3 },
  eyebrow: { flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 6 },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.success },
  eyebrowText: { fontSize: 13, fontWeight: '700', color: colors.textMuted },
  greeting: { fontSize: 36, lineHeight: 42, letterSpacing: -1.2, fontWeight: '800', color: colors.text },
  date: { fontSize: 16, color: colors.textMuted, textTransform: 'capitalize' },
  syncPill: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 12, paddingVertical: 8, borderRadius: radius.pill, backgroundColor: colors.warningSoft },
  syncOk: { backgroundColor: colors.successSoft },
  syncText: { fontSize: 13, fontWeight: '650', color: colors.warning },
  cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  section: { fontSize: 20, fontWeight: '800', letterSpacing: -0.4, color: colors.text },
  caption: { fontSize: 11, fontWeight: '800', letterSpacing: 0.7, color: colors.textMuted },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  stat: { width: '48%', minHeight: 126, padding: 14, backgroundColor: colors.surfaceMuted, borderRadius: radius.md, justifyContent: 'flex-end' },
  iconBox: { position: 'absolute', top: 13, right: 13, width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.accentSoft },
  number: { fontSize: 29, lineHeight: 34, fontWeight: '850', letterSpacing: -0.7, color: colors.text },
  meta: { fontSize: 13, lineHeight: 18, color: colors.textMuted },
  moneyTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  moneyIcon: { width: 44, height: 44, borderRadius: 15, backgroundColor: colors.accentSoft, alignItems: 'center', justifyContent: 'center' },
  bigMoney: { fontSize: 38, lineHeight: 45, fontWeight: '850', letterSpacing: -1.2, color: colors.text },
});
