import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Screen } from '@/components/Screen';
import { Heading } from '@/components/Heading';
import { Card } from '@/components/Card';
import { EmptyState } from '@/components/EmptyState';
import { addShoppingItem, getDefaultList, listItems, toggleShoppingItem } from '@/repositories/shoppingRepo';
import type { ShoppingItem } from '@/types/models';
import { useAppStore } from '@/store/appStore';
import { colors, radius, spacing } from '@/theme/theme';

export default function Shopping() {
  const householdId = useAppStore((state) => state.activeHouseholdId)!;
  const bump = useAppStore((state) => state.bump);
  const [itemName, setItemName] = useState('');
  const [listId, setListId] = useState<string | null>(null);
  const [items, setItems] = useState<ShoppingItem[]>([]);

  const load = async () => {
    const list = await getDefaultList(householdId);
    setListId(list?.id ?? null);
    setItems(list ? await listItems(list.id) : []);
  };

  useEffect(() => { void load(); }, [householdId]);

  const add = async () => {
    if (!listId || !itemName.trim()) return;
    await addShoppingItem(listId, itemName);
    setItemName('');
    await load();
    bump();
  };

  return <Screen>
    <Heading title="Einkauf" subtitle={`${items.filter((item) => !item.checked).length} offen · ${items.filter((item) => item.checked).length} erledigt`} />
    <Card><View style={styles.row}>
      <TextInput style={styles.input} placeholder="Produkt hinzufügen" placeholderTextColor={colors.textMuted} value={itemName} onChangeText={setItemName} onSubmitEditing={add} />
      <Pressable style={styles.add} onPress={add}><Text style={styles.addText}>+</Text></Pressable>
    </View></Card>
    {items.length === 0 ? <EmptyState title="Noch keine Produkte" body="Füge dein erstes Produkt hinzu. Es wird sofort lokal gespeichert." /> : items.map((item) =>
      <Pressable key={item.id} onPress={async () => { await toggleShoppingItem(item.id, !item.checked); await load(); bump(); }}>
        <Card><View style={styles.itemRow}>
          <View style={[styles.check, item.checked === 1 && styles.checked]}><Text style={styles.checkText}>{item.checked ? '✓' : ''}</Text></View>
          <Text style={[styles.itemText, item.checked === 1 && styles.done]}>{item.name}</Text>
          <Text style={styles.qty}>{item.quantity} {item.unit ?? ''}</Text>
        </View></Card>
      </Pressable>
    )}
  </Screen>;
}

const styles = StyleSheet.create({
  row:{flexDirection:'row',gap:spacing.sm}, input:{flex:1,minHeight:48,borderRadius:radius.md,backgroundColor:colors.surfaceMuted,paddingHorizontal:14,fontSize:16,color:colors.text},
  add:{width:48,height:48,borderRadius:radius.md,backgroundColor:colors.accent,alignItems:'center',justifyContent:'center'}, addText:{fontSize:26,color:'#fff',fontWeight:'600'},
  itemRow:{flexDirection:'row',alignItems:'center',gap:12}, check:{width:28,height:28,borderRadius:9,borderWidth:2,borderColor:colors.border,alignItems:'center',justifyContent:'center'},
  checked:{backgroundColor:colors.accent,borderColor:colors.accent}, checkText:{color:'#fff',fontWeight:'800'}, itemText:{flex:1,fontSize:16,fontWeight:'600',color:colors.text},
  done:{textDecorationLine:'line-through',color:colors.textMuted}, qty:{color:colors.textMuted}
});
