import React from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useColors } from '@/hooks/useColors';
import { useTrainer } from './TrainerProvider';
import { healAtCenterMut } from '../game/save';

interface Props {
  visible: boolean;
  onClose: () => void;
  onOpenPC: () => void;
}

export function PokeCenterModal({ visible, onClose, onOpenPC }: Props) {
  const colors = useColors();
  const { state, update } = useTrainer();

  async function heal() {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    await update((s) => {
      healAtCenterMut(s);
    });
  }

  return (
    <Modal visible={visible} animationType="fade" transparent>
      <View style={styles.scrim}>
        <View style={[styles.card, { backgroundColor: '#fef4d6', borderColor: '#d63946' }]}>
          <View style={styles.nurseRow}>
            <Text style={styles.nurseSprite}>👩‍⚕️</Text>
          </View>
          <Text style={styles.title}>Pokémon Center</Text>
          <Text style={styles.sub}>
            "Welcome, {state.trainer.name}! Need a heal? Or check the PC for stored Pokémon?"
          </Text>

          <View style={styles.stats}>
            <Stat label="🔴 BALLS" v={state.inventory.pokeball} />
            <Stat label="🍓 BERRIES" v={state.inventory.berry} />
            <Stat label="📦 BOX" v={state.box.length} />
          </View>

          <Pressable
            onPress={heal}
            style={({ pressed }) => [
              styles.btn,
              { backgroundColor: pressed ? '#b8242e' : '#d63946' },
            ]}
          >
            <Feather name="heart" size={18} color="#fff" />
            <Text style={styles.btnText}>HEAL TEAM (+3 🔴 +1 🍓)</Text>
          </Pressable>

          <Pressable
            onPress={onOpenPC}
            style={({ pressed }) => [
              styles.btn,
              { backgroundColor: pressed ? '#3c5a9e' : '#5a73c4' },
            ]}
          >
            <Feather name="hard-drive" size={18} color="#fff" />
            <Text style={styles.btnText}>USE PC (BOX)</Text>
          </Pressable>

          <Pressable
            onPress={onClose}
            style={({ pressed }) => [
              styles.btn,
              {
                backgroundColor: pressed ? '#e2cf94' : 'transparent',
                borderWidth: 2,
                borderColor: '#c9a96c',
              },
            ]}
          >
            <Feather name="log-out" size={18} color="#7c5a2a" />
            <Text style={[styles.btnText, { color: '#7c5a2a' }]}>LEAVE</Text>
          </Pressable>

          {state.visitedCenter > 0 && (
            <Text style={[styles.visited, { color: colors.hpGreen }]}>
              ✅ Visited {state.visitedCenter}× — heals also restock supplies.
            </Text>
          )}
        </View>
      </View>
    </Modal>
  );
}

function Stat({ label, v }: { label: string; v: number }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statV}>{v}</Text>
      <Text style={styles.statL}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  scrim: {
    flex: 1, backgroundColor: 'rgba(10,6,2,0.92)',
    alignItems: 'center', justifyContent: 'center', padding: 16,
  },
  card: {
    width: '100%', maxWidth: 480, borderWidth: 4, borderRadius: 18,
    padding: 18, gap: 10, alignItems: 'stretch',
  },
  nurseRow: { alignItems: 'center', marginBottom: -2 },
  nurseSprite: { fontSize: 56 },
  title: { color: '#d63946', fontSize: 22, fontWeight: '900', textAlign: 'center' },
  sub: { color: '#7c5a2a', fontSize: 13, textAlign: 'center', lineHeight: 18 },
  stats: {
    flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.7)',
    borderRadius: 10, padding: 10, justifyContent: 'space-around', marginVertical: 6,
  },
  stat: { alignItems: 'center' },
  statV: { color: '#d63946', fontSize: 20, fontWeight: '900' },
  statL: { color: '#7c5a2a', fontSize: 10, letterSpacing: 1, fontWeight: '800' },
  btn: {
    flexDirection: 'row', gap: 10, alignItems: 'center', justifyContent: 'center',
    borderRadius: 10, paddingVertical: 12, paddingHorizontal: 14,
  },
  btnText: { color: '#fff', fontWeight: '800', letterSpacing: 0.5, fontSize: 13 },
  visited: { fontSize: 11, textAlign: 'center', marginTop: 4, fontWeight: '700' },
});
