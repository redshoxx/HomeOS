import type { ComponentProps, PropsWithChildren } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import Swipeable from 'react-native-gesture-handler/ReanimatedSwipeable';
import { colors, radius } from '@/theme/theme';

type IconName = ComponentProps<typeof Ionicons>['name'];

type Props = PropsWithChildren<{
  onDelete: () => void;
  onPrimaryAction?: () => void;
  primaryLabel?: string;
  primaryIcon?: IconName;
  disabled?: boolean;
}>;

export function SwipeActionRow({
  children,
  onDelete,
  onPrimaryAction,
  primaryLabel = 'Erledigt',
  primaryIcon = 'checkmark-circle-outline',
  disabled = false,
}: Props) {
  const renderRight = () => (
    <Pressable accessibilityRole="button" accessibilityLabel="Löschen" disabled={disabled} onPress={onDelete} style={({ pressed }) => [styles.action, styles.deleteAction, pressed && styles.pressed]}>
      <Ionicons name="trash-outline" size={21} color="#fff" />
      <Text style={styles.actionText}>Löschen</Text>
    </Pressable>
  );

  const renderLeft = onPrimaryAction ? () => (
    <Pressable accessibilityRole="button" accessibilityLabel={primaryLabel} disabled={disabled} onPress={onPrimaryAction} style={({ pressed }) => [styles.action, styles.primaryAction, pressed && styles.pressed]}>
      <Ionicons name={primaryIcon} size={21} color="#fff" />
      <Text style={styles.actionText}>{primaryLabel}</Text>
    </Pressable>
  ) : undefined;

  return (
    <Swipeable
      enabled={!disabled}
      friction={1.8}
      leftThreshold={44}
      rightThreshold={44}
      overshootLeft={false}
      overshootRight={false}
      renderLeftActions={renderLeft}
      renderRightActions={renderRight}
      containerStyle={styles.container}
      childrenContainerStyle={styles.children}
    >
      <View style={styles.children}>{children}</View>
    </Swipeable>
  );
}

const styles = StyleSheet.create({
  container: { borderRadius: radius.md, overflow: 'hidden' },
  children: { backgroundColor: colors.surface },
  action: { width: 96, alignItems: 'center', justifyContent: 'center', gap: 5 },
  deleteAction: { backgroundColor: colors.danger },
  primaryAction: { backgroundColor: colors.success },
  actionText: { color: '#fff', fontSize: 12, fontWeight: '800' },
  pressed: { opacity: 0.8 },
});
