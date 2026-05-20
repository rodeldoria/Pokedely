import React from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useColors } from '@/hooks/useColors';
import { useTrainer } from './TrainerProvider';
import { PokeSprite } from './PokeSprite';
import { byId, displayName } from '../data/pokedex';
import { recordCatchMut } from '../game/save';

const STARTERS = [1, 4, 7];

export function StarterPicker() {
  const colors = useColors();
  const { state, ready, update } = useTrainer();
  const visible = ready && state.starterChosen === false && state.team.length === 0;

  async function pick(id: number) {
    const p = byId(id);
    if (!p) return;
    await update((s) => {
      recordCatchMut(s, p);
      s.starterChosen = true;
    });
  }

  return (
    <Modal visible={visible} animationType="fade" transparent>
      <View style={[styles.scrim, { backgroundColor: 'rgba(0,0,0,0.85)' }]}>
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.accent }]}>
          <Text style={[styles.title, { color: colors.foreground }]}>
            Welcome, Addie!
          </Text>
          <Text style={[styles.sub, { color: colors.mutedForeground }]}>
            Pick your first Pokémon partner.
          </Text>
          <View style={styles.row}>
            {STARTERS.map((id) => {
              const p = byId(id);
              if (!p) return null;
              return (
                <Pressable
                  key={id}
                  onPress={() => pick(id)}
                  style={({ pressed }) => [
                    styles.choice,
                    {
                      backgroundColor: pressed ? colors.secondary : colors.background,
                      borderColor: colors.border,
                    },
                  ]}
                >
                  <PokeSprite id={id} size={96} />
                  <Text style={[styles.name, { color: colors.foreground }]}>
                    {displayName(p)}
                  </Text>
                  <Text style={[styles.type, { color: colors.accent }]}>
                    {p.types.join(' · ').toUpperCase()}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  scrim: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 16 },
  card: {
    width: '100%',
    maxWidth: 460,
    borderWidth: 2,
    borderRadius: 14,
    padding: 18,
    gap: 12,
  },
  title: { fontSize: 22, fontWeight: '800', textAlign: 'center' },
  sub: { fontSize: 14, textAlign: 'center' },
  row: { flexDirection: 'row', gap: 8, marginTop: 6 },
  choice: { flex: 1, borderWidth: 2, borderRadius: 12, padding: 10, alignItems: 'center', gap: 4 },
  name: { fontSize: 14, fontWeight: '800' },
  type: { fontSize: 10, letterSpacing: 1, fontWeight: '700' },
});
