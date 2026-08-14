import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { Screen } from '@/components/Screen';
import { EmptyState } from '@/components/EmptyState';
import { SwipeActionRow } from '@/components/SwipeActionRow';
import { deletePantry, deleteTask, listPantry, listTasks, toggleTask } from '@/repositories/homeRepo';
import type { PantryItem, Task } from '@/types/models';
import { useAppStore } from '@/store/appStore';
import { colors, radius, spacing } from '@/theme/theme';
import { isBelowMinimum } from '@/utils/rules';

const messageOf = (error: unknown) => error instanceof Error ? error.message : 'Unbekannter Fehler';

export default function Home() {
  const householdId = useAppStore(s => s.activeHouseholdId);
  const revision = useAppStore(s => s.revision);
  const bump = useAppStore(s => s.bump);
  const [mode, setMode] = useState<'pantry' | 'task'>('pantry');
  const [pantry, setPantry] = useState<PantryItem[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!householdId) return;
    const [nextPantry, nextTasks] = await Promise.all([listPantry(householdId), listTasks(householdId)]);
    setPantry(nextPantry);
    setTasks(nextTasks);
  }, [householdId]);

  useEffect(() => { void load().catch(error => Alert.alert('Zuhause', messageOf(error))); }, [load, revision]);

  const toggle = async (task: Task) => {
    if (busy) return;
    setBusy(true);
    try { await toggleTask(task.id, task.completed !== 1); await load(); bump(); }
    catch (error) { Alert.alert('Aufgabe', messageOf(error)); }
    finally { setBusy(false); }
  };

  const removePantry = async (item: PantryItem) => {
    if (busy) return;
    setBusy(true);
    try { await deletePantry(item.id); await load(); bump(); }
    catch (error) { Alert.alert('Löschen fehlgeschlagen', messageOf(error)); }
    finally { setBusy(false); }
  };

  const removeTask = async (task: Task) => {
    if (busy) return;
    setBusy(true);
    try { await deleteTask(task.id); await load(); bump(); }
    catch (error) { Alert.alert('Löschen fehlgeschlagen', messageOf(error)); }
    finally { setBusy(false); }
  };

  const openTasks = useMemo(() => tasks.filter(task => task.completed !== 1), [tasks]);
  const doneTasks = useMemo(() => tasks.filter(task => task.completed === 1), [tasks]);

  const renderPantry = (item: PantryItem) => {
    const low = isBelowMinimum(item.quantity, item.minimum_quantity);
    return <SwipeActionRow key={item.id} disabled={busy} onDelete={() => void removePantry(item)}>
      <View style={styles.row}>
        <View style={[styles.rowIcon, low && styles.warningIcon]}><Ionicons name="cube-outline" size={20} color={low ? colors.warning : colors.accent} /></View>
        <View style={styles.flex}><Text style={styles.rowTitle}>{item.name}</Text><Text style={styles.rowMeta}>{item.quantity} {item.unit ?? 'Stk.'} · Minimum {item.minimum_quantity}</Text></View>
        {low ? <View style={styles.warningBadge}><Text style={styles.warningText}>Nachkaufen</Text></View> : <Ionicons name="chevron-back-outline" size={17} color={colors.textSoft} />}
      </View>
    </SwipeActionRow>;
  };

  const renderTask = (task: Task) => {
    const completed = task.completed === 1;
    return <SwipeActionRow key={task.id} disabled={busy} onDelete={() => void removeTask(task)} onPrimaryAction={() => void toggle(task)} primaryLabel={completed ? 'Öffnen' : 'Erledigt'} primaryIcon={completed ? 'arrow-undo-outline' : 'checkmark-circle-outline'}>
      <Pressable onPress={() => void toggle(task)} style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}>
        <View style={[styles.taskCheck, completed && styles.taskCheckDone]}>{completed ? <Ionicons name="checkmark" size={18} color="#fff" /> : null}</View>
        <View style={styles.flex}><Text style={[styles.rowTitle, completed && styles.completedText]}>{task.title}</Text><Text style={styles.rowMeta}>{task.due_date ? `Fällig ${task.due_date}` : completed ? 'Erledigt' : 'Ohne Fälligkeitsdatum'}</Text></View>
        <Ionicons name="chevron-back-outline" size={17} color={colors.textSoft} />
      </Pressable>
    </SwipeActionRow>;
  };

  const section = (title: string, subtitle: string, count: number, children: React.ReactNode) => <View style={styles.sectionBlock}>
    <View style={styles.sectionHeader}><View><Text style={styles.sectionTitle}>{title}</Text><Text style={styles.sectionSubtitle}>{subtitle}</Text></View><View style={styles.countBadge}><Text style={styles.countText}>{count}</Text></View></View>
    <View style={styles.rows}>{children}</View>
  </View>;

  if (!householdId) return <Screen><EmptyState icon="home-outline" title="Kein Haushalt aktiv" body="Richte zuerst deinen Haushalt ein." /></Screen>;

  return <Screen>
    <View style={styles.hero}>
      <View style={styles.flex}><Text style={styles.kicker}>HAUSHALT</Text><Text style={styles.h1}>Zuhause</Text><Text style={styles.sub}>{mode === 'pantry' ? 'Vorräte verwalten' : `${openTasks.length} offene Aufgaben`}</Text></View>
      <Pressable onPress={() => router.push('/settings')} style={({ pressed }) => [styles.heroIcon, pressed && styles.pressed]}><Ionicons name="settings-outline" size={24} color={colors.accent} /></Pressable>
    </View>

    <View style={styles.segment}>
      <Pressable onPress={() => setMode('pantry')} style={[styles.segmentButton, mode === 'pantry' && styles.segmentActive]}><Ionicons name="cube-outline" size={18} color={mode === 'pantry' ? '#fff' : colors.textMuted} /><Text style={[styles.segmentText, mode === 'pantry' && styles.segmentTextActive]}>Vorrat</Text></Pressable>
      <Pressable onPress={() => setMode('task')} style={[styles.segmentButton, mode === 'task' && styles.segmentActive]}><Ionicons name="checkmark-circle-outline" size={18} color={mode === 'task' ? '#fff' : colors.textMuted} /><Text style={[styles.segmentText, mode === 'task' && styles.segmentTextActive]}>Aufgaben</Text></Pressable>
    </View>

    <View style={styles.quickInfo}><View style={styles.quickIcon}><Ionicons name="add" size={19} color={colors.accent} /></View><View style={styles.flex}><Text style={styles.quickTitle}>{mode === 'pantry' ? 'Vorrat hinzufügen' : 'Aufgabe hinzufügen'}</Text><Text style={styles.rowMeta}>Über das Plus unten in der Navigation.</Text></View></View>

    <View style={styles.swipeHint}><Ionicons name="swap-horizontal-outline" size={17} color={colors.textMuted} /><Text style={styles.swipeHintText}>{mode === 'task' ? 'Links: löschen · rechts: erledigen' : 'Nach links wischen zum Löschen'}</Text></View>

    {mode === 'pantry' ? (pantry.length ? section('Vorrat', 'Lebensmittel und Haushaltsartikel', pantry.length, pantry.map(renderPantry)) : <EmptyState icon="cube-outline" title="Noch kein Vorrat" body="Tippe unten auf + und füge deinen ersten Vorrat hinzu." />) : (tasks.length ? <>{openTasks.length ? section('Offen', 'Noch zu erledigen', openTasks.length, openTasks.map(renderTask)) : null}{doneTasks.length ? section('Erledigt', 'Abgeschlossene Aufgaben', doneTasks.length, doneTasks.map(renderTask)) : null}</> : <EmptyState icon="checkmark-done-outline" title="Keine Aufgaben" body="Tippe unten auf + und lege deine erste Aufgabe an." />)}
  </Screen>;
}

const styles = StyleSheet.create({
  flex: { flex: 1 }, hero: { flexDirection: 'row', alignItems: 'center', gap: spacing.md }, kicker: { fontSize: 11, fontWeight: '800', letterSpacing: 1.2, color: colors.textMuted }, h1: { fontSize: 38, lineHeight: 44, fontWeight: '800', letterSpacing: -1.35, color: colors.text }, sub: { marginTop: 2, fontSize: 15, color: colors.textMuted }, heroIcon: { width: 50, height: 50, borderRadius: 17, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  segment: { flexDirection: 'row', gap: 5, padding: 4, borderRadius: radius.md, backgroundColor: colors.surfaceMuted }, segmentButton: { flex: 1, minHeight: 46, borderRadius: 14, flexDirection: 'row', gap: 7, alignItems: 'center', justifyContent: 'center' }, segmentActive: { backgroundColor: colors.accent }, segmentText: { fontSize: 14, fontWeight: '700', color: colors.textMuted }, segmentTextActive: { color: '#fff' },
  quickInfo: { flexDirection: 'row', alignItems: 'center', gap: 11, padding: 14, borderRadius: radius.md, backgroundColor: colors.surfaceMuted }, quickIcon: { width: 38, height: 38, borderRadius: 12, backgroundColor: colors.accentSoft, alignItems: 'center', justifyContent: 'center' }, quickTitle: { fontSize: 15, fontWeight: '800', color: colors.text },
  pressed: { opacity: .75 }, swipeHint: { flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 4 }, swipeHintText: { fontSize: 11, color: colors.textMuted }, sectionBlock: { gap: 10 }, sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 3 }, sectionTitle: { fontSize: 20, fontWeight: '800', letterSpacing: -0.35, color: colors.text }, sectionSubtitle: { marginTop: 2, fontSize: 12, color: colors.textMuted }, countBadge: { minWidth: 30, height: 30, paddingHorizontal: 9, borderRadius: 15, backgroundColor: colors.surfaceMuted, alignItems: 'center', justifyContent: 'center' }, countText: { fontSize: 12, fontWeight: '800', color: colors.textMuted }, rows: { gap: 8 },
  row: { minHeight: 70, paddingHorizontal: 13, paddingVertical: 11, flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface }, rowPressed: { opacity: .75 }, rowIcon: { width: 42, height: 42, borderRadius: 14, backgroundColor: colors.accentSoft, alignItems: 'center', justifyContent: 'center' }, warningIcon: { backgroundColor: colors.warningSoft }, rowTitle: { fontSize: 16, fontWeight: '700', color: colors.text }, rowMeta: { marginTop: 2, fontSize: 12, lineHeight: 17, color: colors.textMuted }, warningBadge: { paddingHorizontal: 9, paddingVertical: 6, borderRadius: 999, backgroundColor: colors.warningSoft }, warningText: { fontSize: 10, fontWeight: '800', color: colors.warning }, taskCheck: { width: 28, height: 28, borderRadius: 10, borderWidth: 2, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' }, taskCheckDone: { backgroundColor: colors.success, borderColor: colors.success }, completedText: { textDecorationLine: 'line-through', color: colors.textMuted },
});
