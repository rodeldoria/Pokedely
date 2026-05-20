import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useColors } from '@/hooks/useColors';

interface Props {
  hp: number;
  max: number;
  label?: string;
  showNumbers?: boolean;
}

export function HpBar({ hp, max, label, showNumbers = true }: Props) {
  const colors = useColors();
  const pct = max > 0 ? Math.max(0, Math.min(100, (hp / max) * 100)) : 0;
  const barColor = pct > 50 ? colors.hpGreen : pct > 20 ? colors.hpYellow : colors.hpRed;

  return (
    <View style={styles.wrap}>
      {label && (
        <Text style={[styles.label, { color: colors.foreground }]}>{label}</Text>
      )}
      <View style={[styles.barTrack, { backgroundColor: '#0e0f12', borderColor: colors.border }]}>
        <View style={[styles.barFill, { width: `${pct}%`, backgroundColor: barColor }]} />
      </View>
      {showNumbers && (
        <Text style={[styles.numbers, { color: colors.mutedForeground }]}>
          {hp} / {max}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 4 },
  label: { fontSize: 13, fontWeight: '700', letterSpacing: 0.5 },
  barTrack: {
    height: 10,
    borderRadius: 5,
    borderWidth: 1,
    overflow: 'hidden',
  },
  barFill: { height: '100%', borderRadius: 4 },
  numbers: { fontSize: 11, fontVariant: ['tabular-nums'] },
});
