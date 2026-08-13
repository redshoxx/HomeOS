import 'react-native-gesture-handler';
import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { migrateDatabase } from '@/database/db';
import { useAppStore } from '@/store/appStore';
import { flushSyncQueue } from '@/services/sync';

const queryClient=new QueryClient({defaultOptions:{queries:{retry:1,staleTime:15000}}});

export default function RootLayout(){
  const hydrate=useAppStore(s=>s.hydrate);
  useEffect(()=>{(async()=>{await migrateDatabase();await hydrate();void flushSyncQueue();})().catch(console.error);},[hydrate]);
  return <QueryClientProvider client={queryClient}><Stack screenOptions={{headerShown:false}} /></QueryClientProvider>;
}
