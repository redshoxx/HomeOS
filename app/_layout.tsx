import 'react-native-gesture-handler';
import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { prepareDatabase } from '@/database/prepare';
import { migrateDatabase } from '@/database/db';
import { useAppStore } from '@/store/appStore';
import { flushSyncQueue } from '@/services/sync';

const queryClient = new QueryClient({ defaultOptions: { queries: { retry: 1, staleTime: 15000 } } });

export default function RootLayout() {
  const hydrate = useAppStore(s => s.hydrate);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        await prepareDatabase();
        await migrateDatabase();
        if (cancelled) return;
        await hydrate();
        void flushSyncQueue().catch(error => console.warn('Background sync failed', error));
      } catch (error) {
        console.error('HomeOS startup failed', error);
        if (!cancelled) useAppStore.setState({ ready: true, activeHouseholdId: null });
      }
    })();
    return () => { cancelled = true; };
  }, [hydrate]);

  return <QueryClientProvider client={queryClient}><Stack screenOptions={{ headerShown: false, animation: 'fade' }} /></QueryClientProvider>;
}
