import { useCallback, useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import type { Session } from '@supabase/supabase-js';
import { Screen } from '@/components/Screen';
import { Card } from '@/components/Card';
import { TextField } from '@/components/TextField';
import { Button } from '@/components/Button';
import { EmptyState } from '@/components/EmptyState';
import { SwipeActionRow } from '@/components/SwipeActionRow';
import { addBill, addDevice, deleteBill, deleteDevice, listBills, listDevices } from '@/repositories/homeRepo';
import type { Bill, Device } from '@/types/models';
import { useAppStore } from '@/store/appStore';
import { colors, radius, spacing } from '@/theme/theme';
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
  const [billTitle, setBillTitle] = useState('');
  const [billAmount, setBillAmount] = useState('');
  const [deviceName, setDeviceName] = useState('');
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
    void load().catch(error => Alert.alert('HomeOS', messageOf(error)));
  }, [load, revision]);

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
        Alert.alert('Cloud-Sync', result.reason ?? 'Synchronisierung ist derzeit nicht verfügbar.');
      } else if (result.failed > 0) {
        Alert.alert(
          'Synchronisierung nicht abgeschlossen',
          `${result.failed} Änderung${result.failed === 1 ? '' : 'en'} konnte${result.failed === 1 ? '' : 'n'} nicht übertragen werden. Deine lokalen Daten bleiben erhalten.`,
          [
            { text: 'OK' },
            result.reason ? { text: 'Details', onPress: () => Alert.alert('Technische Details', result.reason ?? '') } : { text: 'Schließen' },
          ],
        );
      } else {
        Alert.alert('Synchronisierung', result.synced > 0 ? `${result.synced} Änderungen wurden übertragen.` : 'Alles ist bereits aktuell.');
      }
    } catch (error) {
      Alert.alert('Sync fehlgeschlagen', 'Die Cloud ist momentan nicht erreichbar. Deine lokalen Daten bleiben erhalten.', [
        { text: 'OK' },
        { text: 'Details', onPress: () => Alert.alert('Technische Details', messageOf(error)) },
      ]);
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
    if (!householdId || !billTitle.trim() || !Number.isFinite(amount) || amount < 0) return Alert.alert('Eingabe prüfen', 'Bitte Titel und einen gültigen Betrag eingeben.');
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
      <View style={styles.hero}>
        <View style={styles.flex}>
          <Text style={styles.kicker}>HOMEOS</Text>
          <Text style={styles.h1}>Mehr</Text>
          <Text style={styles.sub}>Konto, Cloud und Verwaltung</Text>
        </View>
        <View style={styles.heroIcon}><Ionicons name="grid-outline" size={25} color={colors.accent} /></View>
      </View>

      <Card>
        <View style={styles.cardHead}>
          <View style={[styles.statusIcon, { backgroundColor: session ? colors.successSoft : colors.surfaceMuted }]}>
            <Ionicons name={session ? 'cloud-done-outline' : 'person-outline'} size={24} color={session ? colors.success : colors.textMuted} />
          </View>
          <View style={styles.flex}>
            <View style={styles.titleLine}>
              <Text style={styles.section}>{session ? 'Cloud-Sync' : 'HomeOS Konto'}</Text>
              <View style={[styles.statusBadge, session ? styles.statusOnline : styles.statusOffline]}>
                <Text style={[styles.statusText, session ? styles.statusTextOnline : styles.statusTextOffline]}>{session ? 'VERBUNDEN' : 'LOKAL'}</Text>
              </View>
            </View>
            <Text style={styles.meta}>
              {!supabaseConfigured ? 'Cloud-Konfiguration fehlt.' : session ? `${session.user.email ?? 'Angemeldet'} · ${pending} offen` : `${pending} lokale Änderungen warten`}
            </Text>
          </View>
        </View>

        {supabaseConfigured && !session ? <>
          <View style={styles.formDivider} />
          <TextField label="E-Mail" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" editable={!authBusy} />
          <TextField label="Passwort" value={password} onChangeText={setPassword} secureTextEntry editable={!authBusy} />
          <Button label="Anmelden" loading={authBusy} onPress={() => void signIn()} />
          <Button label="Konto erstellen" variant="secondary" disabled={authBusy} onPress={() => void signUp()} />
        </> : null}

        {session ? <>
          <View style={styles.syncSummary}>
            <View><Text style={styles.syncNumber}>{pending}</Text><Text style={styles.syncLabel}>offene Änderungen</Text></View>
            <Ionicons name={pending ? 'cloud-upload-outline' : 'checkmark-circle-outline'} size={26} color={pending ? colors.warning : colors.success} />
          </View>
          <Button label="Jetzt synchronisieren" loading={busy} variant="secondary" onPress={() => void syncNow()} />
          <Pressable style={styles.logout} onPress={() => void supabase.auth.signOut().catch(error => Alert.alert('Abmelden fehlgeschlagen', messageOf(error)))}>
            <Ionicons name="log-out-outline" size={16} color={colors.textMuted} />
            <Text style={styles.logoutText}>Abmelden</Text>
          </Pressable>
        </> : null}
      </Card>

      <View style={styles.sectionHeader}>
        <View><Text style={styles.section}>Rechnungen</Text><Text style={styles.meta}>Fälligkeiten und Beträge im Blick</Text></View>
        <View style={styles.countBadge}><Text style={styles.countText}>{bills.length}</Text></View>
      </View>
      <Card>
        <Text style={styles.formTitle}>Neue Rechnung</Text>
        <TextField label="Titel" value={billTitle} onChangeText={setBillTitle} editable={!busy} placeholder="z. B. Strom" />
        <TextField label="Betrag" value={billAmount} onChangeText={setBillAmount} keyboardType="decimal-pad" editable={!busy} placeholder="0,00" />
        <Button label="Rechnung speichern" loading={busy} disabled={!householdId} onPress={() => void addNewBill()} />
      </Card>
      {bills.length ? <View style={styles.rows}>{bills.map(bill => (
        <SwipeActionRow key={bill.id} disabled={busy} onDelete={() => void removeBill(bill)}>
          <View style={styles.row}>
            <View style={styles.rowIcon}><Ionicons name="receipt-outline" size={20} color={colors.accent} /></View>
            <View style={styles.flex}><Text style={styles.name}>{bill.title}</Text><Text style={styles.meta}>Fällig {bill.due_date}</Text></View>
            <View style={styles.valueWrap}><Text style={styles.value}>{formatMoney(bill.amount)}</Text><Text style={styles.valueMeta}>{bill.status === 'paid' ? 'Bezahlt' : 'Offen'}</Text></View>
          </View>
        </SwipeActionRow>
      ))}</View> : <EmptyState icon="receipt-outline" title="Keine Rechnungen" body="Gespeicherte Rechnungen erscheinen hier." />}

      <View style={styles.sectionHeader}>
        <View><Text style={styles.section}>Geräte</Text><Text style={styles.meta}>Haushaltsgeräte zentral verwalten</Text></View>
        <View style={styles.countBadge}><Text style={styles.countText}>{devices.length}</Text></View>
      </View>
      <Card>
        <Text style={styles.formTitle}>Neues Gerät</Text>
        <TextField label="Gerätename" value={deviceName} onChangeText={setDeviceName} editable={!busy} placeholder="z. B. Geschirrspüler" />
        <Button label="Gerät speichern" loading={busy} disabled={!householdId} onPress={() => void addNewDevice()} />
      </Card>
      {devices.length ? <View style={styles.rows}>{devices.map(device => (
        <SwipeActionRow key={device.id} disabled={busy} onDelete={() => void removeDevice(device)}>
          <View style={styles.row}>
            <View style={styles.rowIcon}><Ionicons name="hardware-chip-outline" size={20} color={colors.accent} /></View>
            <View style={styles.flex}><Text style={styles.name}>{device.name}</Text><Text style={styles.meta}>{device.manufacturer ?? 'Hersteller noch nicht erfasst'}</Text></View>
            <Ionicons name="chevron-back-outline" size={17} color={colors.textSoft} />
          </View>
        </SwipeActionRow>
      ))}</View> : <EmptyState icon="hardware-chip-outline" title="Keine Geräte" body="Lege wichtige Haushaltsgeräte für Garantie und Übersicht an." />}

      <View style={styles.swipeHint}>
        <Ionicons name="arrow-back-outline" size={16} color={colors.textMuted} />
        <Text style={styles.swipeHintText}>Rechnungen und Geräte nach links wischen, um sie zu löschen</Text>
      </View>

      <Card>
        <View style={styles.cardHead}>
          <View style={styles.statusIcon}><Ionicons name="information-circle-outline" size={23} color={colors.accent} /></View>
          <View style={styles.flex}><Text style={styles.name}>HomeOS 0.4.0</Text><Text style={styles.meta}>Offline-first · Updates über deine AltStore Source</Text></View>
        </View>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  hero: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  kicker: { fontSize: 11, fontWeight: '800', letterSpacing: 1.2, color: colors.textMuted },
  h1: { fontSize: 38, lineHeight: 44, fontWeight: '800', letterSpacing: -1.35, color: colors.text },
  sub: { marginTop: 2, fontSize: 15, color: colors.textMuted },
  heroIcon: { width: 54, height: 54, borderRadius: 18, backgroundColor: colors.accentSoft, alignItems: 'center', justifyContent: 'center' },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  statusIcon: { width: 46, height: 46, borderRadius: 15, backgroundColor: colors.accentSoft, alignItems: 'center', justifyContent: 'center' },
  titleLine: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  section: { fontSize: 20, fontWeight: '800', letterSpacing: -0.4, color: colors.text },
  meta: { fontSize: 12, lineHeight: 17, color: colors.textMuted },
  statusBadge: { paddingHorizontal: 7, paddingVertical: 4, borderRadius: 999 },
  statusOnline: { backgroundColor: colors.successSoft },
  statusOffline: { backgroundColor: colors.surfaceMuted },
  statusText: { fontSize: 9, fontWeight: '800', letterSpacing: 0.7 },
  statusTextOnline: { color: colors.success },
  statusTextOffline: { color: colors.textMuted },
  formDivider: { height: 1, backgroundColor: colors.border },
  syncSummary: { padding: 14, borderRadius: radius.md, backgroundColor: colors.surfaceMuted, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  syncNumber: { fontSize: 24, fontWeight: '800', color: colors.text },
  syncLabel: { fontSize: 11, color: colors.textMuted },
  logout: { alignSelf: 'center', padding: 8, flexDirection: 'row', alignItems: 'center', gap: 6 },
  logoutText: { fontSize: 13, fontWeight: '700', color: colors.textMuted },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, paddingHorizontal: 3 },
  countBadge: { minWidth: 31, height: 31, paddingHorizontal: 9, borderRadius: 16, backgroundColor: colors.surfaceMuted, alignItems: 'center', justifyContent: 'center' },
  countText: { fontSize: 12, fontWeight: '800', color: colors.textMuted },
  formTitle: { fontSize: 16, fontWeight: '800', color: colors.text },
  rows: { gap: 8 },
  row: { minHeight: 72, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 13, paddingVertical: 11, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, backgroundColor: colors.surface },
  rowIcon: { width: 42, height: 42, borderRadius: 14, backgroundColor: colors.accentSoft, alignItems: 'center', justifyContent: 'center' },
  name: { fontSize: 16, fontWeight: '700', color: colors.text },
  valueWrap: { alignItems: 'flex-end', gap: 2 },
  value: { fontSize: 15, fontWeight: '800', color: colors.text },
  valueMeta: { fontSize: 10, color: colors.textMuted },
  swipeHint: { flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 4 },
  swipeHintText: { flex: 1, fontSize: 11, color: colors.textMuted },
});
