import type { ComponentProps } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { colors, radius, spacing } from '@/theme/theme';
import { Button } from './Button';

type IconName = ComponentProps<typeof Ionicons>['name'];

export function EmptyState({
  title,
  body,
  action,
  onAction,
  icon = 'leaf-outline',
}: {
  title: string;
  body: string;
  action?: string;
  onAction?: () => void;
  icon?: IconName;
}) {
  return (
    <View style={styles.wrap}>
      <View style={styles.icon}><Ionicons name={icon} size={24} color={colors.accent} /></View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.body}>{body}</Text>
      {action && onAction ? <Button label={action} onPress={onAction} variant="secondary" /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: 34,
    gap: spacing.sm,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.border,
    backgroundColor: colors.surfaceRaised,
  },
  icon: { width: 48, height: 48, borderRadius: 16, backgroundColor: colors.accentSoft, alignItems: 'center', justifyContent: 'center' },
  title: { marginTop: 2, fontSize: 18, fontWeight: '800', color: colors.text, textAlign: 'center' },
  body: { color: colors.textMuted, fontSize: 14, lineHeight: 20, textAlign: 'center' },
});
