import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useColors } from '@/hooks/useColors';

interface Props {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  onPress: () => void;
  disabled?: boolean;
  accent?: string;
  testID?: string;
}

export function RetroButton({ title, subtitle, icon, onPress, disabled, accent, testID }: Props) {
  const colors = useColors();
  const border = disabled ? colors.border : accent || colors.accent;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      testID={testID}
      style={({ pressed }) => [
        styles.btn,
        {
          backgroundColor: pressed ? colors.secondary : colors.card,
          borderColor: border,
          opacity: disabled ? 0.4 : 1,
        },
      ]}
    >
      {icon && <View style={styles.icon}>{icon}</View>}
      <Text style={[styles.title, { color: colors.foreground }]}>{title.toUpperCase()}</Text>
      {subtitle && (
        <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
          {subtitle.toUpperCase()}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    flex: 1,
    borderWidth: 2,
    borderRadius: 10,
    paddingVertical: 14,
    paddingHorizontal: 10,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    minHeight: 80,
  },
  icon: { marginBottom: 2 },
  title: { fontSize: 14, fontWeight: '800', letterSpacing: 1 },
  subtitle: { fontSize: 10, letterSpacing: 0.8, textAlign: 'center' },
});
