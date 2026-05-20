import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useColors } from '@/hooks/useColors';
import { useTrainer } from './TrainerProvider';
import { PokeSprite } from './PokeSprite';
import { HpBar } from './HpBar';
import { RetroButton } from './RetroButton';
import { displayName } from '../data/pokedex';
import type { Pokemon } from '../data/pokedex';
import { questionFor } from '../data/stem';
import {
  ensureMemberHp,
  getLevel,
  memberMaxHp,
  recordAnswerMut,
  recordCatchMut,
  recordEncounterMut,
  useBallMut,
  useBerryMut,
} from '../game/save';
import type { PartyMember } from '../game/save';

interface Props {
  wild: Pokemon | null;
  onClose: (caught: boolean) => void;
}

interface Move {
  name: string;
  type: string;
  power: number;
  emoji: string;
}
const TYPE_MOVE: Record<string, Move> = {
  grass: { name: 'Vine Whip', type: 'grass', power: 15, emoji: '🌿' },
  fire: { name: 'Ember', type: 'fire', power: 16, emoji: '🔥' },
  water: { name: 'Water Gun', type: 'water', power: 15, emoji: '💧' },
  electric: { name: 'Spark', type: 'electric', power: 16, emoji: '⚡' },
  bug: { name: 'Bug Bite', type: 'bug', power: 13, emoji: '🐛' },
  psychic: { name: 'Confusion', type: 'psychic', power: 16, emoji: '🔮' },
  fairy: { name: 'Fairy Wind', type: 'fairy', power: 15, emoji: '✨' },
  dark: { name: 'Bite', type: 'dark', power: 16, emoji: '🌑' },
  ice: { name: 'Icy Wind', type: 'ice', power: 14, emoji: '❄️' },
  fighting: { name: 'Karate Chop', type: 'fighting', power: 16, emoji: '👊' },
  rock: { name: 'Rock Throw', type: 'rock', power: 14, emoji: '🪨' },
  ground: { name: 'Mud Slap', type: 'ground', power: 13, emoji: '🟫' },
  flying: { name: 'Gust', type: 'flying', power: 14, emoji: '🌬️' },
  ghost: { name: 'Shadow Sneak', type: 'ghost', power: 15, emoji: '👻' },
  poison: { name: 'Poison Sting', type: 'poison', power: 13, emoji: '☠️' },
  steel: { name: 'Metal Claw', type: 'steel', power: 15, emoji: '⚙️' },
  dragon: { name: 'Dragon Breath', type: 'dragon', power: 17, emoji: '🐉' },
  normal: { name: 'Quick Attack', type: 'normal', power: 13, emoji: '💨' },
};
const TACKLE: Move = { name: 'Tackle', type: 'normal', power: 12, emoji: '💥' };

function getMoves(types: string[]): Move[] {
  const t = types[0] || 'normal';
  return [TACKLE, TYPE_MOVE[t] || TYPE_MOVE.normal];
}

const STRONG_VS: Record<string, string[]> = {
  fire: ['grass', 'bug', 'ice', 'steel'],
  water: ['fire', 'rock', 'ground'],
  grass: ['water', 'rock', 'ground'],
  electric: ['water', 'flying'],
  ice: ['grass', 'ground', 'flying', 'dragon'],
  fighting: ['normal', 'rock', 'ice', 'dark', 'steel'],
  rock: ['fire', 'flying', 'bug', 'ice'],
  psychic: ['fighting', 'poison'],
  bug: ['grass', 'psychic', 'dark'],
};

function effectiveness(atk: string, defs: string[]): number {
  const strong = STRONG_VS[atk] || [];
  return defs.some((d) => strong.includes(d)) ? 1.5 : 1;
}

function calcDamage(move: Move, defenderTypes: string[], level: number): number {
  const base = move.power + Math.floor(level * 0.6);
  const variance = Math.floor(Math.random() * 6) - 2;
  return Math.max(2, Math.round((base + variance) * effectiveness(move.type, defenderTypes)));
}

type Phase = 'menu' | 'fight' | 'question' | 'throwing' | 'result';

export function BattleModal({ wild: wildProp, onClose }: Props) {
  const colors = useColors();
  const { state, update } = useTrainer();
  const level = getLevel(state);
  const myMember: PartyMember | null = state.team[0] || null;

  const wildMaxHp = useMemo(
    () => (wildProp ? 40 + wildProp.rarity * 18 + level * 4 : 0),
    [wildProp, level],
  );
  const [wildHp, setWildHp] = useState(wildMaxHp);
  const [myHp, setMyHp] = useState<number>(myMember?.hp ?? memberMaxHp(myMember ?? ({} as PartyMember), level));
  const [phase, setPhase] = useState<Phase>('menu');
  const [log, setLog] = useState('');
  const [feedback, setFeedback] = useState('');
  const [question, setQuestion] = useState(() => (wildProp ? questionFor(wildProp, level) : null));
  const [attemptsLeft, setAttemptsLeft] = useState(5);
  const [berryBoost, setBerryBoost] = useState(0);
  const [caught, setCaught] = useState(false);
  const exited = useRef(false);
  const shake = useRef(new Animated.Value(0)).current;

  // Reset whenever a new wild is shown
  useEffect(() => {
    if (!wildProp) return;
    exited.current = false;
    setWildHp(wildMaxHp);
    if (myMember) {
      ensureMemberHp(myMember, level);
      setMyHp(myMember.hp ?? memberMaxHp(myMember, level));
    }
    setPhase('menu');
    setLog(`A wild ${displayName(wildProp)} appeared!`);
    setFeedback('');
    setQuestion(questionFor(wildProp, level));
    setAttemptsLeft(5);
    setBerryBoost(0);
    setCaught(false);
    // Mark encounter once
    update((s) => {
      recordEncounterMut(s, wildProp);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wildProp?.id]);

  if (!wildProp) return null;
  const wild: Pokemon = wildProp;

  const myMaxHp = myMember?.maxHp ?? memberMaxHp(myMember ?? ({} as PartyMember), level);
  const myMoves = getMoves(myMember?.types || ['normal']);

  function shakeOnce() {
    Animated.sequence([
      Animated.timing(shake, { toValue: 1, duration: 60, useNativeDriver: true }),
      Animated.timing(shake, { toValue: -1, duration: 60, useNativeDriver: true }),
      Animated.timing(shake, { toValue: 0, duration: 60, useNativeDriver: true }),
    ]).start();
  }

  function safeExit(c: boolean) {
    if (exited.current) return;
    exited.current = true;
    onClose(c);
  }

  function commitMyHp(newHp: number) {
    const clamped = Math.max(0, Math.min(myMaxHp, newHp));
    setMyHp(clamped);
    update((s) => {
      if (s.team[0]) s.team[0].hp = clamped;
    });
  }

  function enemyTurn() {
    if (!myMember) return;
    const wildMove = getMoves(wild.types)[Math.random() < 0.5 ? 0 : 1];
    setLog(`${displayName(wild)} used ${wildMove.name}! ${wildMove.emoji}`);
    setFeedback('');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    shakeOnce();
    setTimeout(() => {
      const dmg = calcDamage(wildMove, myMember.types, Math.max(1, Math.floor(level * 0.8)));
      const newHp = Math.max(0, myHp - dmg);
      commitMyHp(newHp);
      if (newHp <= 0) {
        setFeedback(`💫 ${myMember.name} fainted! Hurry to the Pokémon Center.`);
        setPhase('result');
        setTimeout(() => safeExit(false), 1800);
      } else {
        setTimeout(() => {
          setPhase('menu');
          setLog('What will you do?');
        }, 600);
      }
    }, 350);
  }

  function pickMove(m: Move) {
    setPhase('throwing');
    setLog(`${myMember?.name} used ${m.name}! ${m.emoji}`);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    const dmg = calcDamage(m, wild.types, level);
    setTimeout(() => {
      const newHp = Math.max(0, wildHp - dmg);
      setWildHp(newHp);
      const eff = effectiveness(m.type, wild.types);
      setFeedback(eff > 1 ? "It's super effective!" : '');
      if (newHp <= 0) {
        setLog(`Wild ${displayName(wild)} fainted!`);
        setFeedback('It ran off before you could catch it.');
        setPhase('result');
        setTimeout(() => safeExit(false), 1800);
      } else {
        setTimeout(() => enemyTurn(), 700);
      }
    }, 400);
  }

  function openCatch() {
    setPhase('question');
    setLog('Answer the question to throw an accurate ball!');
  }

  function handleAnswer(idx: number) {
    if (!question) return;
    const correct = idx === question.answerIndex;
    update((s) => {
      recordAnswerMut(s, correct);
    });

    if (correct) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      setFeedback('🌟 Great answer! Throwing a Poké Ball…');
      setPhase('throwing');
      setTimeout(() => throwBall(true), 600);
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
      const next = attemptsLeft - 1;
      setAttemptsLeft(next);
      setFeedback(
        `So close! The answer was "${question.choices[question.answerIndex]}". ${question.hint || ''}`,
      );
      if (next <= 0) {
        setTimeout(() => safeExit(false), 1500);
      } else {
        setTimeout(() => {
          setQuestion(questionFor(wild, level));
          setFeedback('');
          enemyTurn();
        }, 1400);
      }
    }
  }

  function throwBall(answeredRight: boolean) {
    let ok = false;
    update((s) => {
      ok = useBallMut(s);
    });
    if (!ok) {
      setFeedback('Out of Poké Balls! Visit the Pokémon Center.');
      setTimeout(() => safeExit(false), 1500);
      return;
    }
    shakeOnce();
    const base = wild.rarity === 1 ? 0.55 : wild.rarity === 2 ? 0.4 : 0.25;
    const hpFactor = 1 - wildHp / wildMaxHp;
    const hpBonus = hpFactor * 0.45;
    const answerBonus = answeredRight ? 0.18 : 0;
    const levelPenalty = Math.min(0.2, level * 0.012);
    const chance = Math.max(
      0.18,
      Math.min(0.97, base + hpBonus + answerBonus + berryBoost - levelPenalty),
    );
    const didCatch = Math.random() < chance;
    setTimeout(() => {
      if (didCatch) {
        update((s) => {
          recordCatchMut(s, wild);
        });
        setCaught(true);
        setFeedback(`🎉 Yay! ${displayName(wild)} joined your team!`);
        setPhase('result');
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
        setTimeout(() => safeExit(true), 2000);
      } else {
        const next = attemptsLeft - 1;
        setAttemptsLeft(next);
        setFeedback(`Oh no! ${displayName(wild)} broke free!`);
        if (next <= 0 || state.inventory.pokeball <= 0) {
          setTimeout(() => safeExit(false), 1500);
        } else {
          setTimeout(() => {
            setPhase('menu');
            setFeedback('');
            setLog('What will you do?');
          }, 1400);
        }
      }
    }, 1200);
  }

  function handleBerry() {
    let ok = false;
    update((s) => {
      ok = useBerryMut(s);
    });
    if (!ok) {
      setFeedback('No berries left! Visit the Pokémon Center.');
      setTimeout(() => setFeedback(''), 1400);
      return;
    }
    setBerryBoost((b) => b + 0.18);
    setFeedback('🍓 You fed it a Berry — it likes you more!');
    setTimeout(() => setFeedback(''), 1400);
  }

  function handleFlee() {
    setPhase('result');
    setFeedback(`${displayName(wild)} wandered off… maybe next time!`);
    setTimeout(() => safeExit(false), 1000);
  }

  const shakeTx = shake.interpolate({ inputRange: [-1, 1], outputRange: [-8, 8] });

  return (
    <Modal visible animationType="fade" transparent={false}>
      <View style={[styles.root, { backgroundColor: colors.background }]}>
        {/* Arena */}
        <View style={styles.arena}>
          {/* sky/grass split */}
          <View style={[styles.sky, { backgroundColor: colors.sky }]} />
          <View style={[styles.grass, { backgroundColor: colors.grass }]} />

          {/* Wild Pokemon */}
          <Animated.View
            style={[
              styles.wildPos,
              { transform: [{ translateX: shakeTx }] },
            ]}
          >
            <PokeSprite id={wild.id} size={140} />
          </Animated.View>

          {/* Player Pokemon */}
          {myMember && (
            <View style={styles.myPos}>
              <PokeSprite id={myMember.id} size={150} back />
            </View>
          )}

          {/* Wild HP card */}
          <View style={[styles.hpCard, styles.wildHpCard, { backgroundColor: colors.dialogue }]}>
            <View style={styles.hpHeader}>
              <Text style={[styles.monName, { color: colors.dialogueText }]} numberOfLines={1}>
                {displayName(wild)}
              </Text>
              <Text style={[styles.monLevel, { color: colors.dialogueText }]}>Lv {level}</Text>
            </View>
            <HpBar hp={wildHp} max={wildMaxHp} showNumbers={false} />
            <Text style={[styles.rarity, { color: colors.accent }]}>
              {'★'.repeat(wild.rarity)}
            </Text>
          </View>

          {/* My HP card */}
          {myMember && (
            <View style={[styles.hpCard, styles.myHpCard, { backgroundColor: colors.dialogue }]}>
              <View style={styles.hpHeader}>
                <Text style={[styles.monName, { color: colors.dialogueText }]} numberOfLines={1}>
                  {myMember.name}
                </Text>
                <Text style={[styles.monLevel, { color: colors.dialogueText }]}>Lv {level}</Text>
              </View>
              <HpBar hp={myHp} max={myMaxHp} />
            </View>
          )}
        </View>

        {/* Dialogue */}
        <View style={[styles.dialogue, { backgroundColor: colors.dialogue }]}>
          {log ? <Text style={[styles.dialogueText, { color: colors.dialogueText }]}>{log}</Text> : null}
          {feedback ? (
            <Text style={[styles.feedback, { color: '#7a2f1f' }]}>▸ {feedback}</Text>
          ) : null}
        </View>

        {/* Actions */}
        <View style={styles.actions}>
          {phase === 'menu' && (
            <View style={styles.grid2x2}>
              <View style={styles.row}>
                <RetroButton
                  title="Fight"
                  subtitle="Use a move"
                  icon={<Feather name="zap" size={22} color={colors.primary} />}
                  onPress={() => setPhase('fight')}
                  accent={colors.primary}
                />
                <RetroButton
                  title="Catch"
                  subtitle={`${state.inventory.pokeball} balls`}
                  icon={<Feather name="target" size={22} color={colors.accent} />}
                  onPress={openCatch}
                  accent={colors.accent}
                  disabled={state.inventory.pokeball <= 0}
                />
              </View>
              <View style={styles.row}>
                <RetroButton
                  title="Berry"
                  subtitle={`×${state.inventory.berry} left`}
                  icon={<Feather name="heart" size={22} color="#ec5f9b" />}
                  onPress={handleBerry}
                  accent="#ec5f9b"
                />
                <RetroButton
                  title="Run"
                  subtitle="Flee battle"
                  icon={<Feather name="log-out" size={22} color={colors.mutedForeground} />}
                  onPress={handleFlee}
                  accent={colors.mutedForeground}
                />
              </View>
            </View>
          )}

          {phase === 'fight' && (
            <View>
              <View style={styles.row}>
                {myMoves.map((m) => (
                  <RetroButton
                    key={m.name}
                    title={m.name}
                    subtitle={`PWR ${m.power} · ${m.type}`}
                    onPress={() => pickMove(m)}
                    accent={colors.primary}
                  />
                ))}
              </View>
              <Pressable onPress={() => setPhase('menu')} style={styles.back}>
                <Text style={{ color: colors.accent, fontSize: 12, letterSpacing: 1 }}>
                  ← BACK
                </Text>
              </Pressable>
            </View>
          )}

          {phase === 'question' && question && (
            <ScrollView contentContainerStyle={{ paddingBottom: 12 }}>
              <Text style={[styles.qMeta, { color: colors.accent }]}>
                {question.subject.toUpperCase()} · LV {level} · TRIES {attemptsLeft}
              </Text>
              <Text style={[styles.qPrompt, { color: colors.foreground }]}>
                {question.prompt}
              </Text>
              <View style={styles.choices}>
                {question.choices.map((c, i) => (
                  <Pressable
                    key={i}
                    onPress={() => handleAnswer(i)}
                    style={({ pressed }) => [
                      styles.choice,
                      {
                        backgroundColor: pressed ? colors.secondary : colors.card,
                        borderColor: colors.border,
                      },
                    ]}
                  >
                    <Text style={[styles.choiceText, { color: colors.foreground }]}>
                      {String.fromCharCode(65 + i)}. {c}
                    </Text>
                  </Pressable>
                ))}
              </View>
              <Pressable
                onPress={() => {
                  setPhase('menu');
                  setLog('What will you do?');
                }}
                style={styles.back}
              >
                <Text style={{ color: colors.accent, fontSize: 12, letterSpacing: 1 }}>
                  ← BACK TO MENU
                </Text>
              </Pressable>
            </ScrollView>
          )}

          {phase === 'throwing' && (
            <Text style={[styles.throwing, { color: colors.accent }]}>● POKÉ BALL THROWN…</Text>
          )}

          {phase === 'result' && caught && (
            <Text style={[styles.throwing, { color: colors.hpGreen }]}>🎉 CAUGHT!</Text>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  arena: {
    flex: 1,
    minHeight: 260,
    position: 'relative',
    overflow: 'hidden',
    borderBottomWidth: 3,
    borderBottomColor: '#0a0a0a',
  },
  sky: { position: 'absolute', top: 0, left: 0, right: 0, height: '40%' },
  grass: { position: 'absolute', bottom: 0, left: 0, right: 0, height: '60%' },
  wildPos: { position: 'absolute', right: 24, top: 36 },
  myPos: { position: 'absolute', left: 8, bottom: 12 },
  hpCard: {
    position: 'absolute',
    padding: 8,
    borderWidth: 2,
    borderColor: '#1d1f24',
    borderRadius: 8,
    minWidth: 160,
  },
  wildHpCard: { left: 12, top: 12 },
  myHpCard: { right: 12, bottom: 12 },
  hpHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  monName: { fontSize: 14, fontWeight: '800', flex: 1, marginRight: 6 },
  monLevel: { fontSize: 12, fontWeight: '700' },
  rarity: { fontSize: 12, marginTop: 2, fontWeight: '700' },
  dialogue: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    minHeight: 64,
    borderTopWidth: 3,
    borderBottomWidth: 3,
    borderColor: '#0a0a0a',
  },
  dialogueText: { fontSize: 15, fontWeight: '700' },
  feedback: { fontSize: 14, fontWeight: '700', marginTop: 4 },
  actions: { padding: 12, gap: 10, minHeight: 200 },
  grid2x2: { gap: 10 },
  row: { flexDirection: 'row', gap: 10 },
  back: { alignSelf: 'center', marginTop: 12, paddingVertical: 6, paddingHorizontal: 14 },
  qMeta: {
    textAlign: 'center',
    fontSize: 11,
    letterSpacing: 1,
    fontWeight: '800',
    marginBottom: 6,
  },
  qPrompt: { textAlign: 'center', fontSize: 17, fontWeight: '700', marginBottom: 12 },
  choices: { gap: 8 },
  choice: { borderWidth: 2, borderRadius: 10, paddingVertical: 14, paddingHorizontal: 14 },
  choiceText: { fontSize: 15, fontWeight: '700' },
  throwing: { textAlign: 'center', fontSize: 20, fontWeight: '800', letterSpacing: 2, paddingTop: 18 },
});
