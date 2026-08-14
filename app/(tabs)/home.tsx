import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { Screen } from '@/components/Screen';
import { AppHeader } from '@/components/AppHeader';
import { EmptyState } from '@/components/EmptyState';
import { SwipeActionRow } from '@/components/SwipeActionRow';
import { deletePantry, deleteTask, listPantry, listTasks, toggleTask } from '@/repositories/homeRepo';
import type { PantryItem, Task } from '@/types/models';
import { getSetting } from '@/database/db';
import { useAppStore } from '@/store/appStore';
import { colors, radius } from '@/theme/theme';
import { isBelowMinimum } from '@/utils/rules';

const messageOf = (error: unknown) => error instanceof Error ? error.message : 'Unbekannter Fehler';
const localDateKey = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export default function Home() {
  const householdId = useAppStore(s => s.activeHouseholdId);
  const revision = useAppStore(s => s.revision);
  const bump = useAppStore(s => s.bump);
  const [mode, setMode] = useState<'task' | 'pantry'>('task');
  const [pantry, setPantry] = useState<PantryItem[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [showDone, setShowDone] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!householdId) return;
    const [nextPantry, nextTasks] = await Promise.all([listPantry(householdId), listTasks(householdId)]);
    setPantry(nextPantry);
    setTasks(nextTasks);
  }, [householdId]);

  useEffect(() => {
    void getSetting('default_home_view').then(value => {
      if (value === 'pantry' || value === 'task') setMode(value);
    }).catch(() => undefined);
  }, []);

  useEffect(() => {
    void load().catch(error => Alert.alert('Zuhause', messageOf(error)));
  }, [load, revision]);

  const openTasks = useMemo(() => tasks.filter(task => task.completed !== 1), [tasks]);
  const doneTasks = useMemo(() => tasks.filter(task => task.completed === 1), [tasks]);
  const lowCount = useMemo(() => pantry.filter(item => isBelowMinimum(item.quantity, item.minimum_quantity)).length, [pantry]);
  const today = localDateKey();

  const toggle = async (task: Task) => {
    if (busy) return;
    setBusy(true);
    try {
      await toggleTask(task.id, task.completed !== 1);
      await load();
      bump();
    } catch (error) {
      Alert.alert('Aufgabe', messageOf(error));
    } finally {
      setBusy(false);
    }
  };

  const removePantry = async (item: PantryItem) => {
    if (busy) return;
    setBusy(true);
    try {
      await deletePantry(item.id);
      await load();
      bump();
    } catch (error) {
      Alert.alert('Löschen fehlgeschlagen', messageOf(error));
    } finally {
      setBusy(false);
    }
  };

  const removeTask = async (task: Task) => {
    if (busy) return;
    setBusy(true);
    try {
      await deleteTask(task.id);
      await load();
      bump();
    } catch (error) {
      Alert.alert('Löschen fehlgeschlagen', messageOf(error));
    } finally {
      setBusy(false);
    }
  };

  const taskMeta = (task: Task) => {
    if (!task.due_date) return 'Ohne Termin';
    if (task.due_date === today) return 'Heute';
    if (task.due_date < today) return `Überfällig · ${task.due_date}`;
    return `Fällig ${task.due_date}`;
  };

  const taskRow = (task: Task) => {
    const completed = task.completed === 1;
    return (
      <SwipeActionRow
        key={task.id}
        disabled={busy}
        onDelete={() => void removeTask(task)}
        onPrimaryAction={() => void toggle(task)}
        primaryLabel={completed ? 'Zurück' : 'Erledigt'}
        primaryIcon={completed ? 'arrow-undo-outline' : 'checkmark-circle-outline'}
      >
        <Pressable onPress={() => void toggle(task)} style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
          <View style={[styles.check, completed && styles.checkDone]}>{completed ? <Ionicons name="checkmark" size={17} color="#fff" /> : null}</View>
          <View style={styles.flex}><Text style={[styles.name, completed && styles.completed]} numberOfLines={2}>{task.title}</Text><Text style={styles.meta}>{completed ? 'Erledigt' : taskMeta(task)}</Text></View>
        </Pressable>
      </SwipeActionRow>
    );
  };

  const pantryRow = (item: PantryItem) => {
    const low = isBelowMinimum(item.quantity, item.minimum_quantity);
    return (
      <SwipeActionRow key={item.id} disabled={busy} onDelete={() => void removePantry(item)}>
        <View style={styles.row}>
          <View style={[styles.stockIcon, low && styles.stockLow]}><Ionicons name="cube-outline" size={18} color={low ? colors.warning : colors.accent} /></View>
          <View style={styles.flex}><Text style={styles.name} numberOfLines={2}>{item.name}</Text><Text style={styles.meta}>{item.quantity} {item.unit ?? 'Stk.'}{item.minimum_quantity > 0 ? ` · Minimum ${item.minimum_quantity}` : ''}</Text></View>
          {low ? <View style={styles.lowBadge}><Text style={styles.lowText}>Knapp</Text></View> : null}
        </View>
      </SwipeActionRow>
    );
  };

  if (!householdId) return <Screen><EmptyState icon="home-outline" title="Kein Haushalt aktiv" body="Richte zuerst deinen Haushalt ein." /></Screen>;

  return (
    <Screen>
      <AppHeader
        eyebrow="ZUHAUSE"
        title={mode === 'task' ? 'Aufgaben' : 'Vorrat'}
        subtitle={mode === 'task' ? `${openTasks.length} offen` : lowCount ? `${lowCount} Artikel knapp` : `${pantry.length} Artikel gespeichert`}
      />

      <View style={styles.segment}>
        <Pressable onPress={() => setMode('task')} style={[styles.segmentButton, mode === 'task' && styles.segmentActive]}>
          <Ionicons name="checkmark-circle-outline" size={18} color={mode === 'task' ? '#fff' : colors.textMuted} />
          <Text style={[styles.segmentText, mode === 'task' && styles.segmentTextActive]}>Aufgaben</Text>
        </Pressable>
        <Pressable onPress={() => setMode('pantry')} style={[styles.segmentButton, mode === 'pantry' && styles.segmentActive]}>
          <Ionicons name="cube-outline" size={18} color={mode === 'pantry' ? '#fff' : colors.textMuted} />
          <Text style={[styles.segmentText, mode === 'pantry' && styles.segmentTextActive]}>Vorrat</Text>
        </Pressable>
      </View>

      <Pressable onPress={() => router.push({ pathname: '/(tabs)/add', params: { type: mode } })} style={({ pressed }) => [styles.addShortcut, pressed && styles.pressed]}>
        <View style={styles.addIcon}><Ionicons name="add" size={22} color="#fff" /></View>
        <View style={styles.flex}><Text style={styles.addTitle}>{mode === 'task' ? 'Aufgabe hinzufügen' : 'Vorrat hinzufügen'}</Text><Text style={styles.meta}>Direkt über das Plus erfassen</Text></View>
        <Ionicons name="chevron-forward" size={18} color={colors.textSoft} />
      </Pressable>

      {mode === 'task' ? (
        tasks.length ? (
          <>
            {openTasks.length ? <View style={styles.list}>{openTasks.map(taskRow)}</View> : <EmptyState icon="checkmark-circle-outline" title="Keine offenen Aufgaben" body="Alles erledigt." />}
            {doneTasks.length ? (
              <View style={styles.doneBlock}>
                <Pressable onPress={() => setShowDone(value => !value)} style={({ pressed }) => [styles.doneToggle, pressed && styles.pressed]}>
                  <Text style={styles.doneTitle}>Erledigte ({doneTasks.length})</Text>
                  <Ionicons name={showDone ? 'chevron-up' : 'chevron-down'} size={19} color={colors.textMuted} />
                </Pressable>
                {showDone ? <View style={styles.list}>{doneTasks.map(taskRow)}</View> : null}
              </View>
            ) : null}
          </>
        ) : <EmptyState icon="checkmark-done-outline" title="Noch keine Aufgaben" body="Tippe auf + und lege die erste Aufgabe an." />
      ) : pantry.length ? <View style={styles.list}>{pantry.map(pantryRow)}</View> : <EmptyState icon="cube-outline" title="Noch kein Vorrat" body="Tippe auf + und füge den ersten Artikel hinzu." />}

      <Text style={styles.hint}>{mode === 'task' ? 'Wischen: links löschen · rechts erledigen' : 'Nach links wischen zum Löschen'}</Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  pressed: { opacity: 0.7 },
  segment: { flexDirection: 'row', gap: 5, padding: 4, borderRadius: radius.md, backgroundColor: colors.surfaceMuted },
  segmentButton: { flex: 1, minHeight: 44, borderRadius: 14, flexDirection: 'row', gap: 7, alignItems: 'center', justifyContent: 'center' },
  segmentActive: { backgroundColor: colors.accent },
  segmentText: { fontSize: 13, fontWeight: '700', color: colors.textMuted },
  segmentTextActive: { color: '#fff' },
  addShortcut: { minHeight: 68, padding: 11, borderRadius: radius.md, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, flexDirection: 'row', alignItems: 'center', gap: 11 },
  addIcon: { width: 42, height: 42, borderRadius: 14, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' },
  addTitle: { fontSize: 15, fontWeight: '800', color: colors.text },
  list: { gap: 7 },
  row: { minHeight: 62, paddingHorizontal: 13, paddingVertical: 10, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, flexDirection: 'row', alignItems: 'center', gap: 11 },
  check: { width: 29, height: 29, borderRadius: 10, borderWidth: 2, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  checkDone: { borderColor: colors.success, backgroundColor: colors.success },
  stockIcon: { width: 38, height: 38, borderRadius: 12, backgroundColor: colors.accentSoft, alignItems: 'center', justifyContent: 'center' },
  stockLow: { backgroundColor: colors.warningSoft },
  name: { fontSize: 15, lineHeight: 20, fontWeight: '700', color: colors.text },
  completed: { textDecorationLine: 'line-through', color: colors.textMuted },
  meta: { marginTop: 2, fontSize: 11, lineHeight: 16, color: colors.textMuted },
  lowBadge: { paddingHorizontal: 8, paddingVertical: 5, borderRadius: radius.pill, backgroundColor: colors.warningSoft },
  lowText: { fontSize: 10, fontWeight: '800', color: colors.warning },
  doneBlock: { gap: 8 },
  doneToggle: { minHeight: 48, paddingHorizontal: 13, borderRadius: radius.md, backgroundColor: colors.surfaceMuted, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  doneTitle: { fontSize: 13, fontWeight: '800', color: colors.text },
  hint: { textAlign: 'center', fontSize: 10, color: colors.textSoft },
});
