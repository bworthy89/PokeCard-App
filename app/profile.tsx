import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { useFocusEffect, useRouter } from 'expo-router';
import { firestore, signInAnonymously } from '../services/firebase';
import { getCards } from '../services/collection';
import { SavedCard } from '../types';
import {
  HoloBackground,
  ScreenHeader,
  HoloFoil,
  FillBar,
  BurstSpinner,
} from '../components/holo';
import { colors, fonts, energy, tiers } from '../theme';

const xpForLevel = (lvl: number) => lvl * 50;
const levelFromScans = (scans: number) => {
  let lvl = 1;
  let need = xpForLevel(lvl);
  while (scans >= need) {
    scans -= need;
    lvl += 1;
    need = xpForLevel(lvl);
  }
  return { level: lvl, xp: scans, nextXP: need };
};

const formatJoined = (d?: Date | null) => {
  if (!d) return '—';
  return `${d.toLocaleString('en-US', { month: 'short' }).toUpperCase()} '${String(d.getFullYear()).slice(-2)}`;
};

const BADGES: Array<{ icon: string; label: string; color: string }> = [
  { icon: '⚡', label: 'First Scan', color: energy.electric.color },
  { icon: '★', label: 'Gem Hunter', color: tiers['Gem Mint'].color },
  { icon: '🔥', label: '10-Streak',  color: energy.fire.color },
  { icon: '💎', label: '$1K Vault',  color: energy.water.color },
  { icon: '🌿', label: 'Set Starter',color: energy.grass.color },
];

export default function ProfileScreen() {
  const router = useRouter();
  const [cards, setCards] = useState<SavedCard[]>([]);
  const [scanCount, setScanCount] = useState(0);
  const [createdAt, setCreatedAt] = useState<Date | null>(null);

  const load = useCallback(async () => {
    try {
      const user = await signInAnonymously();
      const [snap, cardList] = await Promise.all([
        firestore().collection('users').doc(user.uid).get(),
        getCards().catch(() => []),
      ]);
      const data = snap.data() as { scanCount?: number; createdAt?: { toDate?: () => Date } } | undefined;
      setScanCount(data?.scanCount ?? 0);
      setCreatedAt(data?.createdAt?.toDate?.() ?? null);
      setCards(cardList);
    } catch (e) {
      console.error('Failed to load profile:', e);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const totalValue = cards.reduce((s, c) => s + (c.price?.market ?? 0), 0);
  const gems = cards.filter((c) => c.grading.overallTier === 'Gem Mint').length;
  const { level, xp, nextXP } = levelFromScans(scanCount);
  const xpPct = nextXP > 0 ? (xp / nextXP) * 100 : 0;

  const stats: Array<[string, string | number, string]> = [
    ['VAULT VALUE', `$${totalValue.toFixed(0)}`, energy.grass.color],
    ['CARDS', cards.length, colors.ink0],
    ['GEMS OWNED', gems, tiers['Gem Mint'].color],
    ['SCANS', scanCount, energy.water.color],
  ];

  return (
    <HoloBackground>
      <ScreenHeader title="You" />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Trainer card */}
        <View style={styles.trainer}>
          <View style={styles.trainerBurst} pointerEvents="none">
            <BurstSpinner size={180} rays={14} opacity={0.08} speed={14000} />
          </View>
          <View style={styles.trainerRow}>
            <HoloFoil style={styles.avatar}>
              <Text style={styles.avatarLetter}>T</Text>
            </HoloFoil>
            <View style={styles.trainerInfo}>
              <Text style={styles.trainerName}>Trainer</Text>
              <Text style={styles.trainerMeta}>
                LV {level} · JOINED {formatJoined(createdAt)}
              </Text>
              <View style={styles.xpRow}>
                <FillBar pct={xpPct} color={energy.electric.color} />
                <Text style={styles.xpText}>
                  {xp} / {nextXP} XP to LV {level + 1}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Stat grid */}
        <View style={styles.statGrid}>
          {stats.map(([label, value, color]) => (
            <View key={label} style={styles.statCard}>
              <Text style={styles.statCardLabel}>{label}</Text>
              <Text style={[styles.statCardValue, { color }]}>{value}</Text>
            </View>
          ))}
        </View>

        {/* Badges */}
        <View style={styles.sectionHead}>
          <Text style={styles.sectionTitle}>Badges</Text>
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.badgeRow}
        >
          {BADGES.map((b) => (
            <View key={b.label} style={styles.badgeCard}>
              <View style={[styles.badgeRing, { backgroundColor: b.color, shadowColor: b.color }]}>
                <Text style={styles.badgeIcon}>{b.icon}</Text>
              </View>
              <Text style={styles.badgeLabel}>{b.label}</Text>
            </View>
          ))}
        </ScrollView>

        {/* Menu */}
        <View style={styles.menu}>
          <MenuRow icon="♡" label="Wishlist" detail={undefined} onPress={() => router.push('/wishlist')} />
          <MenuRow icon="🔔" label="Price alerts" detail="Coming soon" />
          <MenuRow icon="📦" label="Export collection" detail="Coming soon" />
          <MenuRow icon="⚙" label="Settings" detail="Coming soon" />
          <MenuRow icon="?" label="Help & feedback" detail="Coming soon" last />
        </View>
      </ScrollView>
    </HoloBackground>
  );
}

const MenuRow = ({
  icon,
  label,
  detail,
  onPress,
  last,
}: {
  icon: string;
  label: string;
  detail?: string;
  onPress?: () => void;
  last?: boolean;
}) => (
  <TouchableOpacity
    activeOpacity={onPress ? 0.85 : 1}
    onPress={onPress}
    disabled={!onPress}
    style={[styles.menuRow, !last && styles.menuRowBorder]}
  >
    <View style={styles.menuIcon}>
      <Text style={styles.menuIconText}>{icon}</Text>
    </View>
    <View style={styles.menuLabelWrap}>
      <Text style={styles.menuLabel}>{label}</Text>
    </View>
    {detail && <Text style={styles.menuDetail}>{detail}</Text>}
    <Svg width={14} height={14} viewBox="0 0 24 24" fill="none" style={{ marginLeft: 6 }}>
      <Path
        d="M9 6l6 6-6 6"
        stroke={colors.ink3}
        strokeWidth={2.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  content: { paddingBottom: 120 },

  trainer: {
    marginHorizontal: 18,
    marginBottom: 16,
    padding: 18,
    borderRadius: 22,
    backgroundColor: colors.bg2,
    borderWidth: 1,
    borderColor: colors.lineStrong,
    overflow: 'hidden',
  },
  trainerBurst: {
    position: 'absolute',
    top: -40,
    right: -40,
    opacity: 0.45,
  },
  trainerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 999,
    borderWidth: 3,
    borderColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarLetter: {
    fontFamily: fonts.display,
    color: '#0A0A1F',
    fontSize: 32,
    fontWeight: '800',
  },
  trainerInfo: { flex: 1 },
  trainerName: {
    fontFamily: fonts.display,
    color: colors.ink0,
    fontSize: 22,
    fontWeight: '800',
  },
  trainerMeta: {
    fontFamily: fonts.monoBold,
    color: colors.ink3,
    fontSize: 11,
    marginTop: 2,
    letterSpacing: 0.6,
  },
  xpRow: {
    marginTop: 10,
  },
  xpText: {
    fontFamily: fonts.mono,
    color: colors.ink3,
    fontSize: 10,
    marginTop: 4,
    letterSpacing: 0.4,
  },

  statGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 18,
    gap: 10,
    marginBottom: 14,
  },
  statCard: {
    flexBasis: '48%',
    flexGrow: 1,
    backgroundColor: colors.bg1,
    borderColor: colors.line,
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 14,
  },
  statCardLabel: {
    fontFamily: fonts.monoBold,
    color: colors.ink3,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  statCardValue: {
    fontFamily: fonts.display,
    fontSize: 24,
    fontWeight: '800',
    marginTop: 4,
  },

  sectionHead: {
    paddingHorizontal: 20,
    paddingTop: 6,
    paddingBottom: 6,
  },
  sectionTitle: {
    fontFamily: fonts.display,
    color: colors.ink0,
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: -0.4,
  },

  badgeRow: {
    paddingHorizontal: 18,
    paddingBottom: 18,
    gap: 10,
  },
  badgeCard: {
    width: 92,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 14,
    backgroundColor: colors.bg1,
    borderWidth: 1,
    borderColor: colors.lineStrong,
    alignItems: 'center',
    marginRight: 8,
  },
  badgeRing: {
    width: 44,
    height: 44,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 14,
    elevation: 6,
  },
  badgeIcon: { fontSize: 20 },
  badgeLabel: {
    fontFamily: fonts.display,
    color: colors.ink0,
    fontSize: 11,
    fontWeight: '800',
    marginTop: 6,
    textAlign: 'center',
  },

  menu: {
    marginHorizontal: 18,
    backgroundColor: colors.bg1,
    borderColor: colors.lineStrong,
    borderWidth: 1,
    borderRadius: 16,
    overflow: 'hidden',
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 14,
    gap: 12,
  },
  menuRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  menuIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuIconText: {
    color: colors.ink0,
    fontSize: 14,
  },
  menuLabelWrap: { flex: 1 },
  menuLabel: {
    fontFamily: fonts.display,
    color: colors.ink0,
    fontSize: 14,
    fontWeight: '700',
  },
  menuDetail: {
    fontFamily: fonts.mono,
    color: colors.ink3,
    fontSize: 11,
  },
});
