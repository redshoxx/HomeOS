import { useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { Screen } from '@/components/Screen';
import { AppHeader } from '@/components/AppHeader';
import { getSetting, setSetting } from '@/database/db';
import { useAppStore } from '@/store/appStore';
import { colors, radius } from '@/theme/theme';

type AddType = 'shopping' | 'task' | 'pantry' | 'expense';
type HomeView = 'task' | 'pantry';
type Option<T extends string> = { key: T; label: string; icon: keyof typeof Ionicons.glyphMap };

const addTypes: Option<AddType>[] = [
  { key: 'shopping', label: 'Produkt', icon: 'cart-outline' },
  { key: 'task', label: 'Aufgabe', icon: 'checkmark-circle-outline' },
  { key: 'pantry', label: 'Vorrat', icon: 'cube-outline' },
  { key: 'expense', label: 'Ausgabe', icon: 'wallet-outline' },
];

const homeViews: Option<HomeView>[] = [
  { key: 'task', label: 'Aufgaben', icon: 'checkmark-circle-outline' },
  { key: 'pantry', label: 'Vorrat', icon: 'cube-outline' },
];

export default function Settings() {
  const bump = useAppStore(s => s.bump);
  const [profileName, setProfileName] = useState('');
  const [showSync, setShowSync] = useState(true);
  const [defaultAdd, setDefaultAdd] = useState<AddType>('shopping');
  const [defaultHome, setDefaultHome] = useState<HomeView>('task');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void Promise.all([
      getSetting('profile_name'),
      getSetting('show_sync_status'),
      getSetting('default_add_type'),
      getSetting('default_home_view'),
    ]).then(([name, sync, add, home]) => {
      setProfileName(name ?? '');
      setShowSync(sync !== 'false');
      if (addTypes.some(item => item.key === add)) setDefaultAdd(add as AddType);
      if (homeViews.some(item => item.key === home)) setDefaultHome(home as HomeView);
    }).catch(error => Alert.alert('Einstellungen', error instanceof Error ? error.message : 'Einstellungen konnten nicht geladen werden.'));
  }, []);

  const persist = async (key: string, value: string) => {
    setBusy(true);
    try {
      await setSetting(key, value);
      bump();
    } catch (error) {
      Alert.alert('Speichern fehlgeschlagen', error instanceof Error ? error.message : 'Unbekannter Fehler');
    } finally {
      setBusy(false);
    }
  };

  const saveName = async () => {
    await persist('profile_name', profileName.trim());
  };

  const option = <T extends string,>(item: Option<T>, selected: boolean, onPress: () => void) => (
    <Pressable key={item.key} disabled={busy} onPress={onPress} style={({ pressed }) => [styles.option, selected && styles.optionActive, pressed && styles.pressed]}>
      <Ionicons name={item.icon} size={17} color={selected ? '#fff' : colors.accent} />
      <Text style={[styles.optionText, selected && styles.optionTextActive]}>{item.label}</Text>
    </Pressable>
  );

  return (
    <Screen>
      <View style={styles.topRow}>
        <Pressable onPress={() => router.back()} style={({ pressed }) => [styles.back, pressed && styles.pressed]}><Ionicons name="chevron-back" size={22} color={colors.text} /></Pressable>
        <View style={styles.flex}><AppHeader eyebrow="DEIN HOMEOS" title="Einstellungen" subtitle="Nur die Optionen, die im Alltag wirklich helfen." /></View>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Dein Name</Text>
        <Text style={styles.meta}>Wird nur für die persönliche Begrüßung auf Start verwendet.</Text>
        <TextInput value={profileName} onChangeText={setProfileName} editable={!busy} onBlur={() => void saveName()} onSubmitEditing={() => void saveName()} placeholder="Name" placeholderTextColor={colors.textSoft} style={styles.input} returnKeyType="done" />
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Was öffnet das Plus?</Text>
        <Text style={styles.meta}>Deine häufigste Aktion ist sofort vorausgewählt.</Text>
        <View style={styles.options}>{addTypes.map(item => option(item, defaultAdd === item.key, () => { setDefaultAdd(item.key); void persist('default_add_type', item.key); }))}</View>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Zuhause startet mit</Text>
        <Text style={styles.meta}>Wähle, was du dort zuerst sehen möchtest.</Text>
        <View style={styles.options}>{homeViews.map(item => option(item, defaultHome === item.key, () => { setDefaultHome(item.key); void persist('default_home_view', item.key); }))}</View>
      </View>

      <View style={styles.card}>
        <View style={styles.switchRow}>
          <View style={styles.flex}><Text style={styles.sectionTitle}>Sync-Status anzeigen</Text><Text style={styles.meta}>Kleine Statuszeile auf Start. Keine dauernden Meldungen.</Text></View>
          <Switch value={showSync} disabled={busy} onValueChange={value => { setShowSync(value); void persist('show_sync_status', String(value)); }} trackColor={{ false: colors.surfaceMuted, true: colors.accentSoft }} thumbColor={showSync ? colors.accent : colors.textSoft} />
        </View>
      </View>

      <Pressable onPress={() => router.push('/(tabs)/more')} style={({ pressed }) => [styles.manage, pressed && styles.pressed]}>
        <View style={styles.manageIcon}><Ionicons name="cloud-outline" size={20} color={colors.accent} /></View>
        <View style={styles.flex}><Text style={styles.manageTitle}>Konto & Verwaltung</Text><Text style={styles.meta}>Cloud-Sync, Rechnungen und Geräte.</Text></View>
        <Ionicons name="chevron-forward" size={18} color={colors.textSoft} />
      </Pressable>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  pressed: { opacity: 0.7 },
  topRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  back: { width: 42, height: 42, marginTop: 2, borderRadius: 14, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  card: { padding: 15, borderRadius: radius.lg, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, gap: 10 },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: colors.text },
  meta: { marginTop: 2, fontSize: 11, lineHeight: 16, color: colors.textMuted },
  input: { height: 52, borderRadius: 15, backgroundColor: colors.surfaceMuted, paddingHorizontal: 15, fontSize: 16, color: colors.text },
  options: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  option: { minHeight: 42, paddingHorizontal: 11, borderRadius: 13, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surfaceMuted, flexDirection: 'row', alignItems: 'center', gap: 6 },
  optionActive: { backgroundColor: colors.accent, borderColor: colors.accent },
  optionText: { fontSize: 12, fontWeight: '800', color: colors.text },
  optionTextActive: { color: '#fff' },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  manage: { minHeight: 70, padding: 12, borderRadius: radius.lg, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, flexDirection: 'row', alignItems: 'center', gap: 11 },
  manageIcon: { width: 42, height: 42, borderRadius: 14, backgroundColor: colors.accentSoft, alignItems: 'center', justifyContent: 'center' },
  manageTitle: { fontSize: 15, fontWeight: '800', color: colors.text },
});
