import React, { useMemo } from 'react';
import { Image, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useColors } from '@/hooks/useColors';
import { useTrainer } from '@/components/TrainerProvider';
import { spriteUrl } from '../../data/pokedex';

// Render first 151 (Kanto) for the dex grid
const KANTO_IDS = Array.from({ length: 151 }, (_, i) => i + 1);

export default function PokedexScreen() {
  const colors = useColors();
  const { state } = useTrainer();

  const counts = useMemo(() => {
    let seen = 0;
    let caught = 0;
    for (const id of KANTO_IDS) {
      const e = state.pokedex[id];
      if (!e) continue;
      if (e.seen) seen += 1;
      if (e.caught) caught += 1;
    }
    return { seen, caught };
  }, [state.pokedex]);

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={styles.container}
    >
      <Text style={[styles.header, { color: colors.accent }]}>POKÉDEX</Text>
      <Text style={[styles.sub, { color: colors.mutedForeground }]}>
        Seen {counts.seen} · Caught {counts.caught} of 151
      </Text>

      <View style={styles.grid}>
        {KANTO_IDS.map((id) => {
          const entry = state.pokedex[id];
          const seen = !!entry?.seen;
          const caught = !!entry?.caught;
          return (
            <View
              key={id}
              style={[
                styles.cell,
                {
                  backgroundColor: colors.card,
                  borderColor: caught
                    ? colors.accent
                    : seen
                      ? colors.border
                      : '#1a1c20',
                },
              ]}
            >
              {seen ? (
                <Image
                  source={{ uri: spriteUrl(id) }}
                  style={[
                    styles.sprite,
                    { tintColor: caught ? undefined : '#000', opacity: caught ? 1 : 0.85 },
                  ]}
                  resizeMode="contain"
                />
              ) : (
                <Text style={[styles.q, { color: colors.mutedForeground }]}>?</Text>
              )}
              <Text style={[styles.num, { color: colors.mutedForeground }]}>
                #{String(id).padStart(3, '0')}
              </Text>
            </View>
          );
        })}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 12, paddingBottom: 120 },
  header: { fontSize: 12, letterSpacing: 2, fontWeight: '800', marginTop: 8, paddingHorizontal: 4 },
  sub: { fontSize: 13, paddingHorizontal: 4, marginBottom: 10 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, justifyContent: 'flex-start' },
  cell: {
    width: '23%',
    aspectRatio: 1,
    borderWidth: 2,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 4,
  },
  sprite: { width: '78%', height: '70%' },
  num: { fontSize: 10, fontWeight: '700' },
  q: { fontSize: 26, fontWeight: '800' },
});
