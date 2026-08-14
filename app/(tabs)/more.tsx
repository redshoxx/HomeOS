import { useCallback, useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import type { Session } from '@supabase/supabase-js';
import { router } from 'expo-router';
import { Screen } from '@/components/Screen';
import { AppHeader } from '@/components/AppHeader';
import { TextField } from '@/components/TextField';
import { Button } from '@/components/Button';
import { EmptyState } from '@/components/EmptyState';
import { SwipeActionRow } from '@/components/SwipeActionRow';
import { deleteBill, deleteDevice, listBills, listDevices } from '@/repositories/homeRepo';
import type { Bill, Device } from '@/types/models';
import { useAppStore } from '@/store/appStore';
import { colors, radius } from '@/theme/theme';
import { formatMoney } from '@/utils/money';
import { flushSyncQueue } from '@/services/sync';
import { pendingSyncCount } from '@/database/queue';
import { supabase, supabaseConfigured } from '@/services/supabase';

const messageOf = (error: unknown) => error instanceof Error ? error.message : 'Unbekannter Fehler';

export default function More() {
  const householdId = useAppStore(s => s.activeHouseholdId);
  const revision = useAppStore(s => s.revision);
  const bump = useAppStore(s => s.bump);
  const [bills, setBills] = useState<Bill[]>([]);
  const [devices, setDevices] = useState<Device[]>([]);
  const [pending, setPending] = useState(0);
  const [busy, setBusy] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authBusy, setAuthBusy] = useState(false);

  const load = useCallback(async () => {
    if (!householdId) return;
    const [nextBills, nextDevices, nextPending] = await Promise.all([
      listBills(householdId),
      listDevices(householdId),
      pendingSyncCount(),
    ]);
    setBills(nextBills);
    setDevices(nextDevices);
    setPending(nextPending);
  }, [householdId]);

  useEffect(() => {
    void load().catch(error => Alert.alert('Verwaltung', messageOf(error)));
  }, [load, revision]);

  useEffect(() => {
    if (!supabaseConfigured) return;
    void supabase.auth.getSession().then(({ data, error }) => {
      if (error) console.warn('Session konnte nicht geladen werden', error);
      setSession(data.session);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, nextSession) => setSession(nextSession));
    return () => subscription.unsubscribe();
  }, []);

  const syncNow = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const result = await flushSyncQueue();
      await load();
      if (result.skipped) Alert.alert('Cloud-Sync', result.reason ?? 'Synchronisierung ist derzeit nicht verfügbar.');
      else if (result.failed > 0) Alert.alert('Synchronisierung unvollständig', `${result.failed} Änderung${result.failed === 1 ? '' : 'en'} konnte${result.failed === 1 ? '' : 'n'} nicht übertragen werden.`);
      else Alert.alert('Synchronisierung', result.synced > 0 ? `${result.synced} Änderungen wurden übertragen.` : 'Alles ist aktuell.');
    } catch (error) {
      Alert.alert('Sync fehlgeschlagen', messageOf(error));
    } finally {
      setBusy(false);
    }
  };

  const signIn = async () => {
    if (!email.trim() || !password) return Alert.alert('Anmeldung', 'E-Mail und Passwort eingeben.');
    setAuthBusy(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (error) throw error;
      setPassword('');
    } catch (error) {
      Alert.alert('Anmeldung fehlgeschlagen', messageOf(error));
    } finally {
      setAuthBusy(false);
    }
  };

  const signUp = async () => {
    if (!email.trim() || password.length < 6) return Alert.alert('Konto', 'Mindestens 6 Zeichen Passwort verwenden.');
    setAuthBusy(true);
    try {
      const { data, error } = await supabase.auth.signUp({ email: email.trim(), password });
      if (error) throw error;
      setPassword('');
      Alert.alert('Konto erstellt', data.session ? 'Du bist angemeldet.' : 'Prüfe deine E-Mails und bestätige dein Konto.');
    } catch (error) {
      Alert.alert('Registrierung fehlgeschlagen', messageOf(error));
    } finally {
      setAuthBusy(false);
    }
  };

  const removeBill = async (bill: Bill) => {
    if (busy) return;
    setBusy(true);
    try {
      await deleteBill(bill.id);
      await load();
      bump();
    } catch (error) {
      Alert.alert('Löschen fehlgeschlagen', messageOf(error));
    } finally {
      setBusy(false);
    }
  };

  const removeDevice = async (device: Device) => {
    if (busy) return;
    setBusy(true);
    try {
      await deleteDevice(device.id);
      await load();
      bump();
    } catch (error) {
      Alert.alert('Löschen fehlgeschlagen', messageOf(error));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen>
      <AppHeader
        eyebrow="SELTENER GEBRAUCHT"
        title="Verwaltung"
        subtitle="Cloud, Rechnungen und Geräte an einem Ort."
        right={<Pressable onPress={() => router.push('/settings')} style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}><Ionicons name="settings-outline" size={21} color={colors.text} /></Pressable>}
      />

      <View style={styles.card}>
        <View style={styles.cardHead}>
          <View style={[styles.statusIcon, session && styles.statusIconOk]}><Ionicons name={session ? 'cloud-done-outline' : 'cloud-outline'} size={21} color={session ? colors.success : colors.accent} /></View>
          <View style={styles.flex}>
            <Text style={styles.cardTitle}>{session ? 'Cloud verbunden' : 'Konto & Cloud'}</Text>
            <Text style={styles.meta}>{!supabaseConfigured ? 'Cloud ist nicht konfiguriert. Die App funktioniert lokal.' : session ? `${session.user.email ?? 'Angemeldet'} · ${pending} Änderungen offen` : 'Optional anmelden, wenn du zwischen Geräten synchronisieren willst.'}</Text>
          </View>
        </View>

        {supabaseConfigured && !session ? (
          <>
            <TextField label="E-Mail" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" editable={!authBusy} />
            <TextField label="Passwort" value={password} onChangeText={setPassword} secureTextEntry editable={!authBusy} />
            <View style={styles.buttonRow}>
              <View style={styles.flex}><Button label="Anmelden" loading={authBusy} onPress={() => void signIn()} /></View>
              <View style={styles.flex}><Button label="Konto erstellen" variant="secondary" disabled={authBusy} onPress={() => void signUp()} /></View>
            </View>
          </>
        ) : null}

        {session ? (
          <View style={styles.cloudActions}>
            <View style={styles.flex}><Button label="Jetzt synchronisieren" loading={busy} variant="secondary" onPress={() => void syncNow()} /></View>
            <Pressable onPress={() => void supabase.auth.signOut().catch(error => Alert.alert('Abmelden fehlgeschlagen', messageOf(error)))} style={({ pressed }) => [styles.logout, pressed && styles.pressed]}><Ionicons name="log-out-outline" size={18} color={colors.textMuted} /></Pressable>
          </View>
        ) : null}
      </View>

      <View style={styles.sectionHead}>
        <View><Text style={styles.sectionTitle}>Rechnungen</Text><Text style={styles.meta}>{bills.length} gespeichert</Text></View>
        <Pressable onPress={() => router.push({ pathname: '/(tabs)/add', params: { type: 'bill' } })} style={({ pressed }) => [styles.smallAdd, pressed && styles.pressed]}><Ionicons name="add" size={18} color={colors.accent} /><Text style={styles.smallAddText}>Neu</Text></Pressable>
      </View>
      {bills.length ? <View style={styles.list}>{bills.map(bill => (
        <SwipeActionRow key={bill.id} disabled={busy} onDelete={() => void removeBill(bill)}>
          <View style={styles.row}>
            <View style={styles.rowIcon}><Ionicons name="receipt-outline" size={18} color={colors.accent} /></View>
            <View style={styles.flex}><Text style={styles.name} numberOfLines={1}>{bill.title}</Text><Text style={styles.meta}>Fällig {bill.due_date}</Text></View>
            <Text style={styles.value}>{formatMoney(bill.amount)}</Text>
          </View>
        </SwipeActionRow>
      ))}</View> : <EmptyState icon="receipt-outline" title="Keine Rechnungen" body="Über Neu oder das Plus hinzufügen." />}

      <View style={styles.sectionHead}>
        <View><Text style={styles.sectionTitle}>Geräte</Text><Text style={styles.meta}>{devices.length} gespeichert</Text></View>
        <Pressable onPress={() => router.push({ pathname: '/(tabs)/add', params: { type: 'device' } })} style={({ pressed }) => [styles.smallAdd, pressed && styles.pressed]}><Ionicons name="add" size={18} color={colors.accent} /><Text style={styles.smallAddText}>Neu</Text></Pressable>
      </View>
      {devices.length ? <View style={styles.list}>{devices.map(device => (
        <SwipeActionRow key={device.id} disabled={busy} onDelete={() => void removeDevice(device)}>
          <View style={styles.row}>
            <View style={styles.rowIcon}><Ionicons name="hardware-chip-outline" size={18} color={colors.accent} /></View>
            <View style={styles.flex}><Text style={styles.name} numberOfLines={1}>{device.name}</Text><Text style={styles.meta}>{device.manufacturer ?? 'Keine weiteren Details'}</Text></View>
          </View>
        </SwipeActionRow>
      ))}</View> : <EmptyState icon="hardware-chip-outline" title="Keine Geräte" body="Über Neu oder das Plus hinzufügen." />}

      <View style={styles.version}><Ionicons name="information-circle-outline" size={18} color={colors.textMuted} /><Text style={styles.versionText}>HomeOS 0.5.0 · Offline-first · AltStore Updates</Text></View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  pressed: { opacity: 0.7 },
  iconButton: { width: 44, height: 44, borderRadius: 15, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  card: { padding: 15, borderRadius: radius.lg, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, gap: 12 },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: 11 },
  statusIcon: { width: 42, height: 42, borderRadius: 14, backgroundColor: colors.accentSoft, alignItems: 'center', justifyContent: 'center' },
  statusIconOk: { backgroundColor: colors.successSoft },
  cardTitle: { fontSize: 16, fontWeight: '800', color: colors.text },
  meta: { marginTop: 2, fontSize: 11, lineHeight: 16, color: colors.textMuted },
  buttonRow: { flexDirection: 'row', gap: 8 },
  cloudActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  logout: { width: 50, height: 50, borderRadius: 15, backgroundColor: colors.surfaceMuted, alignItems: 'center', justifyContent: 'center' },
  sectionHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  sectionTitle: { fontSize: 20, fontWeight: '800', letterSpacing: -0.4, color: colors.text },
  smallAdd: { minHeight: 38, paddingHorizontal: 11, borderRadius: 13, backgroundColor: colors.accentSoft, flexDirection: 'row', alignItems: 'center', gap: 5 },
  smallAddText: { fontSize: 12, fontWeight: '800', color: colors.accent },
  list: { gap: 7 },
  row: { minHeight: 62, paddingHorizontal: 13, paddingVertical: 10, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, flexDirection: 'row', alignItems: 'center', gap: 11 },
  rowIcon: { width: 38, height: 38, borderRadius: 12, backgroundColor: colors.accentSoft, alignItems: 'center', justifyContent: 'center' },
  name: { fontSize: 15, fontWeight: '700', color: colors.text },
  value: { fontSize: 14, fontWeight: '800', color: colors.text },
  version: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 4 },
  versionText: { fontSize: 10, color: colors.textSoft },
});
