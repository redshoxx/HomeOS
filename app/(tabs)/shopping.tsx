import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { Screen } from '@/components/Screen';
import { EmptyState } from '@/components/EmptyState';
import { SwipeActionRow } from '@/components/SwipeActionRow';
import { deleteShoppingItem, getDefaultList, listItems, toggleShoppingItem } from '@/repositories/shoppingRepo';
import type { ShoppingItem } from '@/types/models';
import { useAppStore } from '@/store/appStore';
import { colors, radius, spacing } from '@/theme/theme';

const messageOf = (error: unknown) => error instanceof Error ? error.message : 'Unbekannter Fehler';

export default function Shopping() {
  const householdId = useAppStore(s => s.activeHouseholdId);
  const revision = useAppStore(s => s.revision);
  const bump = useAppStore(s => s.bump);
  const [items, setItems] = useState<ShoppingItem[]>([]);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!householdId) return;
    const list = await getDefaultList(householdId);
    setItems(list ? await listItems(list.id) : []);
  }, [householdId]);

  useEffect(() => { void load().catch(error => Alert.alert('Einkauf', messageOf(error))); }, [load, revision]);

  const openItems = useMemo(() => items.filter(item => item.checked !== 1), [items]);
  const doneItems = useMemo(() => items.filter(item => item.checked === 1), [items]);

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
    <View style={styles.hero}>
      <View style={styles.flex}><Text style={styles.kicker}>EINKAUFSLISTE</Text><Text style={styles.h1}>Einkauf</Text><Text style={styles.sub}>{openItems.length} noch zu besorgen</Text></View>
      <Pressable onPress={() => router.push('/settings')} style={({ pressed }) => [styles.heroIcon, pressed && styles.pressed]}><Ionicons name="settings-outline" size={24} color={colors.accent} /></Pressable>
    </View>

    <View style={styles.quickInfo}>
      <View style={styles.quickIcon}><Ionicons name="add" size={19} color={colors.accent} /></View>
      <View style={styles.flex}><Text style={styles.quickTitle}>Produkt hinzufügen</Text><Text style={styles.meta}>Über das Plus unten in der Navigation.</Text></View>
    </View>

    <View style={styles.hint}><Ionicons name="swap-horizontal-outline" size={17} color={colors.textMuted} /><Text style={styles.hintText}>Links wischen: löschen · rechts wischen: erledigen</Text></View>

    {items.length === 0 ? <EmptyState title="Deine Liste ist leer" body="Tippe unten auf + und füge das erste Produkt hinzu." icon="cart-outline" /> : <>{group('Offen', 'Noch zu besorgen', openItems)}{group('Erledigt', 'Bereits abgehakt', doneItems)}</>}
  </Screen>;
}

const styles = StyleSheet.create({
  flex: { flex: 1 }, hero: { flexDirection: 'row', alignItems: 'center', gap: spacing.md }, kicker: { fontSize: 11, fontWeight: '800', letterSpacing: 1.2, color: colors.textMuted }, h1: { fontSize: 38, lineHeight: 44, fontWeight: '800', letterSpacing: -1.35, color: colors.text }, sub: { marginTop: 2, fontSize: 15, color: colors.textMuted }, heroIcon: { width: 50, height: 50, borderRadius: 17, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  quickInfo: { flexDirection: 'row', alignItems: 'center', gap: 11, padding: 14, borderRadius: radius.md, backgroundColor: colors.surfaceMuted }, quickIcon: { width: 38, height: 38, borderRadius: 12, backgroundColor: colors.accentSoft, alignItems: 'center', justifyContent: 'center' }, quickTitle: { fontSize: 15, fontWeight: '800', color: colors.text },
  pressed: { opacity: .75 }, hint: { flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 4 }, hintText: { flex: 1, fontSize: 11, color: colors.textMuted }, group: { gap: 10 }, sectionHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 3 }, sectionTitle: { fontSize: 20, fontWeight: '800', letterSpacing: -.35, color: colors.text }, badge: { minWidth: 30, height: 30, paddingHorizontal: 9, borderRadius: 15, backgroundColor: colors.surfaceMuted, alignItems: 'center', justifyContent: 'center' }, badgeText: { fontSize: 12, fontWeight: '800', color: colors.textMuted }, rows: { gap: 8 },
  itemRow: { minHeight: 70, paddingHorizontal: 13, paddingVertical: 11, flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface }, pressedRow: { opacity: .75 }, itemIcon: { width: 42, height: 42, borderRadius: 14, backgroundColor: colors.accentSoft, alignItems: 'center', justifyContent: 'center' }, itemIconDone: { backgroundColor: colors.success }, itemName: { fontSize: 16, fontWeight: '700', color: colors.text }, done: { textDecorationLine: 'line-through', color: colors.textMuted }, meta: { fontSize: 12, lineHeight: 17, color: colors.textMuted },
});
