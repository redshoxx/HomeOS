import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Screen } from '@/components/Screen';
import { Heading } from '@/components/Heading';
import { Card } from '@/components/Card';
import { EmptyState } from '@/components/EmptyState';
import { addShoppingItem, deleteShoppingItem, getDefaultList, listItems, toggleShoppingItem } from '@/repositories/shoppingRepo';
import type { ShoppingItem } from '@/types/models';
import { useAppStore } from '@/store/appStore';
import { colors, radius, spacing } from '@/theme/theme';

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

  useEffect(() => {
    void load().catch(error => {
      console.error('Einkauf konnte nicht geladen werden', error);
      Alert.alert('Einkauf', 'Die Einkaufsliste konnte nicht geladen werden.');
    });
  }, [load, revision]);

  const openItems = useMemo(() => items.filter(item => item.checked !== 1), [items]);
  const doneItems = useMemo(() => items.filter(item => item.checked === 1), [items]);

  const add = async () => {
    if (!listId || !itemName.trim() || busy) return;
    setBusy(true);
    try {
      await addShoppingItem(listId, itemName);
      setItemName('');
      await load();
      bump();
    } catch (error) {
      Alert.alert('Speichern fehlgeschlagen', error instanceof Error ? error.message : 'Unbekannter Fehler');
    } finally {
      setBusy(false);
    }
  };

  const toggle = async (item: ShoppingItem) => {
    if (busy) return;
    setBusy(true);
    try {
      await toggleShoppingItem(item.id, item.checked !== 1);
      await load();
      bump();
    } catch (error) {
      Alert.alert('Änderung fehlgeschlagen', error instanceof Error ? error.message : 'Unbekannter Fehler');
    } finally {
      setBusy(false);
    }
  };

  const remove = (item: ShoppingItem) => Alert.alert(item.name, 'Dieses Produkt wirklich löschen?', [
    { text: 'Abbrechen', style: 'cancel' },
    { text: 'Löschen', style: 'destructive', onPress: () => void deleteShoppingItem(item.id).then(load).then(bump).catch(error => Alert.alert('Löschen fehlgeschlagen', error instanceof Error ? error.message : 'Unbekannter Fehler')) },
  ]);

  if (!householdId) return <Screen><EmptyState title="Kein Haushalt aktiv" body="Öffne HomeOS neu oder richte einen Haushalt ein." icon="home-outline" /></Screen>;

  const renderItem = (item: ShoppingItem) => (
    <View key={item.id} style={styles.itemRow}>
      <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: item.checked === 1 }} onPress={() => void toggle(item)} style={[styles.check, item.checked === 1 && styles.checked]}>
        {item.checked === 1 ? <Ionicons name="checkmark" size={17} color="#fff" /> : null}
      </Pressable>
      <Pressable style={styles.itemTextWrap} onPress={() => void toggle(item)}>
        <Text style={[styles.itemText, item.checked === 1 && styles.done]}>{item.name}</Text>
        <Text style={styles.meta}>{item.quantity} {item.unit ?? 'Stk.'}</Text>
      </Pressable>
      <Pressable accessibilityLabel={`${item.name} löschen`} hitSlop={10} onPress={() => remove(item)} style={styles.deleteButton}>
        <Ionicons name="trash-outline" size={19} color={colors.textMuted} />
      </Pressable>
    </View>
  );

  return <Screen>
    <Heading title="Einkauf" subtitle={`${openItems.length} offen · ${doneItems.length} erledigt`} />
    <Card><View style={styles.addRow}>
      <View style={styles.inputWrap}><Ionicons name="basket-outline" size={20} color={colors.textMuted} /><TextInput style={styles.input} placeholder="Was brauchst du?" placeholderTextColor={colors.textSoft} value={itemName} onChangeText={setItemName} onSubmitEditing={() => void add()} editable={!busy} returnKeyType="done" /></View>
      <Pressable disabled={busy || !itemName.trim()} style={({ pressed }) => [styles.addButton, (busy || !itemName.trim()) && styles.disabled, pressed && styles.pressed]} onPress={() => void add()}><Ionicons name="add" size={26} color="#fff" /></Pressable>
    </View></Card>
    {items.length === 0 ? <EmptyState title="Liste ist leer" body="Füge oben dein erstes Produkt hinzu. HomeOS speichert es sofort lokal." icon="cart-outline" /> : <>
      {openItems.length > 0 ? <Card><View style={styles.sectionHeader}><Text style={styles.sectionTitle}>Offen</Text><Text style={styles.counter}>{openItems.length}</Text></View><View style={styles.divider} />{openItems.map(renderItem)}</Card> : null}
      {doneItems.length > 0 ? <Card><View style={styles.sectionHeader}><Text style={styles.sectionTitle}>Erledigt</Text><Text style={styles.counter}>{doneItems.length}</Text></View><View style={styles.divider} />{doneItems.map(renderItem)}</Card> : null}
    </>}
  </Screen>;
}

const styles = StyleSheet.create({
  addRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm }, inputWrap: { flex: 1, minHeight: 52, borderRadius: radius.md, backgroundColor: colors.surfaceMuted, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 10 }, input: { flex: 1, fontSize: 16, color: colors.text, paddingVertical: 0 }, addButton: { width: 52, height: 52, borderRadius: radius.md, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' }, disabled: { opacity: 0.4 }, pressed: { opacity: 0.78 }, sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, sectionTitle: { fontSize: 18, fontWeight: '800', color: colors.text }, counter: { minWidth: 28, paddingHorizontal: 9, paddingVertical: 4, borderRadius: radius.pill, backgroundColor: colors.surfaceMuted, textAlign: 'center', fontSize: 12, fontWeight: '800', color: colors.textMuted }, divider: { height: 1, backgroundColor: colors.border }, itemRow: { minHeight: 58, flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 7 }, check: { width: 28, height: 28, borderRadius: 10, borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.surfaceRaised, alignItems: 'center', justifyContent: 'center' }, checked: { borderColor: colors.accent, backgroundColor: colors.accent }, itemTextWrap: { flex: 1, gap: 2 }, itemText: { fontSize: 16, fontWeight: '700', color: colors.text }, done: { textDecorationLine: 'line-through', color: colors.textMuted }, meta: { fontSize: 12, color: colors.textMuted }, deleteButton: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
});
