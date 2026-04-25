import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { useFocusEffect, useRouter } from 'expo-router';
import { getCards } from '../services/collection';
import { getWishlist } from '../services/wishlist';
import { SavedCard, WishlistItem } from '../types';
import {
  HoloBackground,
  BurstSpinner,
  Sparkline,
  CardArt,
} from '../components/holo';
import {
  colors,
  fonts,
  energy,
  tiers,
  inferEnergyType,
} from '../theme';
import { formatPriceCompact, formatPriceParts } from '../lib/format';

// Gentle synthetic trend so the sparkline reads as upward growth.
// Will be replaced with a real history source in a later phase.
const synthTrend = (total: number): number[] => {
  if (total <= 0) return Array.from({ length: 12 }, () => 0);
  const start = total * 0.7;
  return Array.from({ length: 12 }, (_, i) => {
    const t = i / 11;
    const base = start + (total - start) * t;
    return base + Math.sin(i * 0.9) * total * 0.02;
  });
};

const setOf = (cards: SavedCard[]) => new Set(cards.map((c) => c.grading.setName)).size;
const gemsOf = (cards: SavedCard[]) =>
  cards.filter((c) => c.grading.overallTier === 'Gem Mint').length;

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [cards, setCards] = useState<SavedCard[]>([]);
  const [wishlist, setWishlist] = useState<WishlistItem[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const [c, w] = await Promise.all([
      getCards().catch(() => []),
      getWishlist().catch(() => []),
    ]);
    setCards(c);
    setWishlist(w);
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const handleRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const totalValue = cards.reduce((s, c) => s + (c.price?.market ?? 0), 0);
  const trend = synthTrend(totalValue);
  const trendDelta = totalValue > 0 ? totalValue - trend[0] : 0;
  const trendPct = totalValue > 0 ? (trendDelta / Math.max(1, trend[0])) * 100 : 0;

  const topByPrice = [...cards]
    .filter((c) => c.price?.market != null)
    .sort((a, b) => (b.price?.market ?? 0) - (a.price?.market ?? 0))
    .slice(0, 5);

  // Pick the most-collected set for the Set Quest card.
  const setCounts = cards.reduce<Record<string, number>>((acc, c) => {
    const k = c.grading.setName || 'Unknown';
    acc[k] = (acc[k] ?? 0) + 1;
    return acc;
  }, {});
  const topSet = Object.entries(setCounts).sort((a, b) => b[1] - a[1])[0];

  return (
    <HoloBackground>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 8 }]}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={energy.electric.color} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.kicker}>TRAINER</Text>
            <Text style={styles.title}>Hi, Trainer ⚡</Text>
          </View>
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => router.push('/wishlist')}
            style={styles.bell}
          >
            <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
              <Path
                d="M6 8a6 6 0 0112 0c0 7 3 9 3 9H3s3-2 3-9zM10 21a2 2 0 004 0"
                stroke={colors.ink0}
                strokeWidth={2}
                strokeLinecap="round"
              />
            </Svg>
            {wishlist.length > 0 && (
              <View style={styles.bellBadge}>
                <Text style={styles.bellBadgeText}>{wishlist.length}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* Hero portfolio */}
        <View style={styles.hero}>
          <View style={styles.heroBurst} pointerEvents="none">
            <BurstSpinner size={220} rays={16} opacity={0.08} speed={14000} />
          </View>
          <View style={styles.heroRow}>
            <View style={styles.liveChip}>
              <View style={styles.liveDot} />
              <Text style={styles.liveText}>PORTFOLIO LIVE</Text>
            </View>
            <Text style={styles.thirty}>30D</Text>
          </View>
          <Text style={styles.vaultLabel}>Vault Value</Text>
          <Text style={styles.vaultAmount}>
            ${formatPriceParts(totalValue).whole}
            <Text style={styles.vaultCents}>{formatPriceParts(totalValue).cents}</Text>
          </Text>
          {totalValue > 0 && (
            <View style={styles.trendRow}>
              <Text style={[styles.trendDelta, { color: energy.grass.color }]}>
                ↑ +${trendDelta.toFixed(2)}
              </Text>
              <Text style={styles.trendPct}>+{trendPct.toFixed(1)}% trend</Text>
            </View>
          )}
          <View style={styles.spark}>
            <Sparkline data={trend} color={energy.grass.color} height={48} />
          </View>
          <View style={styles.statRow}>
            <Stat label="CARDS" value={cards.length} />
            <Stat label="GEMS" value={gemsOf(cards)} accent={tiers['Gem Mint'].color} />
            <Stat label="SETS" value={setOf(cards)} />
          </View>
        </View>

        {/* Action bricks */}
        <View style={styles.bricks}>
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={() => router.push('/scan')}
            style={styles.brickScan}
          >
            <Text style={styles.brickScanTitle}>Scan a{'\n'}card</Text>
            <Text style={styles.brickScanSub}>TAP TO GRADE →</Text>
            <Svg width={32} height={32} viewBox="0 0 24 24" fill="none" style={styles.brickIcon}>
              <Path
                d="M4 8V5a1 1 0 011-1h3M16 4h3a1 1 0 011 1v3M20 16v3a1 1 0 01-1 1h-3M8 20H5a1 1 0 01-1-1v-3"
                stroke="#000"
                strokeWidth={3}
                strokeLinecap="round"
              />
              <Path
                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                stroke="#000"
                strokeWidth={3}
              />
            </Svg>
          </TouchableOpacity>
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={() => router.push('/wishlist')}
            style={styles.brickWish}
          >
            <Text style={styles.brickWishTitle}>Wishlist</Text>
            <Text style={styles.brickWishSub}>{wishlist.length} CHASING</Text>
            <Text style={styles.brickWishHeart}>♡</Text>
          </TouchableOpacity>
        </View>

        {/* Top by value (proxy for "movers" until we track history) */}
        {topByPrice.length > 0 && (
          <>
            <View style={styles.sectionHead}>
              <Text style={styles.sectionTitle}>Top by value</Text>
              <TouchableOpacity activeOpacity={0.85} onPress={() => router.push('/collection')}>
                <Text style={styles.sectionLink}>SEE ALL →</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.topMoversWrap}>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.topMovers}
              >
                {topByPrice.map((c) => {
                  const t = inferEnergyType(c.grading.cardName);
                  const isGem = c.grading.overallTier === 'Gem Mint';
                  return (
                    <TouchableOpacity
                      key={c.id}
                      activeOpacity={0.85}
                      onPress={() => router.push({ pathname: '/card-detail', params: { id: c.id } })}
                      style={styles.moverCard}
                    >
                      <CardArt
                        type={t}
                        name={c.grading.cardName}
                        imageUrl={c.cardArtworkUrl}
                        holo={isGem}
                      />
                      <Text style={styles.moverName} numberOfLines={1}>
                        {c.grading.cardName}
                      </Text>
                      <View style={styles.moverFoot}>
                        <Text style={styles.moverPrice}>
                          ${formatPriceCompact(c.price?.market ?? null)}
                        </Text>
                        <Text style={styles.moverTier}>
                          {tiers[c.grading.overallTier as keyof typeof tiers]?.label ?? '—'}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
              <LinearGradient
                colors={[colors.bg0, 'transparent']}
                start={{ x: 1, y: 0 }}
                end={{ x: 0, y: 0 }}
                style={styles.fadeRight}
                pointerEvents="none"
              />
            </View>
          </>
        )}

        {/* Set Quest */}
        {topSet && (
          <>
            <View style={styles.sectionHead}>
              <Text style={styles.sectionTitle}>Set Quest</Text>
            </View>
            <View style={styles.questCard}>
              <View style={styles.questHead}>
                <Text style={styles.questTitle}>{topSet[0]}</Text>
                <View style={styles.questChip}>
                  <Text style={styles.questChipText}>{topSet[1]} owned</Text>
                </View>
              </View>
              <View style={styles.questTrack}>
                <View
                  style={[
                    styles.questFill,
                    {
                      width: `${Math.min(100, (topSet[1] / 50) * 100)}%`,
                      backgroundColor: energy.psychic.color,
                    },
                  ]}
                />
              </View>
              <View style={styles.questFoot}>
                <Text style={styles.questFootText}>
                  Tracking your most-collected set.
                </Text>
              </View>
            </View>
          </>
        )}

        {cards.length === 0 && (
          <View style={styles.emptyHint}>
            <Text style={styles.emptyHintText}>Scan your first card to start your vault.</Text>
          </View>
        )}
      </ScrollView>
    </HoloBackground>
  );
}

const Stat = ({ label, value, accent }: { label: string; value: number | string; accent?: string }) => (
  <View>
    <Text style={[styles.statValue, accent ? { color: accent } : null]}>{value}</Text>
    <Text style={styles.statLabel}>{label}</Text>
  </View>
);

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  content: { paddingBottom: 110 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  kicker: {
    fontFamily: fonts.monoBold,
    color: colors.ink3,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
  },
  title: {
    fontFamily: fonts.display,
    color: colors.ink0,
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  bell: {
    width: 40,
    height: 40,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: colors.lineStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bellBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    minWidth: 16,
    height: 16,
    borderRadius: 999,
    backgroundColor: energy.fire.color,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.bg0,
  },
  bellBadgeText: {
    color: '#fff',
    fontFamily: fonts.monoBlack,
    fontSize: 9,
    fontWeight: '800',
  },

  hero: {
    marginHorizontal: 18,
    marginTop: 8,
    padding: 18,
    backgroundColor: colors.bg2,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.lineStrong,
    overflow: 'hidden',
  },
  heroBurst: {
    position: 'absolute',
    top: -40,
    right: -60,
    opacity: 0.5,
  },
  heroRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  liveChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: 'rgba(61, 214, 140, 0.18)',
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: energy.grass.color,
  },
  liveText: {
    fontFamily: fonts.monoBlack,
    color: energy.grass.color,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  thirty: {
    fontFamily: fonts.monoBold,
    color: colors.ink2,
    fontSize: 11,
    fontWeight: '700',
  },
  vaultLabel: {
    fontFamily: fonts.display,
    color: colors.ink2,
    fontSize: 14,
    fontWeight: '700',
  },
  vaultAmount: {
    fontFamily: fonts.display,
    color: colors.ink0,
    fontSize: 48,
    fontWeight: '800',
    letterSpacing: -1.5,
    lineHeight: 50,
    marginTop: 4,
  },
  vaultCents: {
    color: colors.ink3,
    fontSize: 24,
  },
  trendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 6,
  },
  trendDelta: {
    fontFamily: fonts.monoBold,
    fontSize: 13,
    fontWeight: '700',
  },
  trendPct: {
    fontFamily: fonts.mono,
    color: colors.ink3,
    fontSize: 12,
  },
  spark: {
    marginTop: 14,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
    borderStyle: 'dashed',
    borderTopColor: colors.lineStrong,
  },
  statValue: {
    fontFamily: fonts.display,
    color: colors.ink0,
    fontSize: 22,
    fontWeight: '800',
  },
  statLabel: {
    fontFamily: fonts.monoBold,
    color: colors.ink3,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
    marginTop: 2,
  },

  bricks: {
    flexDirection: 'row',
    paddingHorizontal: 18,
    paddingTop: 14,
    gap: 10,
  },
  brickScan: {
    flex: 1.4,
    padding: 16,
    borderRadius: 18,
    backgroundColor: energy.electric.color,
    borderWidth: 2,
    borderColor: '#000',
    overflow: 'hidden',
  },
  brickScanTitle: {
    fontFamily: fonts.display,
    color: '#0A0A1F',
    fontSize: 22,
    fontWeight: '800',
    lineHeight: 24,
    letterSpacing: -0.5,
  },
  brickScanSub: {
    fontFamily: fonts.monoBlack,
    color: '#0A0A1F',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.6,
    marginTop: 8,
  },
  brickIcon: {
    position: 'absolute',
    right: 16,
    bottom: 16,
  },
  brickWish: {
    flex: 1,
    padding: 16,
    borderRadius: 18,
    backgroundColor: colors.bg1,
    borderWidth: 1,
    borderColor: colors.lineStrong,
    overflow: 'hidden',
  },
  brickWishTitle: {
    fontFamily: fonts.display,
    color: colors.ink0,
    fontSize: 18,
    fontWeight: '800',
  },
  brickWishSub: {
    fontFamily: fonts.monoBlack,
    color: colors.ink3,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.6,
    marginTop: 4,
  },
  brickWishHeart: {
    position: 'absolute',
    right: -10,
    bottom: -16,
    fontSize: 64,
    color: energy.fairy.color,
    opacity: 0.4,
  },

  sectionHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 6,
  },
  sectionTitle: {
    fontFamily: fonts.display,
    color: colors.ink0,
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: -0.4,
  },
  sectionLink: {
    fontFamily: fonts.monoBlack,
    color: colors.ink2,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.6,
  },

  topMoversWrap: { position: 'relative' },
  topMovers: {
    paddingHorizontal: 18,
    gap: 12,
    paddingBottom: 4,
  },
  moverCard: {
    width: 140,
    backgroundColor: colors.bg1,
    borderColor: colors.line,
    borderWidth: 1,
    borderRadius: 16,
    padding: 10,
  },
  moverName: {
    fontFamily: fonts.display,
    color: colors.ink0,
    fontSize: 14,
    fontWeight: '800',
    marginTop: 8,
  },
  moverFoot: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  moverPrice: {
    fontFamily: fonts.monoBlack,
    color: colors.ink0,
    fontSize: 12,
    fontWeight: '800',
  },
  moverTier: {
    fontFamily: fonts.monoBold,
    color: colors.ink3,
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.6,
  },
  fadeRight: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    width: 36,
  },

  questCard: {
    marginHorizontal: 18,
    marginTop: 4,
    padding: 14,
    borderRadius: 18,
    backgroundColor: colors.bg1,
    borderWidth: 1,
    borderColor: colors.lineStrong,
  },
  questHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  questTitle: {
    fontFamily: fonts.display,
    color: colors.ink0,
    fontSize: 16,
    fontWeight: '800',
  },
  questChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: 'rgba(194, 77, 255, 0.2)',
  },
  questChipText: {
    fontFamily: fonts.monoBlack,
    color: energy.psychic.color,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  questTrack: {
    height: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.08)',
    overflow: 'hidden',
  },
  questFill: {
    height: '100%',
    borderRadius: 999,
  },
  questFoot: { marginTop: 8 },
  questFootText: {
    fontFamily: fonts.mono,
    color: colors.ink3,
    fontSize: 11,
  },

  emptyHint: {
    paddingHorizontal: 24,
    paddingTop: 22,
  },
  emptyHintText: {
    fontFamily: fonts.body,
    color: colors.ink3,
    fontSize: 14,
    textAlign: 'center',
  },
});
