import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, spacing } from '@/theme/theme';

type Props = {
  title: string;
  subtitle?: string;
  eyebrow?: string;
  right?: ReactNode;
};

export function AppHeader({ title, subtitle, eyebrow, right }: Props) {
  return (
    <View style={styles.root}>
      <View style={styles.copy}>
        {eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}
        <Text style={styles.title}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
      {right ? <View style={styles.right}>{right}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  copy: { flex: 1 },
  eyebrow: { marginBottom: 4, fontSize: 11, fontWeight: '800', letterSpacing: 1.05, color: colors.textMuted },
  title: { fontSize: 34, lineHeight: 39, fontWeight: '800', letterSpacing: -1.1, color: colors.text },
  subtitle: { marginTop: 3, fontSize: 14, lineHeight: 20, color: colors.textMuted },
  right: { paddingTop: 2 },
});
