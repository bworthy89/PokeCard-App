import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  Image,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { getCards } from '../services/collection';
import { SavedCard } from '../types';
import { useScan } from '../contexts/ScanContext';

type SortKey = 'date' | 'grade' | 'value';

const TIER_ORDER: Record<string, number> = {
  'Gem Mint': 5,
  'Near Mint': 4,
  'Lightly Played': 3,
  'Moderately Played': 2,
  'Heavily Played': 1,
};

export default function CollectionScreen() {
  const [cards, setCards] = useState<SavedCard[]>([]);
  const [sortBy, setSortBy] = useState<SortKey>('date');
  const [refreshing, setRefreshing] = useState(false);
  const router = useRouter();
  const { setScanResult, setScanError } = useScan();

  const loadCards = useCallback(async () => {
    try {
      const fetchedCards = await getCards();
      setCards(fetchedCards);
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

  const sortedCards = [...cards].sort((a, b) => {
    switch (sortBy) {
      case 'grade':
        return (TIER_ORDER[b.grading.overallTier] || 0) - (TIER_ORDER[a.grading.overallTier] || 0);
      case 'value':
        return (b.price?.market || 0) - (a.price?.market || 0);
      case 'date':
      default:
        return b.scannedAt.getTime() - a.scannedAt.getTime();
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

  const renderCard = ({ item }: { item: SavedCard }) => (
    <TouchableOpacity style={styles.card} onPress={() => handleCardPress(item)}>
      {item.cardArtworkUrl ? (
        <Image source={{ uri: item.cardArtworkUrl }} style={styles.cardImage} />
      ) : (
        <View style={[styles.cardImage, styles.cardPlaceholder]}>
          <Text style={styles.placeholderText}>?</Text>
        </View>
      )}
      <Text style={styles.cardName} numberOfLines={1}>{item.grading.cardName}</Text>
      <Text style={styles.cardTier}>{item.grading.overallTier}</Text>
      {item.price?.market && (
        <Text style={styles.cardPrice}>${item.price.market.toFixed(2)}</Text>
      )}
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Collection</Text>
        <Text style={styles.count}>{cards.length} cards</Text>
      </View>

      <View style={styles.sortBar}>
        {(['date', 'grade', 'value'] as SortKey[]).map((key) => (
          <TouchableOpacity
            key={key}
            style={[styles.sortButton, sortBy === key && styles.sortButtonActive]}
            onPress={() => setSortBy(key)}
          >
            <Text
              style={[styles.sortText, sortBy === key && styles.sortTextActive]}
            >
              {key.charAt(0).toUpperCase() + key.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {cards.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>No cards yet</Text>
          <Text style={styles.emptyMessage}>Scan a card and save it to start your collection</Text>
        </View>
      ) : (
        <FlatList
          data={sortedCards}
          renderItem={renderCard}
          keyExtractor={(item) => item.id}
          numColumns={2}
          contentContainerStyle={styles.grid}
          columnWrapperStyle={styles.row}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#FFD700" />
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0d0d1a',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 12,
  },
  title: {
    color: '#fff',
    fontSize: 28,
    fontWeight: '800',
  },
  count: {
    color: '#888',
    fontSize: 14,
  },
  sortBar: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 8,
    marginBottom: 16,
  },
  sortButton: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#1a1a2e',
  },
  sortButtonActive: {
    backgroundColor: '#FFD700',
  },
  sortText: {
    color: '#888',
    fontSize: 13,
    fontWeight: '600',
  },
  sortTextActive: {
    color: '#000',
  },
  grid: {
    paddingHorizontal: 16,
  },
  row: {
    gap: 12,
    marginBottom: 12,
  },
  card: {
    flex: 1,
    backgroundColor: '#1a1a2e',
    borderRadius: 12,
    padding: 10,
    alignItems: 'center',
  },
  cardImage: {
    width: '100%',
    aspectRatio: 2.5 / 3.5,
    borderRadius: 8,
    marginBottom: 8,
  },
  cardPlaceholder: {
    backgroundColor: '#0d0d1a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderText: {
    color: '#333',
    fontSize: 32,
  },
  cardName: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  cardTier: {
    color: '#4ade80',
    fontSize: 11,
    marginTop: 2,
  },
  cardPrice: {
    color: '#FFD700',
    fontSize: 13,
    fontWeight: '700',
    marginTop: 2,
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  emptyTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 8,
  },
  emptyMessage: {
    color: '#888',
    fontSize: 14,
    textAlign: 'center',
  },
});
