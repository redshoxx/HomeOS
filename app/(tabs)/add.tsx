import { useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { Screen } from '@/components/Screen';
import { addShoppingItem, getDefaultList } from '@/repositories/shoppingRepo';
import { addBill, addDevice, addPantry, addTask } from '@/repositories/homeRepo';
import { addExpense } from '@/repositories/financeRepo';
import { getSetting } from '@/database/db';
import { useAppStore } from '@/store/appStore';
import { colors, radius, spacing } from '@/theme/theme';

type AddMode = 'shopping' | 'pantry' | 'task' | 'expense' | 'bill' | 'device';
const modes: { key: AddMode; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: 'shopping', label: 'Produkt', icon: 'cart-outline' },
  { key: 'pantry', label: 'Vorrat', icon: 'cube-outline' },
  { key: 'task', label: 'Aufgabe', icon: 'checkmark-circle-outline' },
  { key: 'expense', label: 'Ausgabe', icon: 'wallet-outline' },
  { key: 'bill', label: 'Rechnung', icon: 'receipt-outline' },
  { key: 'device', label: 'Gerät', icon: 'hardware-chip-outline' },
];

const messageOf = (error: unknown) => error instanceof Error ? error.message : 'Unbekannter Fehler';
const todayLocal = () => {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

export default function Add() {
  const householdId = useAppStore(s => s.activeHouseholdId);
  const bump = useAppStore(s => s.bump);
  const [mode, setMode] = useState<AddMode>('shopping');
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void getSetting('default_add_type').then(value => {
      if (value && modes.some(item => item.key === value)) setMode(value as AddMode);
    }).catch(() => undefined);
  }, []);

  const copy = useMemo(() => {
    switch (mode) {
      case 'shopping': return ['Produkt hinzufügen', 'z. B. Milch, Äpfel, Kaffee'];
      case 'pantry': return ['Vorrat hinzufügen', 'z. B. Kaffee, Reis, Waschmittel'];
      case 'task': return ['Aufgabe für heute', 'z. B. Müll rausbringen'];
      case 'expense': return ['Ausgabe erfassen', 'z. B. Supermarkt'];
      case 'bill': return ['Rechnung erfassen', 'z. B. Strom'];
      case 'device': return ['Gerät hinzufügen', 'z. B. Geschirrspüler'];
    }
  }, [mode]);

  const needsAmount = mode === 'expense' || mode === 'bill';

  const save = async () => {
    if (!householdId || !title.trim() || busy) return;
    const numericAmount = Number(amount.replace(',', '.'));
    if (needsAmount && (!Number.isFinite(numericAmount) || numericAmount < 0)) return Alert.alert('Eingabe prüfen', 'Bitte einen gültigen Betrag eingeben.');
    setBusy(true);
    try {
      if (mode === 'shopping') {
        const list = await getDefaultList(householdId);
        if (!list) throw new Error('Keine Einkaufsliste vorhanden.');
        await addShoppingItem(list.id, title.trim());
      } else if (mode === 'pantry') await addPantry(householdId, title.trim());
      else if (mode === 'task') await addTask(householdId, title.trim(), todayLocal());
      else if (mode === 'expense') await addExpense(householdId, title.trim(), numericAmount);
      else if (mode === 'bill') {
        const due = new Date(); due.setDate(due.getDate() + 7);
        await addBill(householdId, title.trim(), numericAmount, due.toISOString().slice(0, 10));
      } else await addDevice(householdId, title.trim());
      setTitle(''); setAmount(''); bump();
      if (mode === 'shopping') router.replace('/(tabs)/shopping');
      else if (mode === 'pantry' || mode === 'task') router.replace('/(tabs)/home');
      else if (mode === 'expense') router.replace('/(tabs)/finance');
      else router.replace('/(tabs)/more');
    } catch (error) {
      Alert.alert('Speichern fehlgeschlagen', messageOf(error));
    } finally { setBusy(false); }
  };

  return <Screen>
    <View style={styles.hero}>
      <View style={styles.flex}><Text style={styles.kicker}>SCHNELL ERFASSEN</Text><Text style={styles.h1}>Hinzufügen</Text><Text style={styles.sub}>Ein zentraler Ort für neue Einträge.</Text></View>
      <Pressable onPress={() => router.push('/settings')} style={({ pressed }) => [styles.settings, pressed && styles.pressed]}><Ionicons name="settings-outline" size={23} color={colors.accent} /></Pressable>
    </View>

    <View style={styles.modeGrid}>{modes.map(item => <Pressable key={item.key} onPress={() => setMode(item.key)} style={({ pressed }) => [styles.mode, mode === item.key && styles.modeActive, pressed && styles.pressed]}>
      <View style={[styles.modeIcon, mode === item.key && styles.modeIconActive]}><Ionicons name={item.icon} size={20} color={mode === item.key ? '#fff' : colors.accent} /></View>
      <Text style={[styles.modeText, mode === item.key && styles.modeTextActive]}>{item.label}</Text>
    </Pressable>)}</View>

    <View style={styles.card}>
      <Text style={styles.cardTitle}>{copy[0]}</Text>
      <Text style={styles.cardMeta}>{mode === 'task' ? 'Aufgaben werden standardmäßig für heute angelegt.' : 'Die Details kannst du später erweitern.'}</Text>
      <TextInput value={title} onChangeText={setTitle} editable={!busy} placeholder={copy[1]} placeholderTextColor={colors.textSoft} style={styles.input} returnKeyType={needsAmount ? 'next' : 'done'} onSubmitEditing={() => { if (!needsAmount) void save(); }} />
      {needsAmount ? <TextInput value={amount} onChangeText={setAmount} editable={!busy} placeholder="Betrag in €" placeholderTextColor={colors.textSoft} style={styles.input} keyboardType="decimal-pad" /> : null}
      <Pressable disabled={busy || !title.trim()} onPress={() => void save()} style={({ pressed }) => [styles.save, (busy || !title.trim()) && styles.disabled, pressed && styles.pressed]}><Ionicons name="checkmark" size={21} color="#fff" /><Text style={styles.saveText}>{busy ? 'Speichert …' : 'Speichern'}</Text></Pressable>
    </View>
  </Screen>;
}

const styles = StyleSheet.create({
  flex: { flex: 1 }, hero: { flexDirection: 'row', alignItems: 'center', gap: spacing.md }, kicker: { fontSize: 11, fontWeight: '800', letterSpacing: 1.2, color: colors.textMuted }, h1: { fontSize: 36, lineHeight: 42, fontWeight: '800', letterSpacing: -1.2, color: colors.text }, sub: { marginTop: 2, fontSize: 15, color: colors.textMuted }, settings: { width: 48, height: 48, borderRadius: 16, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' }, pressed: { opacity: .72 },
  modeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 }, mode: { width: '31.5%', minHeight: 88, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', gap: 7, padding: 8 }, modeActive: { backgroundColor: colors.accent, borderColor: colors.accent }, modeIcon: { width: 35, height: 35, borderRadius: 12, backgroundColor: colors.accentSoft, alignItems: 'center', justifyContent: 'center' }, modeIconActive: { backgroundColor: 'rgba(255,255,255,.16)' }, modeText: { fontSize: 12, fontWeight: '700', color: colors.text }, modeTextActive: { color: '#fff' },
  card: { padding: 16, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, gap: 11 }, cardTitle: { fontSize: 20, fontWeight: '800', color: colors.text }, cardMeta: { fontSize: 12, lineHeight: 18, color: colors.textMuted }, input: { height: 54, borderRadius: 15, backgroundColor: colors.surfaceMuted, paddingHorizontal: 15, fontSize: 16, color: colors.text }, save: { height: 54, borderRadius: 15, backgroundColor: colors.accent, flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center' }, saveText: { fontSize: 15, fontWeight: '800', color: '#fff' }, disabled: { opacity: .4 },
});
