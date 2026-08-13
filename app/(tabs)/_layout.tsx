import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { Platform } from 'react-native';
import { colors } from '@/theme/theme';

const icons = {
  today: ['home-outline', 'home'],
  shopping: ['cart-outline', 'cart'],
  home: ['cube-outline', 'cube'],
  finance: ['wallet-outline', 'wallet'],
  more: ['grid-outline', 'grid'],
} as const;

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarHideOnKeyboard: true,
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: '#8A938C',
        tabBarStyle: {
          height: Platform.OS === 'ios' ? 84 : 70,
          paddingTop: 9,
          paddingBottom: Platform.OS === 'ios' ? 22 : 9,
          borderTopWidth: 1,
          borderTopColor: colors.border,
          backgroundColor: 'rgba(255,255,255,0.98)',
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '700', marginTop: 2 },
        tabBarIcon: ({ color, size, focused }) => {
          const pair = icons[route.name as keyof typeof icons] ?? icons.more;
          return <Ionicons name={pair[focused ? 1 : 0]} size={size + 1} color={color} />;
        },
      })}
    >
      <Tabs.Screen name="today" options={{ title: 'Heute' }} />
      <Tabs.Screen name="shopping" options={{ title: 'Einkauf' }} />
      <Tabs.Screen name="home" options={{ title: 'Zuhause' }} />
      <Tabs.Screen name="finance" options={{ title: 'Finanzen' }} />
      <Tabs.Screen name="more" options={{ title: 'Mehr' }} />
    </Tabs>
  );
}
