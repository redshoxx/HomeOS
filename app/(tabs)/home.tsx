import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Screen } from '@/components/Screen';
import { EmptyState } from '@/components/EmptyState';
import { SwipeActionRow } from '@/components/SwipeActionRow';
import { addPantry, addTask, deletePantry, deleteTask, listPantry, listTasks, toggleTask } from '@/repositories/homeRepo';
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
  const [text, setText] = useState('');
  const [pantry, setPantry] = useState<PantryItem[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!householdId) return;
    const [nextPantry, nextTasks] = await Promise.all([listPantry(householdId), listTasks(householdId)]);
    setPantry(nextPantry);
    setTasks(nextTasks);
  }, [householdId]);

  useEffect(() => {
    void load().catch(error => Alert.alert('Zuhause', messageOf(error)));
  }, [load, revision]);

  const add = async () => {
    if (!householdId || !text.trim() || busy) return;
    setBusy(true);
    try {
      if (mode === 'pantry') await addPantry(householdId, text.trim());
      else await addTask(householdId, text.trim());
      setText('');
      await load();
      bump();
    } catch (error) {
      Alert.alert('Speichern fehlgeschlagen', messageOf(error));
    } finally {
      setBusy(false);
    }
  };

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

  const openTasks = useMemo(() => tasks.filter(task => task.completed !== 1), [tasks]);
  const doneTasks = useMemo(() => tasks.filter(task => task.completed === 1), [tasks]);
  const lowPantry = useMemo(() => pantry.filter(item => isBelowMinimum(item.quantity, item.minimum_quantity)), [pantry]);

  const renderPantry = (item: PantryItem) => {
    const low = isBelowMinimum(item.quantity, item.minimum_quantity);
    return (
      <SwipeActionRow key={item.id} disabled={busy} onDelete={() => void removePantry(item)}>
        <View style={styles.row}>
          <View style={[styles.rowIcon, low && styles.warningIcon]}>
            <Ionicons name="cube-outline" size={20} color={low ? colors.warning : colors.accent} />
          </View>
          <View style={styles.flex}>
            <Text style={styles.rowTitle}>{item.name}</Text>
            <Text style={styles.rowMeta}>{item.quantity} {item.unit ?? 'Stk.'} · Minimum {item.minimum_quantity}</Text>
          </View>
          {low ? <View style={styles.warningBadge}><Text style={styles.warningText}>Nachkaufen</Text></View> : <Ionicons name="chevron-back-outline" size={17} color={colors.textSoft} />}
        </View>
      </SwipeActionRow>
    );
  };

  const renderTask = (task: Task) => {
    const completed = task.completed === 1;
    return (
      <SwipeActionRow
        key={task.id}
        disabled={busy}
        onDelete={() => void removeTask(task)}
        onPrimaryAction={() => void toggle(task)}
        primaryLabel={completed ? 'Öffnen' : 'Erledigt'}
        primaryIcon={completed ? 'arrow-undo-outline' : 'checkmark-circle-outline'}
      >
        <Pressable onPress={() => void toggle(task)} style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}>
          <View style={[styles.taskCheck, completed && styles.taskCheckDone]}>
            {completed ? <Ionicons name="checkmark" size={18} color="#fff" /> : null}
          </View>
          <View style={styles.flex}>
            <Text style={[styles.rowTitle, completed && styles.completedText]}>{task.title}</Text>
            <Text style={styles.rowMeta}>{task.due_date ? `Fällig ${task.due_date}` : completed ? 'Erledigt' : 'Ohne Fälligkeitsdatum'}</Text>
          </View>
          <Ionicons name="chevron-back-outline" size={17} color={colors.textSoft} />
        </Pressable>
      </SwipeActionRow>
    );
  };

  const section = (title: string, subtitle: string, count: number, children: React.ReactNode) => (
    <View style={styles.sectionBlock}>
      <View style={styles.sectionHeader}>
        <View>
          <Text style={styles.sectionTitle}>{title}</Text>
          <Text style={styles.sectionSubtitle}>{subtitle}</Text>
        </View>
        <View style={styles.countBadge}><Text style={styles.countText}>{count}</Text></View>
      </View>
      <View style={styles.rows}>{children}</View>
    </View>
  );

  if (!householdId) return <Screen><EmptyState icon="home-outline" title="Kein Haushalt aktiv" body="Richte zuerst deinen Haushalt ein." /></Screen>;

  return (
    <Screen>
      <View style={styles.hero}>
        <View style={styles.flex}>
          <Text style={styles.kicker}>HAUSHALT</Text>
          <Text style={styles.h1}>Zuhause</Text>
          <Text style={styles.sub}>{pantry.length} Vorräte · {openTasks.length} offene Aufgaben</Text>
        </View>
        <View style={styles.heroIcon}><Ionicons name="home-outline" size={25} color={colors.accent} /></View>
      </View>

      <View style={styles.dashboard}>
        <View style={styles.dashboardItem}>
          <View style={styles.dashboardIcon}><Ionicons name="cube-outline" size={19} color={colors.accent} /></View>
          <Text style={styles.dashboardValue}>{pantry.length}</Text>
          <Text style={styles.dashboardLabel}>Vorräte</Text>
        </View>
        <View style={styles.dashboardDivider} />
        <View style={styles.dashboardItem}>
          <View style={[styles.dashboardIcon, lowPantry.length > 0 && styles.dashboardWarning]}><Ionicons name="alert-circle-outline" size={19} color={lowPantry.length > 0 ? colors.warning : colors.accent} /></View>
          <Text style={styles.dashboardValue}>{lowPantry.length}</Text>
          <Text style={styles.dashboardLabel}>knapp</Text>
        </View>
        <View style={styles.dashboardDivider} />
        <View style={styles.dashboardItem}>
          <View style={styles.dashboardIcon}><Ionicons name="checkmark-circle-outline" size={19} color={colors.accent} /></View>
          <Text style={styles.dashboardValue}>{openTasks.length}</Text>
          <Text style={styles.dashboardLabel}>Aufgaben</Text>
        </View>
      </View>

      <View style={styles.segment}>
        <Pressable onPress={() => setMode('pantry')} style={[styles.segmentButton, mode === 'pantry' && styles.segmentActive]}>
          <Ionicons name="cube-outline" size={18} color={mode === 'pantry' ? '#fff' : colors.textMuted} />
          <Text style={[styles.segmentText, mode === 'pantry' && styles.segmentTextActive]}>Vorrat</Text>
        </Pressable>
        <Pressable onPress={() => setMode('task')} style={[styles.segmentButton, mode === 'task' && styles.segmentActive]}>
          <Ionicons name="checkmark-circle-outline" size={18} color={mode === 'task' ? '#fff' : colors.textMuted} />
          <Text style={[styles.segmentText, mode === 'task' && styles.segmentTextActive]}>Aufgaben</Text>
        </Pressable>
      </View>

      <View style={styles.composer}>
        <View style={styles.composerTop}>
          <View style={styles.composerIcon}><Ionicons name={mode === 'pantry' ? 'cube-outline' : 'checkmark-outline'} size={19} color={colors.accent} /></View>
          <View style={styles.flex}>
            <Text style={styles.composerTitle}>{mode === 'pantry' ? 'Vorrat hinzufügen' : 'Neue Aufgabe'}</Text>
            <Text style={styles.composerHint}>{mode === 'pantry' ? 'Lebensmittel oder Haushaltsartikel' : 'Was muss erledigt werden?'}</Text>
          </View>
        </View>
        <View style={styles.addRow}>
          <TextInput
            style={styles.input}
            placeholder={mode === 'pantry' ? 'z. B. Kaffee' : 'z. B. Müll rausbringen'}
            placeholderTextColor={colors.textSoft}
            value={text}
            onChangeText={setText}
            onSubmitEditing={() => void add()}
            editable={!busy}
            returnKeyType="done"
          />
          <Pressable disabled={!text.trim() || busy} onPress={() => void add()} style={({ pressed }) => [styles.addButton, (!text.trim() || busy) && styles.disabled, pressed && styles.pressed]}>
            <Ionicons name="arrow-up" size={22} color="#fff" />
          </Pressable>
        </View>
      </View>

      <View style={styles.swipeHint}>
        <Ionicons name="swap-horizontal-outline" size={17} color={colors.textMuted} />
        <Text style={styles.swipeHintText}>{mode === 'task' ? 'Links: löschen · rechts: erledigen' : 'Nach links wischen zum Löschen'}</Text>
      </View>

      {mode === 'pantry' ? (
        pantry.length ? section('Vorrat', lowPantry.length ? `${lowPantry.length} Artikel unter Mindestbestand` : 'Alles ausreichend vorhanden', pantry.length, pantry.map(renderPantry)) :
          <EmptyState icon="cube-outline" title="Noch kein Vorrat" body="Füge Lebensmittel oder Haushaltsartikel hinzu." />
      ) : (
        tasks.length ? <>
          {openTasks.length ? section('Offen', 'Noch zu erledigen', openTasks.length, openTasks.map(renderTask)) : null}
          {doneTasks.length ? section('Erledigt', 'Abgeschlossene Aufgaben', doneTasks.length, doneTasks.map(renderTask)) : null}
        </> : <EmptyState icon="checkmark-done-outline" title="Keine Aufgaben" body="Lege deine erste Aufgabe an." />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  hero: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  kicker: { fontSize: 11, fontWeight: '800', letterSpacing: 1.2, color: colors.textMuted },
  h1: { fontSize: 38, lineHeight: 44, fontWeight: '800', letterSpacing: -1.35, color: colors.text },
  sub: { marginTop: 2, fontSize: 15, color: colors.textMuted },
  heroIcon: { width: 54, height: 54, borderRadius: 18, backgroundColor: colors.accentSoft, alignItems: 'center', justifyContent: 'center' },
  dashboard: { flexDirection: 'row', padding: 14, borderRadius: radius.lg, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  dashboardItem: { flex: 1, alignItems: 'center', gap: 3 },
  dashboardDivider: { width: 1, backgroundColor: colors.border, marginVertical: 4 },
  dashboardIcon: { width: 35, height: 35, borderRadius: 12, backgroundColor: colors.accentSoft, alignItems: 'center', justifyContent: 'center', marginBottom: 2 },
  dashboardWarning: { backgroundColor: colors.warningSoft },
  dashboardValue: { fontSize: 21, fontWeight: '800', color: colors.text },
  dashboardLabel: { fontSize: 11, color: colors.textMuted },
  segment: { flexDirection: 'row', gap: 5, padding: 4, borderRadius: radius.md, backgroundColor: colors.surfaceMuted },
  segmentButton: { flex: 1, minHeight: 46, borderRadius: 14, flexDirection: 'row', gap: 7, alignItems: 'center', justifyContent: 'center' },
  segmentActive: { backgroundColor: colors.accent },
  segmentText: { fontSize: 14, fontWeight: '700', color: colors.textMuted },
  segmentTextActive: { color: '#fff' },
  composer: { padding: 16, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, gap: 14 },
  composerTop: { flexDirection: 'row', alignItems: 'center', gap: 11 },
  composerIcon: { width: 38, height: 38, borderRadius: 12, backgroundColor: colors.accentSoft, alignItems: 'center', justifyContent: 'center' },
  composerTitle: { fontSize: 16, fontWeight: '800', color: colors.text },
  composerHint: { marginTop: 2, fontSize: 12, color: colors.textMuted },
  addRow: { flexDirection: 'row', gap: 9 },
  input: { flex: 1, height: 52, borderRadius: 15, backgroundColor: colors.surfaceMuted, paddingHorizontal: 15, fontSize: 16, color: colors.text },
  addButton: { width: 52, height: 52, borderRadius: 15, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' },
  disabled: { opacity: 0.4 },
  pressed: { opacity: 0.78 },
  swipeHint: { flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 4 },
  swipeHintText: { fontSize: 11, color: colors.textMuted },
  sectionBlock: { gap: 10 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 3 },
  sectionTitle: { fontSize: 20, fontWeight: '800', letterSpacing: -0.35, color: colors.text },
  sectionSubtitle: { marginTop: 2, fontSize: 12, color: colors.textMuted },
  countBadge: { minWidth: 30, height: 30, paddingHorizontal: 9, borderRadius: 15, backgroundColor: colors.surfaceMuted, alignItems: 'center', justifyContent: 'center' },
  countText: { fontSize: 12, fontWeight: '800', color: colors.textMuted },
  rows: { gap: 8 },
  row: { minHeight: 70, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 13, paddingVertical: 11, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, backgroundColor: colors.surface },
  rowPressed: { opacity: 0.75 },
  rowIcon: { width: 42, height: 42, borderRadius: 14, backgroundColor: colors.accentSoft, alignItems: 'center', justifyContent: 'center' },
  warningIcon: { backgroundColor: colors.warningSoft },
  rowTitle: { fontSize: 16, fontWeight: '700', color: colors.text },
  rowMeta: { marginTop: 3, fontSize: 12, color: colors.textMuted },
  warningBadge: { paddingHorizontal: 8, paddingVertical: 5, borderRadius: 999, backgroundColor: colors.warningSoft },
  warningText: { fontSize: 10, fontWeight: '800', color: colors.warning },
  taskCheck: { width: 32, height: 32, borderRadius: 11, borderWidth: 1.5, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  taskCheckDone: { backgroundColor: colors.success, borderColor: colors.success },
  completedText: { textDecorationLine: 'line-through', color: colors.textMuted },
});
