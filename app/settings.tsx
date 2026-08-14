import { useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { Screen } from '@/components/Screen';
import { getSetting, setSetting } from '@/database/db';
import { useAppStore } from '@/store/appStore';
import { colors, radius, spacing } from '@/theme/theme';

type AddType = 'shopping' | 'pantry' | 'task' | 'expense';
const addTypes: { key: AddType; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: 'shopping', label: 'Produkt', icon: 'cart-outline' },
  { key: 'pantry', label: 'Vorrat', icon: 'cube-outline' },
  { key: 'task', label: 'Aufgabe', icon: 'checkmark-circle-outline' },
  { key: 'expense', label: 'Ausgabe', icon: 'wallet-outline' },
];

export default function Settings() {
  const bump = useAppStore(s => s.bump);
  const [profileName, setProfileName] = useState('');
  const [showSync, setShowSync] = useState(true);
  const [defaultAdd, setDefaultAdd] = useState<AddType>('shopping');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void Promise.all([getSetting('profile_name'), getSetting('show_sync_status'), getSetting('default_add_type')]).then(([name, sync, add]) => {
      setProfileName(name ?? '');
      setShowSync(sync !== 'false');
      if (addTypes.some(item => item.key === add)) setDefaultAdd(add as AddType);
    }).catch(error => Alert.alert('Einstellungen', error instanceof Error ? error.message : 'Einstellungen konnten nicht geladen werden.'));
  }, []);

  const persist = async (key: string, value: string) => {
    setBusy(true);
    try { await setSetting(key, value); bump(); }
    catch (error) { Alert.alert('Speichern fehlgeschlagen', error instanceof Error ? error.message : 'Unbekannter Fehler'); }
    finally { setBusy(false); }
  };

  const saveName = async () => { await persist('profile_name', profileName.trim()); };

  return <Screen>
    <View style={styles.hero}>
      <Pressable onPress={() => router.back()} style={({ pressed }) => [styles.back, pressed && styles.pressed]}><Ionicons name="chevron-back" size={23} color={colors.text} /></Pressable>
      <View style={styles.flex}><Text style={styles.kicker}>DEIN HOMEOS</Text><Text style={styles.h1}>Einstellungen</Text><Text style={styles.sub}>Passe die App an deine Nutzung an.</Text></View>
    </View>

    <View style={styles.card}>
      <View style={styles.sectionHead}><View style={styles.sectionIcon}><Ionicons name="person-outline" size={20} color={colors.accent} /></View><View style={styles.flex}><Text style={styles.sectionTitle}>Persönlich</Text><Text style={styles.meta}>Dein Name wird auf „Heute“ angezeigt.</Text></View></View>
      <TextInput value={profileName} onChangeText={setProfileName} editable={!busy} onBlur={() => void saveName()} placeholder="Dein Name" placeholderTextColor={colors.textSoft} style={styles.input} returnKeyType="done" onSubmitEditing={() => void saveName()} />
    </View>

    <View style={styles.card}>
      <View style={styles.sectionHead}><View style={styles.sectionIcon}><Ionicons name="add-circle-outline" size={20} color={colors.accent} /></View><View style={styles.flex}><Text style={styles.sectionTitle}>Standard beim Plus</Text><Text style={styles.meta}>Diese Auswahl ist beim Öffnen von + vorausgewählt.</Text></View></View>
      <View style={styles.choices}>{addTypes.map(item => <Pressable key={item.key} disabled={busy} onPress={() => { setDefaultAdd(item.key); void persist('default_add_type', item.key); }} style={({ pressed }) => [styles.choice, defaultAdd === item.key && styles.choiceActive, pressed && styles.pressed]}><Ionicons name={item.icon} size={18} color={defaultAdd === item.key ? '#fff' : colors.accent} /><Text style={[styles.choiceText, defaultAdd === item.key && styles.choiceTextActive]}>{item.label}</Text></Pressable>)}</View>
    </View>

    <View style={styles.card}>
      <View style={styles.settingRow}><View style={styles.rowText}><Text style={styles.sectionTitle}>Sync-Status auf Heute</Text><Text style={styles.meta}>Zeigt an, ob lokale Änderungen auf die Cloud warten.</Text></View><Switch value={showSync} disabled={busy} onValueChange={value => { setShowSync(value); void persist('show_sync_status', String(value)); }} trackColor={{ false: colors.surfaceMuted, true: colors.accentSoft }} thumbColor={showSync ? colors.accent : colors.textSoft} /></View>
    </View>

    <Pressable onPress={() => router.push('/(tabs)/more')} style={({ pressed }) => [styles.manage, pressed && styles.pressed]}><View style={styles.manageIcon}><Ionicons name="grid-outline" size={20} color={colors.accent} /></View><View style={styles.flex}><Text style={styles.manageTitle}>Verwaltung & Cloud</Text><Text style={styles.meta}>Konto, Synchronisierung, Rechnungen und Geräte.</Text></View><Ionicons name="chevron-forward" size={19} color={colors.textSoft} /></Pressable>
  </Screen>;
}

const styles = StyleSheet.create({
  flex: { flex: 1 }, hero: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 }, back: { width: 44, height: 44, borderRadius: 15, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center', marginTop: 2 }, kicker: { fontSize: 11, fontWeight: '800', letterSpacing: 1.2, color: colors.textMuted }, h1: { fontSize: 34, lineHeight: 40, fontWeight: '800', letterSpacing: -1.1, color: colors.text }, sub: { marginTop: 2, fontSize: 14, color: colors.textMuted }, pressed: { opacity: .72 },
  card: { padding: 16, borderRadius: radius.lg, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, gap: 14 }, sectionHead: { flexDirection: 'row', alignItems: 'center', gap: 11 }, sectionIcon: { width: 40, height: 40, borderRadius: 13, backgroundColor: colors.accentSoft, alignItems: 'center', justifyContent: 'center' }, sectionTitle: { fontSize: 16, fontWeight: '800', color: colors.text }, meta: { marginTop: 2, fontSize: 12, lineHeight: 17, color: colors.textMuted }, input: { height: 52, borderRadius: 15, backgroundColor: colors.surfaceMuted, paddingHorizontal: 15, fontSize: 16, color: colors.text }, choices: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 }, choice: { minHeight: 42, paddingHorizontal: 12, borderRadius: 13, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surfaceMuted, flexDirection: 'row', gap: 7, alignItems: 'center' }, choiceActive: { backgroundColor: colors.accent, borderColor: colors.accent }, choiceText: { fontSize: 13, fontWeight: '700', color: colors.text }, choiceTextActive: { color: '#fff' }, settingRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md }, rowText: { flex: 1 }, manage: { minHeight: 74, paddingHorizontal: 14, paddingVertical: 12, borderRadius: radius.lg, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, flexDirection: 'row', alignItems: 'center', gap: 11 }, manageIcon: { width: 42, height: 42, borderRadius: 14, backgroundColor: colors.accentSoft, alignItems: 'center', justifyContent: 'center' }, manageTitle: { fontSize: 15, fontWeight: '800', color: colors.text },
});
