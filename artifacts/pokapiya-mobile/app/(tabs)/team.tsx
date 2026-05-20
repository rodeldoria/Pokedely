import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import { useTrainer } from '@/components/TrainerProvider';
import { PokeSprite } from '@/components/PokeSprite';
import { HpBar } from '@/components/HpBar';
import { displayName } from '../../data/pokedex';
import { ensureMemberHp, getLevel } from '../../game/save';

export default function TeamScreen() {
  const colors = useColors();
  const { state } = useTrainer();
  const level = getLevel(state);

  state.team.forEach((m) => ensureMemberHp(m, level));

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={styles.container}
    >
      <Text style={[styles.header, { color: colors.accent }]}>YOUR TEAM</Text>
      <Text style={[styles.sub, { color: colors.mutedForeground }]}>
        Up to 6 Pokémon travel with you. The first one battles.
      </Text>

      {state.team.length === 0 && (
        <View style={[styles.empty, { borderColor: colors.border }]}>
          <Feather name="users" size={32} color={colors.mutedForeground} />
          <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
            No Pokémon yet. Catch one on the Explore tab!
          </Text>
        </View>
      )}

      {state.team.map((m, i) => (
        <View
          key={m.id + '_' + i}
          style={[
            styles.row,
            { backgroundColor: colors.card, borderColor: i === 0 ? colors.accent : colors.border },
          ]}
        >
          <PokeSprite id={m.id} size={72} />
          <View style={{ flex: 1, gap: 6 }}>
            <View style={styles.nameRow}>
              <Text style={[styles.name, { color: colors.foreground }]}>{displayName(m)}</Text>
              {i === 0 && (
                <Text style={[styles.lead, { color: colors.accent }]}>LEAD</Text>
              )}
            </View>
            <Text style={[styles.types, { color: colors.mutedForeground }]}>
              {m.types.join(' · ').toUpperCase()}
            </Text>
            <HpBar hp={m.hp ?? 0} max={m.maxHp ?? 0} />
          </View>
        </View>
      ))}

      {state.box.length > 0 && (
        <View style={{ marginTop: 16 }}>
          <Text style={[styles.header, { color: colors.accent }]}>BOX</Text>
          <Text style={[styles.sub, { color: colors.mutedForeground }]}>
            Pokémon waiting safely at the PC.
          </Text>
          <View style={{ gap: 8, marginTop: 8 }}>
            {state.box.map((m, i) => (
              <View
                key={'box_' + m.id + '_' + i}
                style={[
                  styles.boxRow,
                  { backgroundColor: colors.card, borderColor: colors.border },
                ]}
              >
                <PokeSprite id={m.id} size={48} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.name, { color: colors.foreground }]}>
                    {displayName(m)}
                  </Text>
                  <Text style={[styles.types, { color: colors.mutedForeground }]}>
                    {m.types.join(' · ').toUpperCase()}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, gap: 10, paddingBottom: 120 },
  header: { fontSize: 12, letterSpacing: 2, fontWeight: '800', marginTop: 8 },
  sub: { fontSize: 13, marginBottom: 6 },
  empty: {
    borderWidth: 2,
    borderStyle: 'dashed',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    gap: 10,
    marginTop: 12,
  },
  emptyText: { fontSize: 14, textAlign: 'center' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 2,
    borderRadius: 12,
    padding: 12,
  },
  boxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderRadius: 10,
    padding: 8,
  },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  name: { fontSize: 16, fontWeight: '800' },
  lead: {
    fontSize: 9,
    letterSpacing: 1,
    fontWeight: '800',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#f0c050',
  },
  types: { fontSize: 11, letterSpacing: 1, fontWeight: '700' },
});
