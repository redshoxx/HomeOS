import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Screen } from '@/components/Screen';
import { EmptyState } from '@/components/EmptyState';
import { SwipeActionRow } from '@/components/SwipeActionRow';
import { addShoppingItem, deleteShoppingItem, getDefaultList, listItems, toggleShoppingItem } from '@/repositories/shoppingRepo';
import type { ShoppingItem } from '@/types/models';
import { useAppStore } from '@/store/appStore';
import { colors, radius, spacing } from '@/theme/theme';

const messageOf = (error: unknown) => error instanceof Error ? error.message : 'Unbekannter Fehler';

export default function Shopping() {
  const householdId = useAppStore(s => s.activeHouseholdId);
  const revision = useAppStore(s => s.revision);
  const bump = useAppStore(s => s.bump);
  const [itemName, setItemName] = useState('');
  const [listId, setListId] = useState<string | null>(null);
  const [items, setItems] = useState<ShoppingItem[]>([]);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!householdId) return;
    const list = await getDefaultList(householdId);
    setListId(list?.id ?? null);
    setItems(list ? await listItems(list.id) : []);
  }, [householdId]);

  useEffect(() => { void load().catch(error => Alert.alert('Einkauf', messageOf(error))); }, [load, revision]);

  const openItems = useMemo(() => items.filter(item => item.checked !== 1), [items]);
  const doneItems = useMemo(() => items.filter(item => item.checked === 1), [items]);
  const progress = items.length ? Math.round((doneItems.length / items.length) * 100) : 0;

  const add = async () => {
    if (!listId || !itemName.trim() || busy) return;
    setBusy(true);
    try { await addShoppingItem(listId, itemName.trim()); setItemName(''); await load(); bump(); }
    catch (error) { Alert.alert('Speichern fehlgeschlagen', messageOf(error)); }
    finally { setBusy(false); }
  };

  const toggle = async (item: ShoppingItem) => {
    if (busy) return;
    setBusy(true);
    try { await toggleShoppingItem(item.id, item.checked !== 1); await load(); bump(); }
    catch (error) { Alert.alert('Änderung fehlgeschlagen', messageOf(error)); }
    finally { setBusy(false); }
  };

  const remove = async (item: ShoppingItem) => {
    if (busy) return;
    setBusy(true);
    try { await deleteShoppingItem(item.id); await load(); bump(); }
    catch (error) { Alert.alert('Löschen fehlgeschlagen', messageOf(error)); }
    finally { setBusy(false); }
  };

  if (!householdId) return <Screen><EmptyState title="Kein Haushalt aktiv" body="Richte zuerst deinen Haushalt ein." icon="home-outline" /></Screen>;

  const row = (item: ShoppingItem) => {
    const checked = item.checked === 1;
    return <SwipeActionRow key={item.id} disabled={busy} onDelete={() => void remove(item)} onPrimaryAction={() => void toggle(item)} primaryLabel={checked ? 'Zurück' : 'Erledigt'} primaryIcon={checked ? 'arrow-undo-outline' : 'checkmark-circle-outline'}>
      <Pressable onPress={() => void toggle(item)} style={({ pressed }) => [styles.itemRow, pressed && styles.pressedRow]}>
        <View style={[styles.itemIcon, checked && styles.itemIconDone]}><Ionicons name={checked ? 'checkmark' : 'basket-outline'} size={20} color={checked ? '#fff' : colors.accent} /></View>
        <View style={styles.flex}><Text style={[styles.itemName, checked && styles.done]} numberOfLines={1}>{item.name}</Text><Text style={styles.meta}>{item.quantity} {item.unit ?? 'Stk.'}{item.category ? ` · ${item.category}` : ''}</Text></View>
        <Ionicons name="chevron-back-outline" size={17} color={colors.textSoft} />
      </Pressable>
    </SwipeActionRow>;
  };

  const group = (title: string, subtitle: string, data: ShoppingItem[]) => data.length ? <View style={styles.group}>
    <View style={styles.sectionHead}><View><Text style={styles.sectionTitle}>{title}</Text><Text style={styles.meta}>{subtitle}</Text></View><View style={styles.badge}><Text style={styles.badgeText}>{data.length}</Text></View></View>
    <View style={styles.rows}>{data.map(row)}</View>
  </View> : null;

  return <Screen>
    <View style={styles.hero}><View style={styles.flex}><Text style={styles.kicker}>EINKAUFSLISTE</Text><Text style={styles.h1}>Einkauf</Text><Text style={styles.sub}>{openItems.length} offen · {doneItems.length} erledigt</Text></View><View style={styles.heroIcon}><Ionicons name="cart-outline" size={25} color={colors.accent} /></View></View>

    <View style={styles.progressCard}>
      <View style={styles.progressTop}><View><Text style={styles.progressLabel}>FORTSCHRITT</Text><Text style={styles.progressValue}>{progress}%</Text></View><View style={styles.progressNumbers}><View><Text style={styles.number}>{openItems.length}</Text><Text style={styles.numberLabel}>offen</Text></View><View style={styles.divider} /><View><Text style={styles.number}>{doneItems.length}</Text><Text style={styles.numberLabel}>erledigt</Text></View></View></View>
      <View style={styles.track}><View style={[styles.bar, { width: `${progress}%` }]} /></View>
    </View>

    <View style={styles.composer}>
      <View style={styles.composerHead}><View style={styles.composerIcon}><Ionicons name="add-outline" size={20} color={colors.accent} /></View><View style={styles.flex}><Text style={styles.composerTitle}>Produkt hinzufügen</Text><Text style={styles.meta}>Schnell erfassen, später abhaken</Text></View></View>
      <View style={styles.addRow}><TextInput style={styles.input} value={itemName} onChangeText={setItemName} onSubmitEditing={() => void add()} editable={!busy} returnKeyType="done" placeholder="z. B. Milch, Äpfel, Kaffee …" placeholderTextColor={colors.textSoft} /><Pressable disabled={busy || !itemName.trim()} onPress={() => void add()} style={({ pressed }) => [styles.addButton, (busy || !itemName.trim()) && styles.disabled, pressed && styles.pressed]}><Ionicons name="arrow-up" size={22} color="#fff" /></Pressable></View>
    </View>

    <View style={styles.hint}><Ionicons name="swap-horizontal-outline" size={17} color={colors.textMuted} /><Text style={styles.hintText}>Links wischen: löschen · rechts wischen: erledigen</Text></View>

    {items.length === 0 ? <EmptyState title="Deine Liste ist leer" body="Füge das erste Produkt hinzu. HomeOS speichert alles sofort lokal." icon="cart-outline" /> : <>{group('Offen', 'Noch zu besorgen', openItems)}{group('Erledigt', 'Bereits im Einkaufswagen', doneItems)}</>}
  </Screen>;
}

const styles = StyleSheet.create({
  flex: { flex: 1 }, hero: { flexDirection: 'row', alignItems: 'center', gap: spacing.md }, kicker: { fontSize: 11, fontWeight: '800', letterSpacing: 1.2, color: colors.textMuted }, h1: { fontSize: 38, lineHeight: 44, fontWeight: '800', letterSpacing: -1.35, color: colors.text }, sub: { marginTop: 2, fontSize: 15, color: colors.textMuted }, heroIcon: { width: 54, height: 54, borderRadius: 18, backgroundColor: colors.accentSoft, alignItems: 'center', justifyContent: 'center' },
  progressCard: { borderRadius: radius.lg, backgroundColor: colors.accent, padding: 18, gap: 16 }, progressTop: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' }, progressLabel: { fontSize: 10, fontWeight: '800', letterSpacing: 1.1, color: 'rgba(255,255,255,.62)' }, progressValue: { marginTop: 2, fontSize: 31, lineHeight: 36, fontWeight: '800', color: '#fff' }, progressNumbers: { flexDirection: 'row', alignItems: 'center', gap: 14 }, number: { fontSize: 19, fontWeight: '800', color: '#fff', textAlign: 'center' }, numberLabel: { fontSize: 11, color: 'rgba(255,255,255,.65)' }, divider: { width: 1, height: 34, backgroundColor: 'rgba(255,255,255,.18)' }, track: { height: 7, borderRadius: 999, overflow: 'hidden', backgroundColor: 'rgba(255,255,255,.16)' }, bar: { height: '100%', minWidth: 6, borderRadius: 999, backgroundColor: '#fff' },
  composer: { padding: 16, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, gap: 14 }, composerHead: { flexDirection: 'row', alignItems: 'center', gap: 11 }, composerIcon: { width: 38, height: 38, borderRadius: 12, backgroundColor: colors.accentSoft, alignItems: 'center', justifyContent: 'center' }, composerTitle: { fontSize: 16, fontWeight: '800', color: colors.text }, addRow: { flexDirection: 'row', gap: 9 }, input: { flex: 1, height: 52, borderRadius: 15, backgroundColor: colors.surfaceMuted, paddingHorizontal: 15, fontSize: 16, color: colors.text }, addButton: { width: 52, height: 52, borderRadius: 15, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' }, disabled: { opacity: .4 }, pressed: { opacity: .78 },
  hint: { flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 4 }, hintText: { flex: 1, fontSize: 11, color: colors.textMuted }, group: { gap: 10 }, sectionHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 3 }, sectionTitle: { fontSize: 20, fontWeight: '800', letterSpacing: -.35, color: colors.text }, badge: { minWidth: 30, height: 30, paddingHorizontal: 9, borderRadius: 15, backgroundColor: colors.surfaceMuted, alignItems: 'center', justifyContent: 'center' }, badgeText: { fontSize: 12, fontWeight: '800', color: colors.textMuted }, rows: { gap: 8 },
  itemRow: { minHeight: 70, paddingHorizontal: 13, paddingVertical: 11, flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface }, pressedRow: { opacity: .75 }, itemIcon: { width: 42, height: 42, borderRadius: 14, backgroundColor: colors.accentSoft, alignItems: 'center', justifyContent: 'center' }, itemIconDone: { backgroundColor: colors.success }, itemName: { fontSize: 16, fontWeight: '700', color: colors.text }, done: { textDecorationLine: 'line-through', color: colors.textMuted }, meta: { fontSize: 12, lineHeight: 17, color: colors.textMuted },
});
