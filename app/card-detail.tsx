import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Path } from 'react-native-svg';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { getCards } from '../services/collection';
import {
  addWishlistItem,
  deleteWishlistItem,
  getWishlist,
  updateWishlistItem,
} from '../services/wishlist';
import { SavedCard, WishlistItem } from '../types';
import {
  HoloBackground,
  CardArt,
  EnergyChip,
  TierBadge,
  TierLadder,
  Sparkline,
} from '../components/holo';
import {
  colors,
  fonts,
  energy,
  tiers,
  Tier,
  inferEnergyType,
} from '../theme';

const isKnownTier = (t: string): t is Tier =>
  t === 'Gem Mint' ||
  t === 'Near Mint' ||
  t === 'Lightly Played' ||
  t === 'Moderately Played' ||
  t === 'Heavily Played';

const synthHistory = (current: number): number[] =>
  Array.from({ length: 24 }, (_, i) => {
    const base = current * (0.86 + 0.14 * (i / 23));
    return base + Math.sin(i * 0.7) * current * 0.02;
  });

const matchWishlist = (
  list: WishlistItem[],
  cardName: string,
  setNumber?: string
): WishlistItem | null => {
  const exact = list.find(
    (w) => w.cardName === cardName && (setNumber ? w.setNumber === setNumber : true)
  );
  return exact ?? list.find((w) => w.cardName === cardName) ?? null;
};

export default function CardDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [card, setCard] = useState<SavedCard | null>(null);
  const [wishlistMatch, setWishlistMatch] = useState<WishlistItem | null>(null);

  const load = useCallback(async () => {
    try {
      const [all, wish] = await Promise.all([getCards(), getWishlist().catch(() => [])]);
      const found = all.find((c) => c.id === id) ?? null;
      setCard(found);
      setWishlistMatch(
        found
          ? matchWishlist(wish, found.grading.cardName, found.grading.setNumber)
          : null
      );
    } catch (e) {
      console.error('Failed to load card:', e);
    }
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  if (!card) {
    return (
      <HoloBackground>
        <View style={styles.loading}>
          <Text style={styles.loadingText}>Loading card…</Text>
        </View>
      </HoloBackground>
    );
  }

  const t = inferEnergyType(card.grading.cardName);
  const meta = energy[t];
  const tierKey: Tier = isKnownTier(card.grading.overallTier) ? card.grading.overallTier : 'Near Mint';
  const market = card.price?.market ?? 0;
  const history = market > 0 ? synthHistory(market) : Array.from({ length: 24 }, () => 0);
  const first = history[0];
  const last = history[history.length - 1];
  const deltaPct = market > 0 && first > 0 ? ((last - first) / first) * 100 : 0;
  const alertOn = wishlistMatch?.alertEnabled ?? false;
  const wishlistAdded = wishlistMatch != null;
  const alertTarget = wishlistMatch?.targetPrice ?? (market > 0 ? Math.round(market * 1.2) : 0);

  const addNew = async (alertEnabled: boolean) => {
    await addWishlistItem({
      cardName: card.grading.cardName,
      setName: card.grading.setName,
      setNumber: card.grading.setNumber,
      pokemonTcgId: card.pokemonTcgId ?? undefined,
      cardArtworkUrl: card.cardArtworkUrl ?? undefined,
      targetPrice: market > 0 ? Math.max(1, Math.round(market * 0.9)) : 50,
      currentPrice: market || undefined,
      alertEnabled,
    });
  };

  const handleWishlist = async () => {
    try {
      if (wishlistMatch) {
        await deleteWishlistItem(wishlistMatch.id);
      } else {
        await addNew(true);
      }
      await load();
    } catch {
      Alert.alert('Error', 'Could not update wishlist.');
    }
  };

  const handleToggleAlert = async () => {
    try {
      if (wishlistMatch) {
        await updateWishlistItem(wishlistMatch.id, { alertEnabled: !alertOn });
      } else {
        await addNew(true);
      }
      await load();
    } catch {
      Alert.alert('Error', 'Could not update alert.');
    }
  };

  return (
    <HoloBackground>
      <LinearGradient
        colors={[`${meta.color}55`, 'transparent']}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={styles.heroTint}
        pointerEvents="none"
      />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Top bar */}
        <View style={styles.topBar}>
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => router.back()}
            style={styles.iconBtn}
          >
            <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
              <Path
                d="M15 18l-6-6 6-6"
                stroke={colors.ink0}
                strokeWidth={2.5}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </Svg>
          </TouchableOpacity>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={handleWishlist}
              style={[
                styles.iconBtn,
                wishlistAdded && { backgroundColor: energy.fairy.color },
              ]}
            >
              <Svg width={18} height={18} viewBox="0 0 24 24" fill={wishlistAdded ? '#000' : 'none'}>
                <Path
                  d="M12 21s-7-4.5-7-10a4 4 0 017-2.5A4 4 0 0119 11c0 5.5-7 10-7 10z"
                  stroke={wishlistAdded ? '#000' : colors.ink0}
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </Svg>
            </TouchableOpacity>
          </View>
        </View>

        {/* Hero */}
        <View style={styles.hero}>
          <View style={styles.heroArt}>
            <CardArt
              type={t}
              name={card.grading.cardName}
              imageUrl={card.cardArtworkUrl}
              holo={tierKey === 'Gem Mint'}
            />
          </View>
          <View style={styles.heroMeta}>
            <EnergyChip type={t} size="sm" />
            <Text style={styles.cardName} numberOfLines={2}>
              {card.grading.cardName}
            </Text>
            <Text style={styles.cardSet}>{card.grading.setName}</Text>
            <Text style={styles.cardNum}>{card.grading.setNumber}</Text>
            <View style={{ marginTop: 8 }}>
              <TierBadge tier={tierKey} />
            </View>
          </View>
        </View>

        {/* Price */}
        <View style={styles.section}>
          <View style={styles.priceHead}>
            <View>
              <Text style={styles.priceLabel}>MARKET NOW</Text>
              <Text style={styles.priceAmount}>
                {market > 0 ? `$${market.toFixed(2)}` : '—'}
              </Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              {market > 0 ? (
                <Text
                  style={[
                    styles.priceDelta,
                    {
                      color: deltaPct >= 0 ? energy.grass.color : energy.fire.color,
                    },
                  ]}
                >
                  {deltaPct >= 0 ? '↑' : '↓'} {Math.abs(deltaPct).toFixed(1)}%
                </Text>
              ) : (
                <Text style={[styles.priceDelta, { color: colors.ink3 }]}>—</Text>
              )}
              <Text style={styles.pricePeriod}>30D · est.</Text>
            </View>
          </View>

          <View style={{ marginTop: 12, height: 100 }}>
            <Sparkline data={history} color={meta.color} height={100} />
          </View>

          <View style={styles.periodRow}>
            {['1W', '1M', '3M', '1Y', 'ALL'].map((p, i) => (
              <View
                key={p}
                style={[
                  styles.periodBtn,
                  i === 1
                    ? { backgroundColor: colors.ink0, borderColor: colors.ink0 }
                    : null,
                ]}
              >
                <Text
                  style={[
                    styles.periodText,
                    i === 1 ? { color: '#000' } : { color: colors.ink2 },
                  ]}
                >
                  {p}
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* Price alert */}
        <View
          style={[
            styles.section,
            alertOn ? { backgroundColor: 'rgba(255,210,61,0.14)', borderColor: energy.electric.color } : null,
          ]}
        >
          <View style={styles.alertRow}>
            <View style={styles.alertIcon}>
              <Text style={{ fontSize: 18 }}>🔔</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.alertTitle}>Price alert</Text>
              <Text style={styles.alertSub}>
                {alertOn ? `Notify when ≥ $${alertTarget}` : 'Get pinged on price moves'}
              </Text>
            </View>
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={handleToggleAlert}
              style={[
                styles.toggle,
                alertOn ? { backgroundColor: energy.grass.color } : { backgroundColor: 'rgba(255,255,255,0.1)' },
              ]}
            >
              <View
                style={[
                  styles.toggleKnob,
                  alertOn ? { alignSelf: 'flex-end' } : { alignSelf: 'flex-start' },
                ]}
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* Grade breakdown */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Grade Breakdown</Text>
          <View style={{ marginTop: 10 }}>
            <TierLadder current={tierKey} />
          </View>
          <View style={styles.gradeGrid}>
            {[
              ['CENT', card.grading.centering, energy.water.color],
              ['CORN', card.grading.corners,   energy.grass.color],
              ['EDGE', card.grading.edges,     energy.psychic.color],
              ['SURF', card.grading.surface,   energy.electric.color],
            ].map(([l, v, c]) => (
              <View key={String(l)} style={styles.gradeCell}>
                <Text style={styles.gradeLabel}>{l as string}</Text>
                <Text style={[styles.gradeValue, { color: c as string }]}>{v as number}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Notes */}
        {card.grading.explanation ? (
          <View style={styles.notes}>
            <Text style={styles.notesLabel}>AI NOTES</Text>
            <Text style={styles.notesBody}>{card.grading.explanation}</Text>
          </View>
        ) : null}
      </ScrollView>
    </HoloBackground>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontFamily: fonts.body,
    color: colors.ink2,
  },

  heroTint: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 280,
  },
  content: { paddingBottom: 120, paddingTop: 56 },

  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
  },
  iconBtn: {
    width: 38,
    height: 38,
    borderRadius: 999,
    backgroundColor: 'rgba(0,0,0,0.4)',
    borderWidth: 1,
    borderColor: colors.lineStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },

  hero: {
    flexDirection: 'row',
    gap: 14,
    paddingHorizontal: 18,
    paddingTop: 14,
    paddingBottom: 18,
  },
  heroArt: { width: 140 },
  heroMeta: { flex: 1, minWidth: 0 },
  cardName: {
    fontFamily: fonts.display,
    color: colors.ink0,
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: -0.6,
    marginTop: 6,
  },
  cardSet: {
    fontFamily: fonts.monoBold,
    color: colors.ink2,
    fontSize: 11,
    marginTop: 4,
  },
  cardNum: {
    fontFamily: fonts.mono,
    color: colors.ink3,
    fontSize: 11,
    marginTop: 1,
  },

  section: {
    marginHorizontal: 18,
    marginBottom: 14,
    padding: 16,
    backgroundColor: colors.bg1,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.lineStrong,
  },
  priceHead: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  priceLabel: {
    fontFamily: fonts.monoBlack,
    color: colors.ink3,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  priceAmount: {
    fontFamily: fonts.display,
    color: colors.ink0,
    fontSize: 36,
    fontWeight: '800',
    letterSpacing: -1,
    marginTop: 2,
  },
  priceDelta: {
    fontFamily: fonts.monoBold,
    fontSize: 14,
    fontWeight: '800',
  },
  pricePeriod: {
    fontFamily: fonts.mono,
    color: colors.ink3,
    fontSize: 10,
    marginTop: 2,
  },
  periodRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 10,
  },
  periodBtn: {
    flex: 1,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.lineStrong,
    alignItems: 'center',
  },
  periodText: {
    fontFamily: fonts.monoBlack,
    fontSize: 11,
    fontWeight: '800',
  },

  alertRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  alertIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: energy.electric.color,
    alignItems: 'center',
    justifyContent: 'center',
  },
  alertTitle: {
    fontFamily: fonts.display,
    color: colors.ink0,
    fontSize: 15,
    fontWeight: '800',
  },
  alertSub: {
    fontFamily: fonts.mono,
    color: colors.ink3,
    fontSize: 11,
    marginTop: 2,
  },
  toggle: {
    width: 48,
    height: 28,
    borderRadius: 999,
    padding: 2,
    borderWidth: 1,
    borderColor: colors.lineStrong,
    justifyContent: 'center',
  },
  toggleKnob: {
    width: 22,
    height: 22,
    borderRadius: 999,
    backgroundColor: '#fff',
  },

  sectionTitle: {
    fontFamily: fonts.display,
    color: colors.ink0,
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: -0.4,
  },
  gradeGrid: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 14,
  },
  gradeCell: {
    flex: 1,
    paddingVertical: 8,
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 10,
    alignItems: 'center',
  },
  gradeLabel: {
    fontFamily: fonts.monoBold,
    color: colors.ink3,
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.6,
  },
  gradeValue: {
    fontFamily: fonts.display,
    fontSize: 20,
    fontWeight: '800',
    marginTop: 2,
  },

  notes: {
    marginHorizontal: 18,
    marginTop: 4,
    padding: 14,
    backgroundColor: colors.bg1,
    borderRadius: 14,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.lineStrong,
  },
  notesLabel: {
    fontFamily: fonts.monoBlack,
    color: colors.ink2,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.6,
    marginBottom: 6,
  },
  notesBody: {
    fontFamily: fonts.body,
    color: colors.ink1,
    fontSize: 13,
    lineHeight: 20,
  },
});
