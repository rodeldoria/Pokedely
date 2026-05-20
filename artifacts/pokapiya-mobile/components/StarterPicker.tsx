import React, { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useColors } from '@/hooks/useColors';
import { useTrainer } from './TrainerProvider';
import { PokeSprite } from './PokeSprite';
import { byId, displayName } from '../data/pokedex';
import { STARTERS } from '../data/starters';
import { recordCatchMut } from '../game/save';

const OAK_SCRIPT = [
  'Hello there! Welcome to the world of Pokémon!',
  'My name is Oak. People call me the POKÉMON PROFESSOR!',
  'This world is inhabited by creatures called Pokémon — for some they are pets, for others, battle partners.',
  'You, Addie, are about to step into a world full of dreams and adventures with Pokémon!',
  "But before you go, you'll need your very first partner. Pick one of these little friends — it'll travel with you everywhere.",
  'Use your Pokémon to battle wild ones. When they are worn out, throw a Poké Ball — and answer a smart question to make the catch!',
  "Your very own Pokémon legend is about to unfold! Let's go!",
];

export function StarterPicker() {
  const colors = useColors();
  const { state, ready, update } = useTrainer();
  const [step, setStep] = useState(0);
  const visible = ready && !state.starterChosen && state.team.length === 0;
  const inIntro = !state.oakSeen;
  const last = step >= OAK_SCRIPT.length - 1;

  async function advanceOak() {
    if (last) {
      await update((s) => {
        s.oakSeen = true;
      });
    } else {
      setStep((s) => s + 1);
    }
  }

  async function pick(id: number) {
    const p = byId(id);
    if (!p) return;
    await update((s) => {
      recordCatchMut(s, p);
      s.starterChosen = true;
    });
  }

  return (
    <Modal visible={visible} animationType="fade" transparent={false}>
      <View style={[styles.root, { backgroundColor: '#0a0518' }]}>
        {inIntro ? (
          <Pressable onPress={advanceOak} style={styles.oakRoot}>
            <View style={styles.oakRow}>
              <View style={styles.oakSpriteWrap}>
                <Text style={styles.oakSprite}>🧑‍🔬</Text>
              </View>
              <View style={[styles.bubble, { borderColor: '#c9a96c', backgroundColor: '#fffbe8' }]}>
                <Text style={styles.bubbleLabel}>PROF. OAK</Text>
                <Text style={styles.bubbleText}>{OAK_SCRIPT[step]}</Text>
                <Text style={styles.bubbleCta}>
                  {last ? '▶ TAP TO MEET YOUR STARTERS' : '▶ TAP TO CONTINUE'}
                </Text>
              </View>
            </View>
            <Text style={styles.oakProgress}>
              Step {step + 1} of {OAK_SCRIPT.length}
            </Text>
          </Pressable>
        ) : (
          <ScrollView contentContainerStyle={styles.pickRoot}>
            <Text style={[styles.title, { color: colors.foreground }]}>
              CHOOSE YOUR PARTNER
            </Text>
            <Text style={[styles.sub, { color: '#c9a96c' }]}>
              Nine little friends are ready to travel with you, Addie.
            </Text>
            <View style={styles.grid}>
              {STARTERS.map((s) => {
                const p = byId(s.id);
                if (!p) return null;
                return (
                  <Pressable
                    key={s.id}
                    onPress={() => pick(s.id)}
                    style={({ pressed }) => [
                      styles.choice,
                      {
                        backgroundColor: pressed ? '#2a2d33' : '#1d1f24',
                        borderColor: s.color,
                      },
                    ]}
                  >
                    <PokeSprite id={s.id} size={80} />
                    <Text style={[styles.name, { color: colors.foreground }]}>
                      {displayName(p)}
                    </Text>
                    <Text style={[styles.type, { color: s.color }]}>
                      {s.type.toUpperCase()}
                    </Text>
                    <Text style={[styles.blurb, { color: '#9aa0a8' }]}>
                      {s.description}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </ScrollView>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  oakRoot: { flex: 1, padding: 20, justifyContent: 'center', alignItems: 'center' },
  oakRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 16, maxWidth: 760, width: '100%' },
  oakSpriteWrap: {
    width: 90, height: 130, borderRadius: 10,
    backgroundColor: '#2a1a4a', borderWidth: 2, borderColor: '#c9a96c',
    alignItems: 'center', justifyContent: 'center',
  },
  oakSprite: { fontSize: 60 },
  bubble: {
    flex: 1, borderWidth: 3, borderRadius: 16, padding: 18, minHeight: 130,
  },
  bubbleLabel: { color: '#8d5524', fontWeight: '800', fontSize: 12, marginBottom: 8, letterSpacing: 1 },
  bubbleText: { color: '#3a2410', fontSize: 16, fontWeight: '700', lineHeight: 22 },
  bubbleCta: { color: '#8d5524', fontSize: 11, fontWeight: '800', marginTop: 12, textAlign: 'right' },
  oakProgress: { color: '#c9a96c', fontSize: 12, marginTop: 16, letterSpacing: 1 },
  pickRoot: { padding: 16, gap: 12, paddingBottom: 32 },
  title: { fontSize: 22, fontWeight: '900', textAlign: 'center', letterSpacing: 1, marginTop: 8 },
  sub: { fontSize: 13, textAlign: 'center', marginBottom: 8 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'center' },
  choice: {
    width: '46%', borderWidth: 2, borderRadius: 12, padding: 12,
    alignItems: 'center', gap: 4,
  },
  name: { fontSize: 14, fontWeight: '800' },
  type: { fontSize: 10, letterSpacing: 1, fontWeight: '800' },
  blurb: { fontSize: 11, textAlign: 'center', marginTop: 4, minHeight: 32 },
});
