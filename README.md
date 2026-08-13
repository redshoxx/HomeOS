# HomeOS 0.1.0

Native Haushalts-App auf Basis von React Native, Expo und TypeScript. Die Foundation-Version enthält lokale SQLite-Datenhaltung, Offline-CRUD, Sync-Queue, Supabase Auth/Cloud-Sync, Einkauf, Vorrat, Aufgaben, Ausgaben, Rechnungen, Geräte und EAS-Buildprofile.

## Lokaler Start unter Windows

```powershell
npm install
copy .env.example .env
npm run start
```

In `.env` werden nur die öffentlichen Supabase-Clientwerte eingetragen. Private Service-Role-Keys gehören nicht in die Mobile-App oder ins Repository.

## Supabase

Die initiale Cloud-Migration liegt unter:

```text
supabase/migrations/001_initial.sql
```

Sie erstellt Tabellen, Beziehungen, RLS-Policies und Indizes für die aktuell implementierten Cloud-Entitäten.

## Prüfungen

```powershell
npm run typecheck
npm run test
npm run lint
```

## Android APK

```powershell
npm install -g eas-cli
eas login
npm run build:android
```

Das EAS-Profil `android-apk` erzeugt eine direkt installierbare APK.

## iOS / Sideloadly

```powershell
npm install -g eas-cli
eas login
npm run build:ios
```

Die iOS-Konfiguration verwendet den stabilen Bundle Identifier `at.homeos.mobile` und das EAS-Profil `ios-sideload`. Der iOS-Build wird in einer macOS-/Cloud-Buildumgebung erzeugt und ist für den anschließenden Sideloadly-Workflow vorgesehen.

## Offline-Architektur

```text
UI
↓
Expo SQLite
↓
sync_queue
↓
Supabase
```

Kernänderungen werden zuerst lokal gespeichert. Cloud-Synchronisierung erfolgt anschließend, wenn eine Verbindung und eine gültige Sitzung vorhanden sind.

## Status

HomeOS 0.1.0 ist ein Foundation-Release und noch nicht die vollständige 1.0.0. Weitere Module aus der Roadmap werden schrittweise ergänzt, ohne lokale Benutzerdaten bei Updates zu löschen.
