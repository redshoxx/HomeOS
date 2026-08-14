import { useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { router, useLocalSearchParams } from 'expo-router';
import { Screen } from '@/components/Screen';
import { AppHeader } from '@/components/AppHeader';
import { addShoppingItem, getDefaultList } from '@/repositories/shoppingRepo';
import { addBill, addDevice, addPantry, addTask } from '@/repositories/homeRepo';
import { addExpense } from '@/repositories/financeRepo';
import { getSetting } from '@/database/db';
import { useAppStore } from '@/store/appStore';
import { colors, radius } from '@/theme/theme';

type AddMode = 'shopping' | 'task' | 'pantry' | 'expense' | 'bill' | 'device';

type ModeOption = {
  key: AddMode;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
};

const primaryModes: ModeOption[] = [
  { key: 'shopping', label: 'Produkt', icon: 'cart-outline' },
  { key: 'task', label: 'Aufgabe', icon: 'checkmark-circle-outline' },
  { key: 'pantry', label: 'Vorrat', icon: 'cube-outline' },
  { key: 'expense', label: 'Ausgabe', icon: 'wallet-outline' },
];

const secondaryModes: ModeOption[] = [
  { key: 'bill', label: 'Rechnung', icon: 'receipt-outline' },
  { key: 'device', label: 'Gerät', icon: 'hardware-chip-outline' },
];

const allModes = [...primaryModes, ...secondaryModes];
const messageOf = (error: unknown) => error instanceof Error ? error.message : 'Unbekannter Fehler';
const localDateKey = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const parseAmount = (value: string) => {
  const normalized = value.trim().replace(/\s/g, '').replace(',', '.');
  const parsed = Number(normalized);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
};

export default function Add() {
  const params = useLocalSearchParams<{ type?: string | string[] }>();
  const householdId = useAppStore(s => s.activeHouseholdId);
  const bump = useAppStore(s => s.bump);
  const [mode, setMode] = useState<AddMode>('shopping');
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [showMore, setShowMore] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const requested = Array.isArray(params.type) ? params.type[0] : params.type;
    if (requested && allModes.some(item => item.key === requested)) {
      setMode(requested as AddMode);
      setShowMore(requested === 'bill' || requested === 'device');
      return;
    }

    void getSetting('default_add_type').then(value => {
      if (value && allModes.some(item => item.key === value)) {
        setMode(value as AddMode);
        setShowMore(value === 'bill' || value === 'device');
      }
    }).catch(() => undefined);
  }, [params.type]);

  const copy = useMemo(() => {
    switch (mode) {
      case 'shopping': return { title: 'Produkt', placeholder: 'z. B. Milch', helper: 'Kommt direkt auf deine Einkaufsliste.' };
      case 'task': return { title: 'Aufgabe', placeholder: 'z. B. Müll rausbringen', helper: 'Wird automatisch für heute angelegt.' };
      case 'pantry': return { title: 'Vorrat', placeholder: 'z. B. Kaffee', helper: 'Details kannst du später ergänzen.' };
      case 'expense': return { title: 'Ausgabe', placeholder: 'z. B. Supermarkt', helper: 'Nur Titel und Betrag sind nötig.' };
      case 'bill': return { title: 'Rechnung', placeholder: 'z. B. Strom', helper: 'Fälligkeit wird zunächst auf 7 Tage gesetzt.' };
      case 'device': return { title: 'Gerät', placeholder: 'z. B. Geschirrspüler', helper: 'Hersteller und Seriennummer kannst du später ergänzen.' };
    }
  }, [mode]);

  const needsAmount = mode === 'expense' || mode === 'bill';

  const selectMode = (next: AddMode) => {
    setMode(next);
    setTitle('');
    setAmount('');
  };

  const save = async () => {
    if (!householdId || !title.trim() || busy) return;
    const numericAmount = needsAmount ? parseAmount(amount) : null;
    if (needsAmount && numericAmount === null) {
      Alert.alert('Betrag prüfen', 'Bitte einen Betrag größer 0 eingeben.');
      return;
    }

    setBusy(true);
    try {
      if (mode === 'shopping') {
        const list = await getDefaultList(householdId);
        if (!list) throw new Error('Keine Einkaufsliste vorhanden.');
        await addShoppingItem(list.id, title.trim());
      } else if (mode === 'task') {
        await addTask(householdId, title.trim(), localDateKey());
      } else if (mode === 'pantry') {
        await addPantry(householdId, title.trim());
      } else if (mode === 'expense') {
        await addExpense(householdId, title.trim(), numericAmount as number);
      } else if (mode === 'bill') {
        const due = new Date();
        due.setDate(due.getDate() + 7);
        await addBill(householdId, title.trim(), numericAmount as number, due.toISOString().slice(0, 10));
      } else {
        await addDevice(householdId, title.trim());
      }

      setTitle('');
      setAmount('');
      bump();

      if (mode === 'shopping') router.replace('/(tabs)/shopping');
      else if (mode === 'task' || mode === 'pantry') router.replace('/(tabs)/home');
      else if (mode === 'expense') router.replace('/(tabs)/finance');
      else router.replace('/(tabs)/more');
    } catch (error) {
      Alert.alert('Speichern fehlgeschlagen', messageOf(error));
    } finally {
      setBusy(false);
    }
  };

  const modeButton = (item: ModeOption) => (
    <Pressable key={item.key} disabled={busy} onPress={() => selectMode(item.key)} style={({ pressed }) => [styles.mode, mode === item.key && styles.modeActive, pressed && styles.pressed]}>
      <Ionicons name={item.icon} size={18} color={mode === item.key ? '#fff' : colors.accent} />
      <Text style={[styles.modeText, mode === item.key && styles.modeTextActive]}>{item.label}</Text>
    </Pressable>
  );

  return (
    <Screen>
      <AppHeader eyebrow="SCHNELL ERFASSEN" title="Hinzufügen" subtitle="So wenig Eingaben wie möglich." />

      <View style={styles.modes}>{primaryModes.map(modeButton)}</View>

      <View style={styles.formCard}>
        <View style={styles.formHead}>
          <View><Text style={styles.formTitle}>{copy.title}</Text><Text style={styles.helper}>{copy.helper}</Text></View>
        </View>
        <TextInput
          autoFocus
          value={title}
          onChangeText={setTitle}
          editable={!busy}
          placeholder={copy.placeholder}
          placeholderTextColor={colors.textSoft}
          style={styles.input}
          returnKeyType={needsAmount ? 'next' : 'done'}
          onSubmitEditing={() => { if (!needsAmount) void save(); }}
        />
        {needsAmount ? (
          <TextInput
            value={amount}
            onChangeText={setAmount}
            editable={!busy}
            placeholder="Betrag in €"
            placeholderTextColor={colors.textSoft}
            style={styles.input}
            keyboardType="decimal-pad"
          />
        ) : null}
        <Pressable disabled={busy || !title.trim()} onPress={() => void save()} style={({ pressed }) => [styles.save, (busy || !title.trim()) && styles.disabled, pressed && styles.pressed]}>
          <Ionicons name="checkmark" size={20} color="#fff" />
          <Text style={styles.saveText}>{busy ? 'Speichert …' : 'Speichern'}</Text>
        </Pressable>
      </View>

      <Pressable onPress={() => setShowMore(value => !value)} style={({ pressed }) => [styles.moreToggle, pressed && styles.pressed]}>
        <Text style={styles.moreText}>Weitere Einträge</Text>
        <Ionicons name={showMore ? 'chevron-up' : 'chevron-down'} size={18} color={colors.textMuted} />
      </Pressable>
      {showMore ? <View style={styles.secondary}>{secondaryModes.map(modeButton)}</View> : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  pressed: { opacity: 0.7 },
  modes: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  mode: { width: '48.8%', minHeight: 48, paddingHorizontal: 12, borderRadius: 14, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 },
  modeActive: { backgroundColor: colors.accent, borderColor: colors.accent },
  modeText: { fontSize: 13, fontWeight: '800', color: colors.text },
  modeTextActive: { color: '#fff' },
  formCard: { padding: 15, borderRadius: radius.lg, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, gap: 10 },
  formHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  formTitle: { fontSize: 20, fontWeight: '800', letterSpacing: -0.4, color: colors.text },
  helper: { marginTop: 2, fontSize: 11, lineHeight: 16, color: colors.textMuted },
  input: { height: 54, borderRadius: 15, backgroundColor: colors.surfaceMuted, paddingHorizontal: 15, fontSize: 16, color: colors.text },
  save: { height: 54, borderRadius: 15, backgroundColor: colors.accent, flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center' },
  saveText: { fontSize: 15, fontWeight: '800', color: '#fff' },
  disabled: { opacity: 0.4 },
  moreToggle: { minHeight: 46, paddingHorizontal: 13, borderRadius: 14, backgroundColor: colors.surfaceMuted, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  moreText: { fontSize: 12, fontWeight: '800', color: colors.textMuted },
  secondary: { flexDirection: 'row', gap: 8 },
});
