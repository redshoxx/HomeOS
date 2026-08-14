import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { Screen } from '@/components/Screen';
import { AppHeader } from '@/components/AppHeader';
import { EmptyState } from '@/components/EmptyState';
import { SwipeActionRow } from '@/components/SwipeActionRow';
import { deleteShoppingItem, getDefaultList, listItems, toggleShoppingItem } from '@/repositories/shoppingRepo';
import type { ShoppingItem } from '@/types/models';
import { useAppStore } from '@/store/appStore';
import { colors, radius } from '@/theme/theme';

const messageOf = (error: unknown) => error instanceof Error ? error.message : 'Unbekannter Fehler';

export default function Shopping() {
  const householdId = useAppStore(s => s.activeHouseholdId);
  const revision = useAppStore(s => s.revision);
  const bump = useAppStore(s => s.bump);
  const [items, setItems] = useState<ShoppingItem[]>([]);
  const [showDone, setShowDone] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!householdId) return;
    const list = await getDefaultList(householdId);
    setItems(list ? await listItems(list.id) : []);
  }, [householdId]);

  useEffect(() => {
    void load().catch(error => Alert.alert('Einkauf', messageOf(error)));
  }, [load, revision]);

  const openItems = useMemo(() => items.filter(item => item.checked !== 1), [items]);
  const doneItems = useMemo(() => items.filter(item => item.checked === 1), [items]);

  const toggle = async (item: ShoppingItem) => {
    if (busy) return;
    setBusy(true);
    try {
      await toggleShoppingItem(item.id, item.checked !== 1);
      await load();
      bump();
    } catch (error) {
      Alert.alert('Änderung fehlgeschlagen', messageOf(error));
    } finally {
      setBusy(false);
    }
  };

  const remove = async (item: ShoppingItem) => {
    if (busy) return;
    setBusy(true);
    try {
      await deleteShoppingItem(item.id);
      await load();
      bump();
    } catch (error) {
      Alert.alert('Löschen fehlgeschlagen', messageOf(error));
    } finally {
      setBusy(false);
    }
  };

  const row = (item: ShoppingItem) => {
    const checked = item.checked === 1;
    return (
      <SwipeActionRow
        key={item.id}
        disabled={busy}
        onDelete={() => void remove(item)}
        onPrimaryAction={() => void toggle(item)}
        primaryLabel={checked ? 'Zurück' : 'Erledigt'}
        primaryIcon={checked ? 'arrow-undo-outline' : 'checkmark-circle-outline'}
      >
        <Pressable onPress={() => void toggle(item)} style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
          <View style={[styles.check, checked && styles.checkDone]}>
            {checked ? <Ionicons name="checkmark" size={17} color="#fff" /> : null}
          </View>
          <View style={styles.flex}>
            <Text style={[styles.name, checked && styles.done]} numberOfLines={2}>{item.name}</Text>
            {(item.quantity !== 1 || item.unit || item.category) ? (
              <Text style={styles.meta}>{item.quantity} {item.unit ?? 'Stk.'}{item.category ? ` · ${item.category}` : ''}</Text>
            ) : null}
          </View>
        </Pressable>
      </SwipeActionRow>
    );
  };

  if (!householdId) return <Screen><EmptyState title="Kein Haushalt aktiv" body="Richte zuerst deinen Haushalt ein." icon="home-outline" /></Screen>;

  return (
    <Screen>
      <AppHeader eyebrow="EINKAUF" title="Deine Liste" subtitle={openItems.length ? `${openItems.length} noch zu besorgen` : 'Alles erledigt'} />

      <Pressable onPress={() => router.push({ pathname: '/(tabs)/add', params: { type: 'shopping' } })} style={({ pressed }) => [styles.addShortcut, pressed && styles.pressed]}>
        <View style={styles.addIcon}><Ionicons name="add" size={22} color="#fff" /></View>
        <View style={styles.flex}><Text style={styles.addTitle}>Produkt hinzufügen</Text><Text style={styles.meta}>Ein Tippen auf + genügt</Text></View>
        <Ionicons name="chevron-forward" size={18} color={colors.textSoft} />
      </Pressable>

      {openItems.length ? (
        <View style={styles.list}>{openItems.map(row)}</View>
      ) : (
        <EmptyState title="Nichts mehr offen" body="Beim nächsten Einkauf einfach wieder über + ergänzen." icon="checkmark-circle-outline" />
      )}

      {doneItems.length ? (
        <View style={styles.doneBlock}>
          <Pressable onPress={() => setShowDone(value => !value)} style={({ pressed }) => [styles.doneToggle, pressed && styles.pressed]}>
            <View><Text style={styles.doneTitle}>Erledigt</Text><Text style={styles.meta}>{doneItems.length} abgehakt</Text></View>
            <Ionicons name={showDone ? 'chevron-up' : 'chevron-down'} size={19} color={colors.textMuted} />
          </Pressable>
          {showDone ? <View style={styles.list}>{doneItems.map(row)}</View> : null}
        </View>
      ) : null}

      <Text style={styles.hint}>Wischen: links löschen · rechts erledigen</Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  pressed: { opacity: 0.7 },
  addShortcut: { minHeight: 68, padding: 11, borderRadius: radius.md, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, flexDirection: 'row', alignItems: 'center', gap: 11 },
  addIcon: { width: 42, height: 42, borderRadius: 14, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' },
  addTitle: { fontSize: 15, fontWeight: '800', color: colors.text },
  list: { gap: 7 },
  row: { minHeight: 62, paddingHorizontal: 13, paddingVertical: 10, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, flexDirection: 'row', alignItems: 'center', gap: 11 },
  check: { width: 29, height: 29, borderRadius: 10, borderWidth: 2, borderColor: colors.border, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  checkDone: { borderColor: colors.success, backgroundColor: colors.success },
  name: { fontSize: 15, lineHeight: 20, fontWeight: '700', color: colors.text },
  done: { color: colors.textMuted, textDecorationLine: 'line-through' },
  meta: { marginTop: 2, fontSize: 11, lineHeight: 16, color: colors.textMuted },
  doneBlock: { gap: 8 },
  doneToggle: { minHeight: 56, paddingHorizontal: 13, borderRadius: radius.md, backgroundColor: colors.surfaceMuted, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  doneTitle: { fontSize: 14, fontWeight: '800', color: colors.text },
  hint: { textAlign: 'center', fontSize: 10, color: colors.textSoft },
});
