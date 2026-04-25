import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
} from 'react-native';
import Svg, { Path, Circle } from 'react-native-svg';
import { useFocusEffect, useRouter } from 'expo-router';
import { getCards } from '../services/collection';
import { SavedCard } from '../types';
import { useScan } from '../contexts/ScanContext';
import {
  HoloBackground,
  ScreenHeader,
  CardArt,
  HoloFoil,
} from '../components/holo';
import {
  colors,
  fonts,
  energy,
  tiers,
  Tier,
  EnergyType,
  inferEnergyType,
} from '../theme';

type SortKey = 'value' | 'grade' | 'date';
type FilterKey = 'all' | EnergyType;

const SORT_LABELS: Array<[SortKey, string]> = [
  ['value', 'VALUE'],
  ['grade', 'GRADE'],
  ['date', 'RECENT'],
];

const FILTER_TYPES: EnergyType[] = [
  'fire',
  'water',
  'grass',
  'electric',
  'psychic',
  'fighting',
  'dark',
  'fairy',
  'steel',
  'dragon',
];

const isKnownTier = (t: string): t is Tier =>
  t === 'Gem Mint' ||
  t === 'Near Mint' ||
  t === 'Lightly Played' ||
  t === 'Moderately Played' ||
  t === 'Heavily Played';

const tierRank = (t: string) => (isKnownTier(t) ? tiers[t].rank : 0);

export default function CollectionScreen() {
  const [cards, setCards] = useState<SavedCard[]>([]);
  const [sortBy, setSortBy] = useState<SortKey>('date');
  const [filter, setFilter] = useState<FilterKey>('all');
  const [refreshing, setRefreshing] = useState(false);
  const router = useRouter();
  const { setScanResult, setScanError } = useScan();

  const loadCards = useCallback(async () => {
    try {
      const fetched = await getCards();
      setCards(fetched);
    } catch (error) {
      console.error('Failed to load collection:', error);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadCards();
    }, [loadCards])
  );

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadCards();
    setRefreshing(false);
  };

  const decorated = useMemo(
    () =>
      cards.map((c) => ({
        card: c,
        type: inferEnergyType(c.grading.cardName),
      })),
    [cards]
  );

  const totalValue = cards.reduce((s, c) => s + (c.price?.market ?? 0), 0);
  const gemCount = cards.filter((c) => c.grading.overallTier === 'Gem Mint').length;
  const typeCounts = useMemo(() => {
    const m = new Map<EnergyType, number>();
    decorated.forEach((d) => {
      m.set(d.type, (m.get(d.type) ?? 0) + 1);
    });
    return m;
  }, [decorated]);

  const filtered = filter === 'all' ? decorated : decorated.filter((d) => d.type === filter);
  const sorted = [...filtered].sort((a, b) => {
    switch (sortBy) {
      case 'value':
        return (b.card.price?.market ?? 0) - (a.card.price?.market ?? 0);
      case 'grade':
        return tierRank(b.card.grading.overallTier) - tierRank(a.card.grading.overallTier);
      case 'date':
      default:
        return b.card.scannedAt.getTime() - a.card.scannedAt.getTime();
    }
  });

  const handleCardPress = (card: SavedCard) => {
    setScanResult({
      grading: card.grading,
      price: card.price,
      pokemonTcgId: card.pokemonTcgId,
      imageUrl: card.imageUrl,
      storagePath: card.storagePath,
      cardArtworkUrl: card.cardArtworkUrl,
    });
    setScanError(null);
    router.push('/results');
  };

  const renderCard = ({ item }: { item: { card: SavedCard; type: EnergyType } }) => {
    const { card, type } = item;
    const tier = isKnownTier(card.grading.overallTier) ? card.grading.overallTier : 'Near Mint';
    const tierColor = tiers[tier].color;
    const isGem = tier === 'Gem Mint';
    return (
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={() => handleCardPress(card)}
        style={styles.cardCell}
      >
        <View style={styles.cardArtBox}>
          <CardArt
            type={type}
            name={card.grading.cardName}
            imageUrl={card.cardArtworkUrl}
            holo={isGem}
          />
          {isGem && (
            <HoloFoil style={styles.gemTag}>
              <Text style={styles.gemTagText}>GEM</Text>
            </HoloFoil>
          )}
        </View>
        <View style={styles.cardInfo}>
          <Text style={styles.cardName} numberOfLines={1}>
            {card.grading.cardName}
          </Text>
          <View style={styles.cardRow}>
            <Text style={[styles.cardPrice, { color: tierColor }]}>
              {card.price?.market != null ? `$${card.price.market.toFixed(0)}` : '—'}
            </Text>
            <Text style={styles.cardTierMini}>{tiers[tier].label}</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <HoloBackground>
      <ScreenHeader
        title="Vault"
        right={
          <View style={styles.headerIconButton}>
            <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
              <Circle cx={11} cy={11} r={7} stroke={colors.ink0} strokeWidth={2.2} />
              <Path
                d="M21 21l-4-4"
                stroke={colors.ink0}
                strokeWidth={2.2}
                strokeLinecap="round"
              />
            </Svg>
          </View>
        }
      />

      {/* Summary strip */}
      <View style={styles.summary}>
        <View style={[styles.summaryCard, { flex: 1.4 }]}>
          <Text style={styles.summaryLabel}>TOTAL VALUE</Text>
          <Text style={styles.summaryValue}>${totalValue.toFixed(0)}</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>CARDS</Text>
          <Text style={styles.summaryValue}>{cards.length}</Text>
        </View>
        <View
          style={[
            styles.summaryCard,
            {
              backgroundColor: 'rgba(194, 77, 255, 0.16)',
              borderColor: 'rgba(194, 77, 255, 0.3)',
            },
          ]}
        >
          <Text style={[styles.summaryLabel, { color: tiers['Gem Mint'].color }]}>GEMS ★</Text>
          <Text style={[styles.summaryValue, { color: tiers['Gem Mint'].color }]}>{gemCount}</Text>
        </View>
      </View>

      {/* Sort tabs */}
      <View style={styles.sortRow}>
        {SORT_LABELS.map(([key, label]) => (
          <TouchableOpacity
            key={key}
            activeOpacity={0.85}
            onPress={() => setSortBy(key)}
            style={[
              styles.sortBtn,
              sortBy === key
                ? { backgroundColor: colors.ink0, borderColor: colors.ink0 }
                : { backgroundColor: 'rgba(255,255,255,0.06)' },
            ]}
          >
            <Text
              style={[
                styles.sortText,
                sortBy === key ? { color: '#000' } : { color: colors.ink2 },
              ]}
            >
              {label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Type filters */}
      <FlatList
        horizontal
        showsHorizontalScrollIndicator={false}
        data={[{ key: 'all' as FilterKey, label: `ALL · ${cards.length}`, color: undefined as string | undefined }, ...FILTER_TYPES.flatMap<{
          key: FilterKey;
          label: string;
          color?: string;
        }>((t) => {
          const count = typeCounts.get(t) ?? 0;
          if (count === 0) return [];
          const meta = energy[t];
          return [
            { key: t, label: `${meta.glyph} ${meta.name.toUpperCase()} · ${count}`, color: meta.color },
          ];
        })]}
        keyExtractor={(item) => item.key}
        contentContainerStyle={styles.filterContent}
        renderItem={({ item }) => {
          const active = filter === item.key;
          return (
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => setFilter(item.key)}
              style={[
                styles.filterBtn,
                active && item.color
                  ? { backgroundColor: item.color, borderColor: item.color }
                  : active
                  ? { backgroundColor: colors.ink0, borderColor: colors.ink0 }
                  : null,
              ]}
            >
              <Text
                style={[
                  styles.filterText,
                  active ? { color: '#000' } : { color: colors.ink2 },
                ]}
              >
                {item.label}
              </Text>
            </TouchableOpacity>
          );
        }}
      />

      {cards.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>Vault is empty</Text>
          <Text style={styles.emptyMessage}>Scan a card and save it to start collecting.</Text>
        </View>
      ) : (
        <FlatList
          data={sorted}
          renderItem={renderCard}
          keyExtractor={(item) => item.card.id}
          numColumns={2}
          contentContainerStyle={styles.grid}
          columnWrapperStyle={styles.gridRow}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={energy.electric.color}
            />
          }
        />
      )}
    </HoloBackground>
  );
}

const styles = StyleSheet.create({
  headerIconButton: {
    width: 38,
    height: 38,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: colors.lineStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },

  summary: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 18,
    paddingBottom: 14,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: colors.bg1,
    borderColor: colors.lineStrong,
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 12,
  },
  summaryLabel: {
    fontFamily: fonts.monoBold,
    color: colors.ink3,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  summaryValue: {
    fontFamily: fonts.display,
    color: colors.ink0,
    fontSize: 22,
    fontWeight: '800',
    marginTop: 2,
    letterSpacing: -0.5,
  },

  sortRow: {
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 18,
    paddingBottom: 12,
  },
  sortBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.lineStrong,
  },
  sortText: {
    fontFamily: fonts.monoBlack,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.6,
  },

  filterContent: {
    paddingHorizontal: 18,
    paddingBottom: 14,
    gap: 6,
  },
  filterBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.lineStrong,
    marginRight: 6,
  },
  filterText: {
    fontFamily: fonts.monoBlack,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.6,
  },

  grid: {
    paddingHorizontal: 16,
    paddingBottom: 100,
  },
  gridRow: {
    gap: 12,
    marginBottom: 12,
  },
  cardCell: {
    flex: 1,
    backgroundColor: colors.bg1,
    borderColor: colors.line,
    borderWidth: 1,
    borderRadius: 16,
    overflow: 'hidden',
  },
  cardArtBox: {
    padding: 8,
    position: 'relative',
  },
  gemTag: {
    position: 'absolute',
    top: 14,
    right: 14,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#000',
  },
  gemTagText: {
    fontFamily: fonts.display,
    fontSize: 9,
    fontWeight: '800',
    color: '#000',
  },
  cardInfo: {
    paddingHorizontal: 10,
    paddingBottom: 10,
  },
  cardName: {
    fontFamily: fonts.display,
    color: colors.ink0,
    fontSize: 14,
    fontWeight: '800',
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  cardPrice: {
    fontFamily: fonts.monoBlack,
    fontSize: 13,
    fontWeight: '800',
  },
  cardTierMini: {
    fontFamily: fonts.monoBold,
    color: colors.ink3,
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.6,
  },

  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingBottom: 80,
  },
  emptyTitle: {
    fontFamily: fonts.display,
    color: colors.ink0,
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 8,
  },
  emptyMessage: {
    fontFamily: fonts.body,
    color: colors.ink3,
    fontSize: 14,
    textAlign: 'center',
  },
});
