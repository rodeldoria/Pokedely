import React from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import { useTrainer } from '@/components/TrainerProvider';
import { RetroButton } from '@/components/RetroButton';
import { getLevel, healAtCenterMut, xpToNextLevel } from '../../game/save';

export default function HomeScreen() {
  const colors = useColors();
  const { state, ready, update, reset } = useTrainer();

  if (!ready) return <View style={[styles.center, { backgroundColor: colors.background }]} />;

  const level = getLevel(state);
  const xp = xpToNextLevel(state);
  const total = state.stats.correct + state.stats.wrong;
  const acc = total > 0 ? Math.round((state.stats.correct / total) * 100) : 100;
  const xpPct = Math.max(0, Math.min(100, (xp.have / Math.max(1, xp.need)) * 100));

  function confirmReset() {
    Alert.alert(
      'Start over?',
      'This will erase your Pokédex, team, and stats. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Start over', style: 'destructive', onPress: () => reset() },
      ],
    );
  }

  function healUp() {
    update((s) => {
      healAtCenterMut(s);
    });
    Alert.alert('Pokémon Center', 'Your team is fully healed! +3 Poké Balls, +1 Berry.');
  }

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={styles.container}
    >
      <View style={styles.hero}>
        <Text style={[styles.hello, { color: colors.accent }]}>HELLO,</Text>
        <Text style={[styles.name, { color: colors.foreground }]}>
          {state.trainer.name.toUpperCase()}
        </Text>
        <Text style={[styles.tagline, { color: colors.mutedForeground }]}>
          Trainer level {level} · {state.stats.caught} caught
        </Text>
      </View>

      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.cardHeader}>
          <Feather name="award" size={18} color={colors.accent} />
          <Text style={[styles.cardTitle, { color: colors.foreground }]}>STEM XP</Text>
        </View>
        <View style={[styles.xpTrack, { backgroundColor: '#0e0f12', borderColor: colors.border }]}>
          <View style={[styles.xpFill, { width: `${xpPct}%`, backgroundColor: colors.accent }]} />
        </View>
        <Text style={[styles.xpText, { color: colors.mutedForeground }]}>
          {xp.have} / {xp.need} correct · {acc}% accuracy
        </Text>
      </View>

      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.cardHeader}>
          <Feather name="package" size={18} color={colors.accent} />
          <Text style={[styles.cardTitle, { color: colors.foreground }]}>BAG</Text>
        </View>
        <View style={styles.invRow}>
          <Stat label="Poké Balls" value={state.inventory.pokeball} color={colors.foreground} />
          <Stat label="Berries" value={state.inventory.berry} color={colors.foreground} />
        </View>
      </View>

      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.cardHeader}>
          <Feather name="bar-chart-2" size={18} color={colors.accent} />
          <Text style={[styles.cardTitle, { color: colors.foreground }]}>ADVENTURE</Text>
        </View>
        <View style={styles.invRow}>
          <Stat label="Encounters" value={state.stats.encounters} color={colors.foreground} />
          <Stat label="Correct" value={state.stats.correct} color={colors.foreground} />
          <Stat label="Pokédex" value={Object.keys(state.pokedex).length} color={colors.foreground} />
        </View>
      </View>

      <View style={styles.row}>
        <RetroButton
          title="Heal Team"
          subtitle="Visit center"
          icon={<Feather name="heart" size={22} color={colors.hpGreen} />}
          onPress={healUp}
          accent={colors.hpGreen}
        />
        <RetroButton
          title="Restart"
          subtitle="New game"
          icon={<Feather name="refresh-cw" size={22} color={colors.destructive} />}
          onPress={confirmReset}
          accent={colors.destructive}
        />
      </View>
    </ScrollView>
  );
}

function Stat({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <View style={styles.stat}>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: '#9aa0a8' }]}>{label.toUpperCase()}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, gap: 14, paddingBottom: 120 },
  center: { flex: 1 },
  hero: { gap: 2, marginTop: 8 },
  hello: { fontSize: 12, letterSpacing: 2, fontWeight: '800' },
  name: { fontSize: 32, fontWeight: '900', letterSpacing: 1 },
  tagline: { fontSize: 13, marginTop: 2 },
  card: {
    borderWidth: 2,
    borderRadius: 12,
    padding: 14,
    gap: 10,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cardTitle: { fontSize: 12, fontWeight: '800', letterSpacing: 1.5 },
  xpTrack: { height: 10, borderRadius: 5, borderWidth: 1, overflow: 'hidden' },
  xpFill: { height: '100%' },
  xpText: { fontSize: 12 },
  invRow: { flexDirection: 'row', gap: 16 },
  stat: { flex: 1 },
  statValue: { fontSize: 22, fontWeight: '800' },
  statLabel: { fontSize: 10, letterSpacing: 1, fontWeight: '700', marginTop: 2 },
  row: { flexDirection: 'row', gap: 10 },
});
