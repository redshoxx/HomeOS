import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { Screen } from '@/components/Screen';
import { Card } from '@/components/Card';
import { EmptyState } from '@/components/EmptyState';
import { getHousehold } from '@/repositories/householdRepo';
import { listTasks, toggleTask } from '@/repositories/homeRepo';
import type { Task } from '@/types/models';
import { pendingSyncCount } from '@/database/queue';
import { getSetting } from '@/database/db';
import { useAppStore } from '@/store/appStore';
import { colors, radius } from '@/theme/theme';

const messageOf = (error: unknown) => error instanceof Error ? error.message : 'Unbekannter Fehler';
const localDateKey = () => {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

export default function Today() {
  const id = useAppStore(s => s.activeHouseholdId);
  const rev = useAppStore(s => s.revision);
  const bump = useAppStore(s => s.bump);
  const [name, setName] = useState('Zuhause');
  const [profileName, setProfileName] = useState('');
  const [tasks, setTasks] = useState<Task[]>([]);
  const [pending, setPending] = useState(0);
  const [showSync, setShowSync] = useState(true);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    const [household, nextTasks, nextPending, savedName, syncSetting] = await Promise.all([
      getHousehold(id), listTasks(id), pendingSyncCount(), getSetting('profile_name'), getSetting('show_sync_status'),
    ]);
    setName(household?.name ?? 'Zuhause');
    setProfileName(savedName ?? '');
    setTasks(nextTasks);
    setPending(nextPending);
    setShowSync(syncSetting !== 'false');
  }, [id]);

  useEffect(() => { void load().catch(error => Alert.alert('Heute', messageOf(error))); }, [load, rev]);

  const today = localDateKey();
  const dueToday = useMemo(() => tasks.filter(task => task.completed !== 1 && task.due_date && task.due_date <= today), [tasks, today]);

  const toggle = async (task: Task) => {
    if (busy) return;
    setBusy(true);
    try { await toggleTask(task.id, true); await load(); bump(); }
    catch (error) { Alert.alert('Aufgabe', messageOf(error)); }
    finally { setBusy(false); }
  };

  const date = new Intl.DateTimeFormat('de-AT', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date());

  return <Screen>
    <View style={styles.top}>
      <View style={styles.flex}>
        <View style={styles.eyebrow}><View style={styles.dot}/><Text style={styles.eyebrowText}>{name}</Text></View>
        <Text style={styles.h1}>{profileName ? `Hallo, ${profileName}` : 'Guten Tag'}</Text>
        <Text style={styles.date}>{date}</Text>
      </View>
      <Pressable onPress={() => router.push('/settings')} style={({ pressed }) => [styles.settings, pressed && styles.pressed]}><Ionicons name="settings-outline" size={23} color={colors.accent} /></Pressable>
    </View>

    {showSync ? <View style={[styles.sync, pending === 0 && styles.syncOk]}><Ionicons name={pending ? 'cloud-upload-outline' : 'checkmark-circle'} size={17} color={pending ? colors.warning : colors.success}/><Text style={[styles.syncText, pending === 0 && { color: colors.success }]}>{pending ? `${pending} Änderungen warten auf Sync` : 'Alles lokal gespeichert'}</Text></View> : null}

    <Card>
      <View style={styles.head}><View><Text style={styles.caption}>HEUTE</Text><Text style={styles.section}>Aufgaben</Text></View><View style={styles.countBadge}><Text style={styles.countText}>{dueToday.length}</Text></View></View>
      {dueToday.length ? <View style={styles.rows}>{dueToday.map(task => <Pressable key={task.id} disabled={busy} onPress={() => void toggle(task)} style={({ pressed }) => [styles.task, pressed && styles.pressed]}>
        <View style={styles.check}><Ionicons name="checkmark" size={16} color={colors.textSoft} /></View>
        <View style={styles.flex}><Text style={styles.taskTitle}>{task.title}</Text><Text style={styles.taskMeta}>{task.due_date === today ? 'Heute fällig' : `Überfällig · ${task.due_date}`}</Text></View>
        <Ionicons name="chevron-forward" size={18} color={colors.textSoft} />
      </Pressable>)}</View> : <EmptyState icon="checkmark-circle-outline" title="Heute ist nichts fällig" body="Neue Aufgaben kannst du über das Plus unten anlegen." />}
    </Card>
  </Screen>;
}

const styles = StyleSheet.create({
  flex: { flex: 1 }, top: { flexDirection: 'row', alignItems: 'flex-start', gap: 14 }, eyebrow: { flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 6 }, dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.success }, eyebrowText: { fontSize: 13, fontWeight: '700', color: colors.textMuted }, h1: { fontSize: 36, lineHeight: 42, fontWeight: '800', letterSpacing: -1.2, color: colors.text }, date: { fontSize: 16, color: colors.textMuted, textTransform: 'capitalize' }, settings: { width: 48, height: 48, borderRadius: 16, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' }, pressed: { opacity: .72 },
  sync: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 12, paddingVertical: 8, borderRadius: radius.pill, backgroundColor: colors.warningSoft }, syncOk: { backgroundColor: colors.successSoft }, syncText: { fontSize: 13, fontWeight: '600', color: colors.warning }, head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, section: { fontSize: 22, fontWeight: '800', letterSpacing: -.4, color: colors.text }, caption: { fontSize: 11, fontWeight: '800', letterSpacing: .7, color: colors.textMuted }, countBadge: { minWidth: 34, height: 34, borderRadius: 17, paddingHorizontal: 9, backgroundColor: colors.accentSoft, alignItems: 'center', justifyContent: 'center' }, countText: { fontSize: 13, fontWeight: '800', color: colors.accent }, rows: { gap: 9, marginTop: 14 }, task: { minHeight: 68, flexDirection: 'row', alignItems: 'center', gap: 11, paddingHorizontal: 12, paddingVertical: 10, borderRadius: radius.md, backgroundColor: colors.surfaceMuted }, check: { width: 30, height: 30, borderRadius: 10, borderWidth: 2, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' }, taskTitle: { fontSize: 16, fontWeight: '700', color: colors.text }, taskMeta: { marginTop: 2, fontSize: 12, color: colors.textMuted },
});
