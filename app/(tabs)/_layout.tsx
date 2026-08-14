import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { Platform, View } from 'react-native';
import { colors } from '@/theme/theme';

const icons = {
  today: ['home-outline', 'home'],
  shopping: ['cart-outline', 'cart'],
  home: ['layers-outline', 'layers'],
  finance: ['wallet-outline', 'wallet'],
} as const;

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarHideOnKeyboard: true,
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.textSoft,
        tabBarStyle: {
          height: Platform.OS === 'ios' ? 86 : 72,
          paddingTop: 8,
          paddingBottom: Platform.OS === 'ios' ? 21 : 8,
          borderTopWidth: 0,
          backgroundColor: colors.surface,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.06,
          shadowRadius: 14,
          elevation: 14,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '700', marginTop: 2 },
        tabBarIcon: ({ color, size, focused }) => {
          if (route.name === 'add') {
            return (
              <View
                style={{
                  width: 58,
                  height: 58,
                  marginTop: -24,
                  borderRadius: 20,
                  backgroundColor: colors.accent,
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderWidth: 5,
                  borderColor: colors.background,
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.14,
                  shadowRadius: 8,
                  elevation: 9,
                }}
              >
                <Ionicons name="add" size={31} color="#fff" />
              </View>
            );
          }

          const pair = icons[route.name as keyof typeof icons] ?? icons.today;
          return <Ionicons name={pair[focused ? 1 : 0]} size={size + 1} color={color} />;
        },
      })}
    >
      <Tabs.Screen name="today" options={{ title: 'Start' }} />
      <Tabs.Screen name="shopping" options={{ title: 'Einkauf' }} />
      <Tabs.Screen name="add" options={{ title: '' }} />
      <Tabs.Screen name="home" options={{ title: 'Zuhause' }} />
      <Tabs.Screen name="finance" options={{ title: 'Geld' }} />
      <Tabs.Screen name="more" options={{ href: null }} />
    </Tabs>
  );
}
