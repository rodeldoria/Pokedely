import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useColors } from '@/hooks/useColors';
import { useTrainer } from '@/components/TrainerProvider';
import { BattleModal } from '@/components/BattleModal';
import { pickByType, pickEarlyKanto } from '../../data/pokedex';
import type { Pokemon } from '../../data/pokedex';

interface Area {
  id: string;
  name: string;
  blurb: string;
  icon: React.ComponentProps<typeof Feather>['name'];
  color: string;
  pick: () => Pokemon;
}

export default function ExploreScreen() {
  const colors = useColors();
  const { state } = useTrainer();
  const [wild, setWild] = useState<Pokemon | null>(null);

  const myMember = state.team[0];
  const myHp = myMember?.hp ?? 0;
  const ready = !!myMember && myHp > 0;

  const areas: Area[] = [
    {
      id: 'route1',
      name: 'Route 1 Grass',
      blurb: 'Pidgeys, Rattatas, and rare visitors',
      icon: 'wind',
      color: colors.grass,
      pick: () => pickEarlyKanto(),
    },
    {
      id: 'forest',
      name: 'Viridian Forest',
      blurb: 'Bug & grass types love it here',
      icon: 'cloud-drizzle',
      color: '#5ba36f',
      pick: () => pickByType('bug', 'grass'),
    },
    {
      id: 'pond',
      name: 'Quiet Pond',
      blurb: 'Splashy water Pokémon nearby',
      icon: 'droplet',
      color: '#5b8aa3',
      pick: () => pickByType('water'),
    },
    {
      id: 'cave',
      name: 'Rocky Cave',
      blurb: 'Rock and ground dwellers',
      icon: 'octagon',
      color: '#a37a4a',
      pick: () => pickByType('rock', 'ground'),
    },
  ];

  function enterArea(a: Area) {
    if (!ready) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    setWild(a.pick());
  }

  function closeBattle(_caught: boolean) {
    setWild(null);
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={[styles.header, { color: colors.accent }]}>WHERE TO?</Text>
        <Text style={[styles.sub, { color: colors.mutedForeground }]}>
          Tap a place to step into the tall grass.
        </Text>

        {!ready && (
          <View
            style={[
              styles.warn,
              { backgroundColor: colors.card, borderColor: colors.destructive },
            ]}
          >
            <Feather name="alert-triangle" size={18} color={colors.destructive} />
            <Text style={[styles.warnText, { color: colors.foreground }]}>
              {myMember
                ? `${myMember.name} fainted! Visit the Pokémon Center on the Home tab.`
                : 'Pick a starter from the welcome screen first.'}
            </Text>
          </View>
        )}

        <View style={styles.list}>
          {areas.map((a) => (
            <Pressable
              key={a.id}
              onPress={() => enterArea(a)}
              disabled={!ready}
              style={({ pressed }) => [
                styles.area,
                {
                  backgroundColor: pressed ? colors.secondary : colors.card,
                  borderColor: a.color,
                  opacity: ready ? 1 : 0.5,
                },
              ]}
            >
              <View style={[styles.areaIcon, { backgroundColor: a.color }]}>
                <Feather name={a.icon} size={26} color="#fff" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.areaName, { color: colors.foreground }]}>{a.name}</Text>
                <Text style={[styles.areaBlurb, { color: colors.mutedForeground }]}>
                  {a.blurb}
                </Text>
              </View>
              <Feather name="chevron-right" size={22} color={colors.mutedForeground} />
            </Pressable>
          ))}
        </View>
      </ScrollView>

      {wild && <BattleModal wild={wild} onClose={closeBattle} />}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, gap: 12, paddingBottom: 120 },
  header: { fontSize: 12, letterSpacing: 2, fontWeight: '800', marginTop: 8 },
  sub: { fontSize: 14 },
  warn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 2,
    borderRadius: 10,
    padding: 12,
  },
  warnText: { flex: 1, fontSize: 13, fontWeight: '600' },
  list: { gap: 10, marginTop: 6 },
  area: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 2,
    borderRadius: 12,
    padding: 12,
  },
  areaIcon: {
    width: 48,
    height: 48,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  areaName: { fontSize: 16, fontWeight: '800' },
  areaBlurb: { fontSize: 12, marginTop: 2 },
});
