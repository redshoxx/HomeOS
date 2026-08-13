import { Pressable, StyleSheet, Text } from 'react-native';
import { colors, radius, spacing } from '@/theme/theme';

type Props = { label: string; onPress: () => void; variant?: 'primary' | 'secondary' | 'danger'; disabled?: boolean };

export function Button({ label, onPress, variant = 'primary', disabled }: Props) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [styles.base, styles[variant], pressed && styles.pressed, disabled && styles.disabled]}
    >
      <Text style={[styles.label, variant !== 'primary' && styles.darkLabel]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: { minHeight: 48, paddingHorizontal: spacing.md, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  primary: { backgroundColor: colors.accent },
  secondary: { backgroundColor: colors.surfaceMuted },
  danger: { backgroundColor: '#F3DEDE' },
  label: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
  darkLabel: { color: colors.text },
  pressed: { opacity: 0.75 },
  disabled: { opacity: 0.45 },
});
