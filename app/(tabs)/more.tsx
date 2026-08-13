import { useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import type { Session } from '@supabase/supabase-js';
import { Screen } from '@/components/Screen';
import { Card } from '@/components/Card';
import { TextField } from '@/components/TextField';
import { Button } from '@/components/Button';
import { addBill, addDevice, listBills, listDevices } from '@/repositories/homeRepo';
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
  const bump = useAppStore(s => s.bump);
  const [bills, setBills] = useState<Bill[]>([]);
  const [devices, setDevices] = useState<Device[]>([]);
  const [billTitle, setBillTitle] = useState('');
  const [billAmount, setBillAmount] = useState('');
  const [deviceName, setDeviceName] = useState('');
  const [pending, setPending] = useState(0);
  const [busy, setBusy] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authBusy, setAuthBusy] = useState(false);

  const load = async () => {
    if (!householdId) return;
    const [nextBills, nextDevices, nextPending] = await Promise.all([
      listBills(householdId),
      listDevices(householdId),
      pendingSyncCount(),
    ]);
    setBills(nextBills);
    setDevices(nextDevices);
    setPending(nextPending);
  };

  useEffect(() => {
    void load().catch(error => Alert.alert('Laden fehlgeschlagen', messageOf(error)));
  }, [householdId]);

  useEffect(() => {
    if (!supabaseConfigured) return;
    void supabase.auth.getSession().then(({ data, error }) => {
      if (error) console.error('Session konnte nicht geladen werden', error);
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
      if (result.skipped) {
        Alert.alert('Cloud-Sync', result.reason ?? 'Synchronisierung derzeit nicht verfügbar.');
      } else if (result.failed > 0) {
        Alert.alert('Sync nicht vollständig', `${result.synced} übertragen, ${result.failed} fehlgeschlagen.${result.reason ? `\n\n${result.reason}` : ''}`);
      } else {
        Alert.alert('Synchronisierung', result.synced > 0 ? `${result.synced} Änderungen übertragen.` : 'Alles ist bereits aktuell.');
      }
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

  const addNewBill = async () => {
    const amount = Number(billAmount.replace(',', '.'));
    if (!householdId || !billTitle.trim() || !Number.isFinite(amount) || amount < 0) {
      return Alert.alert('Eingabe prüfen', 'Bitte Titel und einen gültigen Betrag eingeben.');
    }
    if (busy) return;
    setBusy(true);
    try {
      const due = new Date();
      due.setDate(due.getDate() + 7);
      await addBill(householdId, billTitle.trim(), amount, due.toISOString().slice(0, 10));
      setBillTitle('');
      setBillAmount('');
      await load();
      bump();
    } catch (error) {
      Alert.alert('Rechnung konnte nicht gespeichert werden', messageOf(error));
    } finally {
      setBusy(false);
    }
  };

  const addNewDevice = async () => {
    if (!householdId || !deviceName.trim()) return Alert.alert('Gerätename fehlt');
    if (busy) return;
    setBusy(true);
    try {
      await addDevice(householdId, deviceName.trim());
      setDeviceName('');
      await load();
      bump();
    } catch (error) {
      Alert.alert('Gerät konnte nicht gespeichert werden', messageOf(error));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen>
      <View style={styles.hero}>
        <View>
          <Text style={styles.kicker}>HOMEOS</Text>
          <Text style={styles.h1}>Mehr</Text>
          <Text style={styles.sub}>Konto, Cloud und Verwaltung</Text>
        </View>
        <View style={styles.heroIcon}><Ionicons name="grid-outline" size={25} color={colors.accent} /></View>
      </View>

      <Card>
        <View style={styles.syncHead}>
          <View style={[styles.syncIcon, { backgroundColor: session ? colors.successSoft : colors.surfaceMuted }]}>
            <Ionicons name={session ? 'cloud-done-outline' : 'person-outline'} size={23} color={session ? colors.success : colors.textMuted} />
          </View>
          <View style={styles.flex}>
            <Text style={styles.section}>{session ? 'Cloud-Sync' : 'HomeOS Konto'}</Text>
            <Text style={styles.meta}>
              {!supabaseConfigured
                ? 'Supabase ist nicht konfiguriert.'
                : session
                  ? `${session.user.email ?? 'Angemeldet'} · ${pending} offen`
                  : `${pending} lokale Änderungen · Anmeldung erforderlich`}
            </Text>
          </View>
        </View>
        {supabaseConfigured && !session ? (
          <>
            <TextField label="E-Mail" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" editable={!authBusy} />
            <TextField label="Passwort" value={password} onChangeText={setPassword} secureTextEntry editable={!authBusy} />
            <Button label="Anmelden" loading={authBusy} onPress={() => void signIn()} />
            <Button label="Konto erstellen" variant="secondary" disabled={authBusy} onPress={() => void signUp()} />
          </>
        ) : null}
        {session ? (
          <>
            <Button label="Jetzt synchronisieren" loading={busy} variant="secondary" onPress={() => void syncNow()} />
            <Pressable style={styles.logout} onPress={() => void supabase.auth.signOut().catch(error => Alert.alert('Abmelden fehlgeschlagen', messageOf(error)))}>
              <Text style={styles.logoutText}>Abmelden</Text>
            </Pressable>
          </>
        ) : null}
      </Card>

      <Card>
        <Text style={styles.section}>Rechnung hinzufügen</Text>
        <TextField label="Titel" value={billTitle} onChangeText={setBillTitle} editable={!busy} />
        <TextField label="Betrag" value={billAmount} onChangeText={setBillAmount} keyboardType="decimal-pad" editable={!busy} />
        <Button label="Rechnung speichern" loading={busy} disabled={!householdId} onPress={() => void addNewBill()} />
      </Card>
      {bills.slice(0, 3).map(bill => (
        <View key={bill.id} style={styles.row}>
          <Ionicons name="receipt-outline" size={20} color={colors.accent} />
          <View style={styles.flex}>
            <Text style={styles.name}>{bill.title}</Text>
            <Text style={styles.meta}>Fällig {bill.due_date}</Text>
          </View>
          <Text style={styles.value}>{formatMoney(bill.amount)}</Text>
        </View>
      ))}

      <Card>
        <Text style={styles.section}>Gerät hinzufügen</Text>
        <TextField label="Gerätename" value={deviceName} onChangeText={setDeviceName} editable={!busy} />
        <Button label="Gerät speichern" loading={busy} disabled={!householdId} onPress={() => void addNewDevice()} />
      </Card>
      {devices.slice(0, 3).map(device => (
        <View key={device.id} style={styles.row}>
          <Ionicons name="hardware-chip-outline" size={20} color={colors.accent} />
          <View style={styles.flex}>
            <Text style={styles.name}>{device.name}</Text>
            <Text style={styles.meta}>{device.manufacturer ?? 'Hersteller noch nicht erfasst'}</Text>
          </View>
        </View>
      ))}

      <Card>
        <View style={styles.syncHead}>
          <Ionicons name="information-circle-outline" size={22} color={colors.accent} />
          <View style={styles.flex}>
            <Text style={styles.name}>HomeOS 0.3.0</Text>
            <Text style={styles.meta}>Offline-first · Updates über AltStore Source</Text>
          </View>
        </View>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  kicker: { fontSize: 11, fontWeight: '800', letterSpacing: 1, color: colors.textMuted },
  h1: { fontSize: 35, lineHeight: 41, fontWeight: '800', letterSpacing: -1.1, color: colors.text },
  sub: { fontSize: 15, color: colors.textMuted },
  heroIcon: { width: 50, height: 50, borderRadius: 17, backgroundColor: colors.accentSoft, alignItems: 'center', justifyContent: 'center' },
  syncHead: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  syncIcon: { width: 46, height: 46, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  flex: { flex: 1 },
  section: { fontSize: 20, fontWeight: '800', letterSpacing: -0.4, color: colors.text },
  meta: { fontSize: 12, lineHeight: 17, color: colors.textMuted },
  row: { minHeight: 64, flexDirection: 'row', alignItems: 'center', gap: 12, padding: 13, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, backgroundColor: colors.surface },
  name: { fontSize: 15, fontWeight: '700', color: colors.text },
  value: { fontSize: 15, fontWeight: '800', color: colors.text },
  logout: { alignSelf: 'center', padding: 8 },
  logoutText: { fontSize: 13, fontWeight: '700', color: colors.textMuted },
});
