import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useColors } from '@/hooks/useColors';
import { useTrainer } from '@/components/TrainerProvider';
import { BattleModal, type BattleResult } from '@/components/BattleModal';
import { PokeCenterModal } from '@/components/PokeCenterModal';
import { PCModal } from '@/components/PCModal';
import { PokeSprite } from '@/components/PokeSprite';
import {
  TILE, WORLD_MAP, WORLD_W, WORLD_H, TRAINERS,
  isSolid, isTallGrass, isPokeCenter, trainerAt, adjacentTrainer,
  type MobileTrainer,
} from '../../game/overworld';
import {
  awardRewardMut, defeatTrainerMut, REWARD_LABELS, SPAWN, saveState,
} from '../../game/save';
import { byId, pickEarlyKanto, pickByType } from '../../data/pokedex';
import type { Pokemon } from '../../data/pokedex';

const TILE_SIZE = 26;

const TILE_COLOR: Record<number, string> = {
  [TILE.GRASS]: '#5fae5f',
  [TILE.TALLGRASS]: '#2f7a3d',
  [TILE.TREE]: '#1f4a2a',
  [TILE.WATER]: '#3a78c4',
  [TILE.PATH]: '#d8c089',
  [TILE.FLOWER]: '#88c4a8',
  [TILE.ROCK]: '#6c6c6c',
  [TILE.PC_WALL]: '#c84a4a',
  [TILE.PC_DOOR]: '#f1ebd6',
  [TILE.SAND]: '#e2cf94',
};

function pickWildForArea(tx: number, ty: number): Pokemon {
  // Top right grasses: bug/grass; left tall grass: early kanto;
  // bottom near water: water; default early kanto.
  if (tx >= 7 && ty <= 4) return pickByType('bug', 'grass');
  if (ty >= 11 && tx <= 4) return pickByType('rock', 'ground');
  if (tx >= 7 && ty >= 10) return pickEarlyKanto();
  return pickEarlyKanto();
}

export default function ExploreScreen() {
  const colors = useColors();
  const { state, ready, update } = useTrainer();
  const [wild, setWild] = useState<Pokemon | null>(null);
  const [activeTrainer, setActiveTrainer] = useState<MobileTrainer | null>(null);
  const [showCenter, setShowCenter] = useState(false);
  const [showPC, setShowPC] = useState(false);
  const [toast, setToast] = useState('');
  const [facingTrainer, setFacingTrainer] = useState<MobileTrainer | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(''), 2600);
  }, []);

  useEffect(() => () => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
  }, []);

  const myMember = state.team[0];
  const canPlay = !!myMember && (myMember.hp ?? 0) > 0;
  const px = state.playerPos?.x ?? SPAWN.x;
  const py = state.playerPos?.y ?? SPAWN.y;

  // Surface trainers nearby for prompt
  useEffect(() => {
    if (!ready) return;
    const t = adjacentTrainer(px, py, state.defeatedTrainers);
    setFacingTrainer(t || null);
  }, [px, py, state.defeatedTrainers, ready]);

  const move = useCallback(
    async (dx: number, dy: number) => {
      if (!ready || !canPlay) return;
      if (wild || activeTrainer || showCenter || showPC) return;

      const nx = Math.max(0, Math.min(WORLD_W - 1, px + dx));
      const ny = Math.max(0, Math.min(WORLD_H - 1, py + dy));
      if (nx === px && ny === py) return;
      const tile = WORLD_MAP[ny][nx];

      // Walking onto a trainer's tile starts a battle
      const stepTrainer = trainerAt(nx, ny);
      if (stepTrainer && !state.defeatedTrainers[stepTrainer.id]) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
        showToast(`${stepTrainer.emoji} ${stepTrainer.name}: "${stepTrainer.greet}"`);
        const opp = byId(stepTrainer.pokemonId);
        if (opp) {
          setActiveTrainer(stepTrainer);
          setWild(opp);
        }
        return;
      }

      if (isSolid(tile)) {
        Haptics.selectionAsync().catch(() => {});
        return;
      }

      // Walk!
      Haptics.selectionAsync().catch(() => {});
      await update((s) => {
        s.playerPos = { x: nx, y: ny };
        s.trainer.steps += 1;
      });

      if (isPokeCenter(tile)) {
        setShowCenter(true);
        return;
      }

      if (isTallGrass(tile) && Math.random() < 0.45) {
        const opp = pickWildForArea(nx, ny);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
        setActiveTrainer(null);
        setWild(opp);
      }
    },
    [ready, canPlay, wild, activeTrainer, showCenter, showPC, px, py, state.defeatedTrainers, update, showToast],
  );

  const challengeFacing = useCallback(() => {
    if (!facingTrainer) return;
    const opp = byId(facingTrainer.pokemonId);
    if (!opp) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    setActiveTrainer(facingTrainer);
    setWild(opp);
  }, [facingTrainer]);

  const onBattleClose = useCallback(
    async (result: BattleResult) => {
      const t = activeTrainer;
      setWild(null);
      setActiveTrainer(null);
      if (t && result.defeated) {
        await update((s) => {
          defeatTrainerMut(s, t.id);
          awardRewardMut(s, t.reward);
        });
        showToast(`🏆 You beat ${t.name}! Got ${REWARD_LABELS[t.reward]}!`);
      } else if (result.caught) {
        showToast('✨ A new friend joined your team!');
      }
      // Explicit autosave after every battle for peace of mind
      await saveState(state);
    },
    [activeTrainer, update, showToast, state],
  );

  const leaveCenter = useCallback(async () => {
    setShowCenter(false);
    // Warp player one tile south off the door so re-entry doesn't loop
    await update((s) => {
      const ny = Math.min(WORLD_H - 1, (s.playerPos?.y ?? SPAWN.y) + 1);
      const nx = s.playerPos?.x ?? SPAWN.x;
      const tile = WORLD_MAP[ny]?.[nx];
      if (tile !== undefined && !isSolid(tile) && !isPokeCenter(tile)) {
        s.playerPos = { x: nx, y: ny };
      }
    });
  }, [update]);

  if (!ready) return <View style={{ flex: 1, backgroundColor: colors.background }} />;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={styles.headerRow}>
        <Text style={[styles.header, { color: colors.accent }]}>OVERWORLD</Text>
        <Text style={[styles.headerSub, { color: colors.mutedForeground }]}>
          Steps {state.trainer.steps} · 🔴 {state.inventory.pokeball} · 🍓 {state.inventory.berry}
        </Text>
      </View>

      {!canPlay && (
        <View style={[styles.warn, { backgroundColor: colors.card, borderColor: colors.destructive }]}>
          <Feather name="alert-triangle" size={18} color={colors.destructive} />
          <Text style={[styles.warnText, { color: colors.foreground }]}>
            {myMember
              ? `${myMember.name} fainted! Visit the Pokémon Center to heal.`
              : 'Pick a starter from the welcome screen first.'}
          </Text>
        </View>
      )}

      <View style={styles.mapWrap}>
        <View
          style={[
            styles.map,
            {
              width: WORLD_W * TILE_SIZE,
              height: WORLD_H * TILE_SIZE,
              backgroundColor: '#1d1f24',
            },
          ]}
        >
          {WORLD_MAP.map((row, y) => (
            <View key={y} style={{ flexDirection: 'row' }}>
              {row.map((t, x) => (
                <View
                  key={x}
                  style={{
                    width: TILE_SIZE,
                    height: TILE_SIZE,
                    backgroundColor: TILE_COLOR[t] ?? '#000',
                    borderWidth: t === TILE.PC_DOOR ? 1 : 0,
                    borderColor: '#7a4a2a',
                  }}
                />
              ))}
            </View>
          ))}

          {/* Trainer markers */}
          {TRAINERS.map((t) => {
            const defeated = state.defeatedTrainers[t.id];
            return (
              <View
                key={t.id}
                pointerEvents="none"
                style={{
                  position: 'absolute',
                  left: t.tx * TILE_SIZE,
                  top: t.ty * TILE_SIZE,
                  width: TILE_SIZE,
                  height: TILE_SIZE,
                  alignItems: 'center',
                  justifyContent: 'center',
                  opacity: defeated ? 0.35 : 1,
                }}
              >
                <Text style={{ fontSize: 18 }}>{defeated ? '✓' : t.emoji}</Text>
              </View>
            );
          })}

          {/* Player */}
          <View
            pointerEvents="none"
            style={{
              position: 'absolute',
              left: px * TILE_SIZE - 4,
              top: py * TILE_SIZE - 10,
              width: TILE_SIZE + 8,
              height: TILE_SIZE + 14,
              alignItems: 'center',
              justifyContent: 'flex-end',
            }}
          >
            {myMember ? (
              <PokeSprite id={myMember.id} size={TILE_SIZE + 12} />
            ) : (
              <Text style={{ fontSize: 20 }}>🧒</Text>
            )}
          </View>
        </View>
      </View>

      {/* Nearby trainer prompt */}
      {facingTrainer && !wild && (
        <Pressable
          onPress={challengeFacing}
          style={({ pressed }) => [
            styles.prompt,
            {
              backgroundColor: pressed ? colors.secondary : colors.card,
              borderColor: colors.accent,
            },
          ]}
        >
          <Text style={[styles.promptName, { color: colors.foreground }]}>
            {facingTrainer.emoji} {facingTrainer.name}
          </Text>
          <Text style={[styles.promptText, { color: colors.mutedForeground }]}>
            "{facingTrainer.greet}"  ▸ TAP TO BATTLE
          </Text>
        </Pressable>
      )}

      {toast ? (
        <View style={[styles.toast, { backgroundColor: colors.accent }]}>
          <Text style={[styles.toastText, { color: colors.accentForeground }]}>
            {toast}
          </Text>
        </View>
      ) : null}

      {/* D-Pad */}
      <View style={styles.dpadWrap}>
        <View style={styles.dpad}>
          <View style={styles.dpadRow}>
            <View style={styles.dpadGap} />
            <DBtn icon="chevron-up" onPress={() => move(0, -1)} colors={colors} />
            <View style={styles.dpadGap} />
          </View>
          <View style={styles.dpadRow}>
            <DBtn icon="chevron-left" onPress={() => move(-1, 0)} colors={colors} />
            <View style={[styles.dpadCenter, { backgroundColor: colors.border }]}>
              <Feather name="navigation" size={14} color={colors.mutedForeground} />
            </View>
            <DBtn icon="chevron-right" onPress={() => move(1, 0)} colors={colors} />
          </View>
          <View style={styles.dpadRow}>
            <View style={styles.dpadGap} />
            <DBtn icon="chevron-down" onPress={() => move(0, 1)} colors={colors} />
            <View style={styles.dpadGap} />
          </View>
        </View>

        <View style={styles.actions}>
          <Pressable
            onPress={() => {
              const t = WORLD_MAP[py]?.[px];
              if (isPokeCenter(t)) setShowCenter(true);
              else if (facingTrainer) challengeFacing();
              else
                Alert.alert(
                  'Nothing here',
                  'Walk onto the white door tile to enter the Pokémon Center, or up to a trainer to challenge them.',
                );
            }}
            style={({ pressed }) => [
              styles.actionBtn,
              { backgroundColor: pressed ? colors.secondary : colors.card, borderColor: colors.accent },
            ]}
          >
            <Feather name="zap" size={18} color={colors.accent} />
            <Text style={[styles.actionText, { color: colors.foreground }]}>ACTION</Text>
          </Pressable>
        </View>
      </View>

      {wild && (
        <BattleModal
          wild={wild}
          trainerName={activeTrainer?.name}
          onClose={onBattleClose}
        />
      )}

      <PokeCenterModal
        visible={showCenter}
        onClose={leaveCenter}
        onOpenPC={() => {
          setShowCenter(false);
          setShowPC(true);
        }}
      />

      <PCModal visible={showPC} onClose={() => setShowPC(false)} />
    </View>
  );
}

function DBtn({
  icon, onPress, colors,
}: {
  icon: React.ComponentProps<typeof Feather>['name'];
  onPress: () => void;
  colors: ReturnType<typeof useColors>;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.dpadBtn,
        { backgroundColor: pressed ? colors.accent : colors.card, borderColor: colors.border },
      ]}
    >
      <Feather name={icon} size={22} color={colors.foreground} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline',
    paddingHorizontal: 16, paddingTop: 10, paddingBottom: 4,
  },
  header: { fontSize: 12, letterSpacing: 2, fontWeight: '800' },
  headerSub: { fontSize: 11, fontWeight: '700' },
  warn: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    borderWidth: 2, borderRadius: 10, padding: 10,
    marginHorizontal: 16, marginVertical: 6,
  },
  warnText: { flex: 1, fontSize: 12, fontWeight: '600' },
  mapWrap: { alignItems: 'center', paddingVertical: 8 },
  map: { position: 'relative', borderWidth: 3, borderColor: '#0a0a0a', borderRadius: 4 },
  prompt: {
    marginHorizontal: 16, marginTop: 4, borderWidth: 2,
    borderRadius: 10, padding: 10, gap: 2,
  },
  promptName: { fontSize: 14, fontWeight: '800' },
  promptText: { fontSize: 11, fontWeight: '700', letterSpacing: 0.5 },
  toast: {
    marginHorizontal: 16, marginTop: 6, borderRadius: 8,
    paddingHorizontal: 12, paddingVertical: 8,
  },
  toastText: { fontSize: 12, fontWeight: '800', textAlign: 'center' },
  dpadWrap: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', paddingHorizontal: 20, paddingTop: 12, paddingBottom: 100, gap: 16,
  },
  dpad: { gap: 4 },
  dpadRow: { flexDirection: 'row', gap: 4 },
  dpadGap: { width: 48, height: 48 },
  dpadBtn: {
    width: 48, height: 48, borderWidth: 2, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
  },
  dpadCenter: {
    width: 48, height: 48, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
  },
  actions: { flex: 1, alignItems: 'flex-end' },
  actionBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    borderWidth: 2, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12,
  },
  actionText: { fontSize: 13, fontWeight: '800', letterSpacing: 1 },
});
