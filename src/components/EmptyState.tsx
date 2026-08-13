import { StyleSheet, Text, View } from 'react-native';
import { colors, spacing } from '@/theme/theme';
import { Button } from './Button';

export function EmptyState({ title, body, action, onAction }: { title: string; body: string; action?: string; onAction?: () => void }) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.body}>{body}</Text>
      {action && onAction ? <Button label={action} onPress={onAction} variant="secondary" /> : null}
    </View>
  );
}

const styles = StyleSheet.create({ wrap: { paddingVertical: 28, gap: spacing.sm }, title: { fontSize: 18, fontWeight: '700', color: colors.text }, body: { color: colors.textMuted, fontSize: 15, lineHeight: 21 } });
