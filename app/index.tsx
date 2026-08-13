import { Redirect } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';
import { colors } from '@/theme/theme';
import { useAppStore } from '@/store/appStore';

export default function Index() {
  const ready = useAppStore(s => s.ready);
  const household = useAppStore(s => s.activeHouseholdId);

  if (!ready) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  return <Redirect href={household ? '/today' : '/onboarding'} />;
}
