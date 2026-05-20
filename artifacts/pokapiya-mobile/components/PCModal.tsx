import React, { useState } from 'react';
import { Alert, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { PokeSprite } from './PokeSprite';
import { useTrainer } from './TrainerProvider';
import { displayName } from '../data/pokedex';
import type { PartyMember } from '../game/save';

interface Props {
  visible: boolean;
  onClose: () => void;
}

type Selected = { source: 'team' | 'box'; index: number } | null;

export function PCModal({ visible, onClose }: Props) {
  const { state, update } = useTrainer();
  const [sel, setSel] = useState<Selected>(null);

  function click(source: 'team' | 'box', index: number) {
    if (!sel) {
      setSel({ source, index });
      return;
    }
    if (sel.source === source && sel.index === index) {
      setSel(null);
      return;
    }
    const a = sel;
    const b = { source, index };
    update((s) => {
      if (a.source === b.source) {
        const arr = a.source === 'team' ? s.team : s.box;
        const va = arr[a.index];
        const vb = arr[b.index];
        if (va && vb) {
          arr[a.index] = vb;
          arr[b.index] = va;
        }
      } else {
        const ga = a.source === 'team' ? s.team[a.index] : s.box[a.index];
        const gb = b.source === 'team' ? s.team[b.index] : s.box[b.index];
        // Swap across storages only when both slots have Pokémon
        if (ga && gb) {
          if (a.source === 'team') s.team[a.index] = gb;
          else s.box[a.index] = gb;
          if (b.source === 'team') s.team[b.index] = ga;
          else s.box[b.index] = ga;
        }
      }
    });
    setSel(null);
  }

  function moveToBox(index: number) {
    if (state.team.length <= 1) {
      Alert.alert('Wait!', 'You need at least one Pokémon on your team.');
      return;
    }
    update((s) => {
      const [mon] = s.team.splice(index, 1);
      if (mon) s.box.push(mon);
    });
    setSel(null);
  }

  function moveToTeam(index: number) {
    if (state.team.length >= 6) {
      Alert.alert('Team full', 'Send a team member to the box first.');
      return;
    }
    update((s) => {
      const [mon] = s.box.splice(index, 1);
      if (mon) s.team.push(mon);
    });
    setSel(null);
  }

  function release(index: number) {
    const mon = state.box[index];
    if (!mon) return;
    Alert.alert(
      'Release ' + displayName(mon) + '?',
      'It will be set free and removed from your box.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Release', style: 'destructive', onPress: () => {
            update((s) => { s.box.splice(index, 1); });
            setSel(null);
          },
        },
      ],
    );
  }

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.scrim}>
        <View style={styles.card}>
          <View style={styles.header}>
            <Text style={styles.title}>💾 Bill's PC — Storage</Text>
            <Pressable onPress={onClose} style={({ pressed }) => [
              styles.closeBtn, { backgroundColor: pressed ? '#0a0d2a' : '#1a1f44' },
            ]}>
              <Feather name="x" size={16} color="#fff" />
            </Pressable>
          </View>

          <Text style={styles.hint}>
            Tap two Pokémon to swap. {sel ? 'Pick another to swap.' : ''}
          </Text>

          <View style={styles.section}>
            <Text style={styles.sectionLabel}>👥 ACTIVE TEAM ({state.team.length}/6)</Text>
            <View style={styles.gridTeam}>
              {Array.from({ length: 6 }).map((_, i) => {
                const m = state.team[i];
                const isSel = sel?.source === 'team' && sel.index === i;
                return (
                  <Slot
                    key={'t' + i}
                    mon={m}
                    selected={isSel}
                    onPress={() => m && click('team', i)}
                    actionLabel={m && state.team.length > 1 ? '→ BOX' : undefined}
                    onAction={m && state.team.length > 1 ? () => moveToBox(i) : undefined}
                  />
                );
              })}
            </View>
          </View>

          <View style={[styles.section, { flex: 1 }]}>
            <Text style={styles.sectionLabel}>📦 BOX ({state.box.length})</Text>
            {state.box.length === 0 ? (
              <Text style={styles.empty}>
                No Pokémon in storage. Catch more than 6 and they'll come here!
              </Text>
            ) : (
              <ScrollView contentContainerStyle={styles.gridBox}>
                {state.box.map((m, i) => {
                  const isSel = sel?.source === 'box' && sel.index === i;
                  const canMove = state.team.length < 6;
                  return (
                    <Slot
                      key={'b' + m.caughtAt + i}
                      mon={m}
                      selected={isSel}
                      onPress={() => click('box', i)}
                      actionLabel={canMove ? '↑ TEAM' : '🕊 FREE'}
                      onAction={canMove ? () => moveToTeam(i) : () => release(i)}
                    />
                  );
                })}
              </ScrollView>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}

function Slot({
  mon, selected, onPress, actionLabel, onAction,
}: {
  mon?: PartyMember;
  selected: boolean;
  onPress: () => void;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.slot,
        {
          backgroundColor: mon ? (selected ? '#ffd54a' : '#fff') : 'rgba(255,255,255,0.05)',
          borderColor: selected ? '#fff' : mon ? '#7e95cb' : '#2a3a78',
        },
      ]}
    >
      {mon ? (
        <>
          <PokeSprite id={mon.id} size={44} />
          <Text style={styles.slotName} numberOfLines={1}>{displayName(mon)}</Text>
          {actionLabel && onAction && (
            <Pressable
              onPress={(e) => { e.stopPropagation(); onAction(); }}
              style={({ pressed }) => [
                styles.slotBtn,
                { backgroundColor: pressed ? '#0a0d2a' : '#2a3a78' },
              ]}
            >
              <Text style={styles.slotBtnText}>{actionLabel}</Text>
            </Pressable>
          )}
        </>
      ) : (
        <Text style={styles.slotEmpty}>— empty —</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  scrim: {
    flex: 1, backgroundColor: 'rgba(10,10,40,0.92)',
    alignItems: 'center', justifyContent: 'center', padding: 16,
  },
  card: {
    width: '100%', maxWidth: 720, maxHeight: '92%', borderWidth: 4,
    borderColor: '#1a1f44', backgroundColor: '#2a3a78', borderRadius: 18,
    padding: 14, gap: 10,
  },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { color: '#fff', fontSize: 18, fontWeight: '900' },
  closeBtn: { padding: 8, borderRadius: 8 },
  hint: { color: '#cfd6f0', fontSize: 12, marginBottom: 4 },
  section: {
    backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 10,
    padding: 10, gap: 8,
  },
  sectionLabel: { color: '#ffd54a', fontSize: 12, fontWeight: '800', letterSpacing: 1 },
  gridTeam: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  gridBox: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, paddingBottom: 8 },
  slot: {
    width: '15.5%', minWidth: 90, minHeight: 110, borderWidth: 2, borderRadius: 8,
    padding: 4, alignItems: 'center', justifyContent: 'space-between',
  },
  slotName: { color: '#1a1f44', fontSize: 10, fontWeight: '800', textAlign: 'center' },
  slotEmpty: { color: '#5a73c4', fontSize: 10, margin: 'auto' },
  slotBtn: { borderRadius: 4, paddingVertical: 2, paddingHorizontal: 4 },
  slotBtnText: { color: '#fff', fontSize: 9, fontWeight: '800' },
  empty: { color: '#cfd6f0', textAlign: 'center', padding: 20, fontSize: 13 },
});
