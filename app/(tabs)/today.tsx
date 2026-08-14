import { useCallback, useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { Screen } from '@/components/Screen';
import { AppHeader } from '@/components/AppHeader';
import { getHousehold } from '@/repositories/householdRepo';
import { getDashboardStats, type DashboardStats } from '@/repositories/dashboardRepo';
import { listDueTasks, toggleTask } from '@/repositories/homeRepo';
import type { Task } from '@/types/models';
import { pendingSyncCount } from '@/database/queue';
import { getSetting } from '@/database/db';
import { useAppStore } from '@/store/appStore';
import { colors, radius } from '@/theme/theme';
import { formatMoney } from '@/utils/money';

const emptyStats: DashboardStats = { shoppingOpen: 0, tasksOpen: 0, pantryCount: 0, billsOpen: 0, monthSpend: 0 };
const messageOf = (error: unknown) => error instanceof Error ? error.message : 'Unbekannter Fehler';
const localDateKey = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export default function Today() {
  const householdId = useAppStore(s => s.activeHouseholdId);
  const revision = useAppStore(s => s.revision);
  const bump = useAppStore(s => s.bump);
  const [householdName, setHouseholdName] = useState('Zuhause');
  const [profileName, setProfileName] = useState('');
  const [stats, setStats] = useState<DashboardStats>(emptyStats);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [pending, setPending] = useState(0);
  const [showSync, setShowSync] = useState(true);
  const [busy, setBusy] = useState(false);

  const today = localDateKey();

  const load = useCallback(async () => {
    if (!householdId) return;
    const [household, nextStats, nextTasks, nextPending, savedName, syncSetting] = await Promise.all([
      getHousehold(householdId),
      getDashboardStats(householdId),
      listDueTasks(householdId, today, 5),
      pendingSyncCount(),
      getSetting('profile_name'),
      getSetting('show_sync_status'),
    ]);
    setHouseholdName(household?.name ?? 'Zuhause');
    setStats(nextStats);
    setTasks(nextTasks);
    setPending(nextPending);
    setProfileName(savedName ?? '');
    setShowSync(syncSetting !== 'false');
  }, [householdId, today]);

  useEffect(() => {
    void load().catch(error => Alert.alert('Start', messageOf(error)));
  }, [load, revision]);

  const complete = async (task: Task) => {
    if (busy) return;
    setBusy(true);
    try {
      await toggleTask(task.id, true);
      await load();
      bump();
    } catch (error) {
      Alert.alert('Aufgabe', messageOf(error));
    } finally {
      setBusy(false);
    }
  };

  const date = new Intl.DateTimeFormat('de-AT', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date());

  return (
    <Screen>
      <AppHeader
        eyebrow={householdName.toUpperCase()}
        title={profileName ? `Hallo, ${profileName}` : 'Hallo'}
        subtitle={date}
        right={
          <Pressable onPress={() => router.push('/settings')} style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}>
            <Ionicons name="settings-outline" size={22} color={colors.text} />
          </Pressable>
        }
      />

      <View style={styles.quickGrid}>
        <Pressable onPress={() => router.push('/(tabs)/shopping')} style={({ pressed }) => [styles.quickCard, pressed && styles.pressed]}>
          <View style={styles.quickIcon}><Ionicons name="cart-outline" size={19} color={colors.accent} /></View>
          <Text style={styles.quickValue}>{stats.shoppingOpen}</Text>
          <Text style={styles.quickLabel}>Einkauf offen</Text>
        </Pressable>
        <Pressable onPress={() => router.push('/(tabs)/home')} style={({ pressed }) => [styles.quickCard, pressed && styles.pressed]}>
          <View style={styles.quickIcon}><Ionicons name="checkmark-circle-outline" size={19} color={colors.accent} /></View>
          <Text style={styles.quickValue}>{stats.tasksOpen}</Text>
          <Text style={styles.quickLabel}>Aufgaben</Text>
        </Pressable>
        <Pressable onPress={() => router.push('/(tabs)/finance')} style={({ pressed }) => [styles.quickCard, pressed && styles.pressed]}>
          <View style={styles.quickIcon}><Ionicons name="wallet-outline" size={19} color={colors.accent} /></View>
          <Text style={styles.quickMoney} numberOfLines={1}>{formatMoney(stats.monthSpend)}</Text>
          <Text style={styles.quickLabel}>diesen Monat</Text>
        </Pressable>
      </View>

      <View style={styles.sectionHead}>
        <View>
          <Text style={styles.sectionEyebrow}>HEUTE</Text>
          <Text style={styles.sectionTitle}>Was ansteht</Text>
        </View>
        <Pressable onPress={() => router.push('/(tabs)/home')} hitSlop={10}><Text style={styles.link}>Alle Aufgaben</Text></Pressable>
      </View>

      <View style={styles.taskCard}>
        {tasks.length ? tasks.map((task, index) => (
          <Pressable key={task.id} disabled={busy} onPress={() => void complete(task)} style={({ pressed }) => [styles.taskRow, index > 0 && styles.rowBorder, pressed && styles.pressed]}>
            <View style={styles.check}><Ionicons name="checkmark" size={15} color={colors.textSoft} /></View>
            <View style={styles.flex}>
              <Text style={styles.taskTitle} numberOfLines={2}>{task.title}</Text>
              <Text style={styles.taskMeta}>{task.due_date === today ? 'Heute' : `Überfällig · ${task.due_date}`}</Text>
            </View>
          </Pressable>
        )) : (
          <View style={styles.empty}>
            <View style={styles.emptyIcon}><Ionicons name="checkmark-done" size={21} color={colors.success} /></View>
            <View style={styles.flex}><Text style={styles.emptyTitle}>Heute ist alles erledigt</Text><Text style={styles.emptyText}>Neue Einträge legst du direkt über das Plus unten an.</Text></View>
          </View>
        )}
      </View>

      <Pressable onPress={() => router.push('/(tabs)/add')} style={({ pressed }) => [styles.primaryAction, pressed && styles.pressed]}>
        <View style={styles.primaryIcon}><Ionicons name="add" size={24} color="#fff" /></View>
        <View style={styles.flex}><Text style={styles.primaryTitle}>Schnell hinzufügen</Text><Text style={styles.primaryText}>Produkt, Aufgabe, Vorrat oder Ausgabe</Text></View>
        <Ionicons name="chevron-forward" size={18} color="rgba(255,255,255,.7)" />
      </Pressable>

      {showSync ? (
        <View style={styles.syncRow}>
          <Ionicons name={pending ? 'cloud-upload-outline' : 'cloud-done-outline'} size={16} color={pending ? colors.warning : colors.success} />
          <Text style={styles.syncText}>{pending ? `${pending} Änderungen warten auf Synchronisierung` : 'Daten sind gespeichert'}</Text>
        </View>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  pressed: { opacity: 0.7 },
  iconButton: { width: 44, height: 44, borderRadius: 15, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  quickGrid: { flexDirection: 'row', gap: 8 },
  quickCard: { flex: 1, minHeight: 116, padding: 12, borderRadius: radius.md, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, justifyContent: 'flex-end' },
  quickIcon: { position: 'absolute', top: 11, right: 11, width: 34, height: 34, borderRadius: 11, backgroundColor: colors.accentSoft, alignItems: 'center', justifyContent: 'center' },
  quickValue: { fontSize: 28, lineHeight: 32, fontWeight: '800', letterSpacing: -0.8, color: colors.text },
  quickMoney: { fontSize: 18, lineHeight: 24, fontWeight: '800', letterSpacing: -0.4, color: colors.text },
  quickLabel: { marginTop: 2, fontSize: 11, lineHeight: 15, color: colors.textMuted },
  sectionHead: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12 },
  sectionEyebrow: { fontSize: 10, fontWeight: '800', letterSpacing: 1, color: colors.textMuted },
  sectionTitle: { marginTop: 2, fontSize: 22, lineHeight: 28, fontWeight: '800', letterSpacing: -0.5, color: colors.text },
  link: { fontSize: 13, fontWeight: '700', color: colors.accent },
  taskCard: { borderRadius: radius.lg, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' },
  taskRow: { minHeight: 66, paddingHorizontal: 14, paddingVertical: 11, flexDirection: 'row', alignItems: 'center', gap: 11 },
  rowBorder: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  check: { width: 28, height: 28, borderRadius: 10, borderWidth: 2, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  taskTitle: { fontSize: 15, lineHeight: 20, fontWeight: '700', color: colors.text },
  taskMeta: { marginTop: 2, fontSize: 11, color: colors.textMuted },
  empty: { minHeight: 92, padding: 15, flexDirection: 'row', alignItems: 'center', gap: 12 },
  emptyIcon: { width: 42, height: 42, borderRadius: 14, backgroundColor: colors.successSoft, alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { fontSize: 15, fontWeight: '800', color: colors.text },
  emptyText: { marginTop: 2, fontSize: 12, lineHeight: 17, color: colors.textMuted },
  primaryAction: { minHeight: 78, padding: 13, borderRadius: radius.lg, backgroundColor: colors.accent, flexDirection: 'row', alignItems: 'center', gap: 12 },
  primaryIcon: { width: 46, height: 46, borderRadius: 15, backgroundColor: 'rgba(255,255,255,.14)', alignItems: 'center', justifyContent: 'center' },
  primaryTitle: { fontSize: 16, fontWeight: '800', color: '#fff' },
  primaryText: { marginTop: 2, fontSize: 11, color: 'rgba(255,255,255,.68)' },
  syncRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 2 },
  syncText: { fontSize: 11, color: colors.textMuted },
});
