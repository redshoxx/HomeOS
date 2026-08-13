import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native';
import { colors, radius, spacing } from '@/theme/theme';

type Props = {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'danger';
  disabled?: boolean;
  loading?: boolean;
};

export function Button({ label, onPress, variant = 'primary', disabled, loading }: Props) {
  const locked = disabled || loading;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: locked, busy: loading }}
      onPress={onPress}
      disabled={locked}
      style={({ pressed }) => [
        styles.base,
        styles[variant],
        pressed && !locked && styles.pressed,
        locked && styles.disabled,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'primary' ? colors.accentText : colors.accent} />
      ) : (
        <Text style={[styles.label, variant !== 'primary' && styles.darkLabel]}>{label}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: { minHeight: 52, paddingHorizontal: spacing.md, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  primary: { backgroundColor: colors.accent },
  secondary: { backgroundColor: colors.surfaceMuted },
  danger: { backgroundColor: colors.dangerSoft },
  label: { color: colors.accentText, fontSize: 15, fontWeight: '700' },
  darkLabel: { color: colors.text },
  pressed: { transform: [{ scale: 0.985 }], opacity: 0.88 },
  disabled: { opacity: 0.5 },
});
