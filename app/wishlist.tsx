import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import {
  addWishlistItem,
  deleteWishlistItem,
  getWishlist,
  updateWishlistItem,
} from '../services/wishlist';
import { WishlistItem } from '../types';
import {
  HoloBackground,
  ScreenHeader,
  CardArt,
} from '../components/holo';
import { colors, fonts, energy, inferEnergyType } from '../theme';

export default function WishlistScreen() {
  const router = useRouter();
  const [items, setItems] = useState<WishlistItem[]>([]);
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState('');
  const [target, setTarget] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const list = await getWishlist();
      setItems(list);
    } catch (e) {
      console.error('Failed to load wishlist:', e);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const handleAdd = async () => {
    const trimmed = name.trim();
    const targetPrice = parseFloat(target);
    if (!trimmed) {
      Alert.alert('Card name required', 'Enter a card name to track.');
      return;
    }
    if (!Number.isFinite(targetPrice) || targetPrice < 0) {
      Alert.alert('Target price required', 'Enter a positive number.');
      return;
    }
    setSaving(true);
    try {
      await addWishlistItem({ cardName: trimmed, targetPrice, alertEnabled: true });
      setName('');
      setTarget('');
      setAdding(false);
      await load();
    } catch (e) {
      Alert.alert('Error', 'Could not add to wishlist.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (item: WishlistItem) => {
    Alert.alert('Remove from wishlist?', item.cardName, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteWishlistItem(item.id);
            await load();
          } catch (e) {
            Alert.alert('Error', 'Could not remove.');
          }
        },
      },
    ]);
  };

  const handleToggleAlert = async (item: WishlistItem) => {
    try {
      await updateWishlistItem(item.id, { alertEnabled: !item.alertEnabled });
      await load();
    } catch (e) {
      // ignore — keep UI optimistic
    }
  };

  const alertCount = items.filter((i) => i.alertEnabled).length;

  return (
    <HoloBackground>
      <ScreenHeader
        title="Wishlist"
        onBack={() => router.back()}
        right={
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => setAdding((a) => !a)}
            style={styles.addBtn}
          >
            <Text style={styles.addBtnText}>{adding ? '×' : '+'}</Text>
          </TouchableOpacity>
        }
      />

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>Cards I'm chasing</Text>
          <Text style={styles.sub}>
            {items.length} tracked · {alertCount} {alertCount === 1 ? 'alert' : 'alerts'} active
          </Text>
        </View>

        {adding && (
          <View style={styles.addForm}>
            <Text style={styles.formLabel}>Card name</Text>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="e.g. Charizard"
              placeholderTextColor={colors.ink4}
              style={styles.input}
              autoFocus
            />
            <Text style={styles.formLabel}>Target price ($)</Text>
            <TextInput
              value={target}
              onChangeText={setTarget}
              placeholder="e.g. 80"
              placeholderTextColor={colors.ink4}
              keyboardType="decimal-pad"
              style={styles.input}
            />
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={handleAdd}
              disabled={saving}
              style={styles.formSave}
            >
              <Text style={styles.formSaveText}>{saving ? 'Saving…' : 'Add to wishlist'}</Text>
            </TouchableOpacity>
          </View>
        )}

        {items.length === 0 && !adding && (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>Your wishlist is empty</Text>
            <Text style={styles.emptyHint}>
              Tap + above to add a card you're chasing and set a target price.
            </Text>
          </View>
        )}

        {items.map((w) => {
          const t = inferEnergyType(w.cardName);
          const meta = energy[t];
          const overTarget = (w.currentPrice ?? 0) > w.targetPrice;
          return (
            <TouchableOpacity
              key={w.id}
              activeOpacity={0.85}
              onLongPress={() => handleDelete(w)}
              style={styles.row}
            >
              <View style={styles.rowArt}>
                <CardArt type={t} name={w.cardName} imageUrl={w.cardArtworkUrl} />
              </View>
              <View style={styles.rowInfo}>
                <View style={styles.typeRow}>
                  <View style={[styles.typeDot, { backgroundColor: meta.color }]} />
                  <Text style={[styles.typeName, { color: meta.color }]}>
                    {meta.name.toUpperCase()}
                  </Text>
                </View>
                <Text style={styles.cardName} numberOfLines={1}>
                  {w.cardName}
                </Text>
                {w.setName && <Text style={styles.cardSet}>{w.setName}</Text>}
                <View style={styles.rowFoot}>
                  <View>
                    <Text style={styles.priceLabel}>TARGET / NOW</Text>
                    <Text style={styles.priceValue}>
                      ${w.targetPrice.toFixed(0)} /{' '}
                      <Text
                        style={{
                          color: w.currentPrice == null
                            ? colors.ink3
                            : overTarget
                            ? energy.fire.color
                            : energy.grass.color,
                        }}
                      >
                        {w.currentPrice != null ? `$${w.currentPrice.toFixed(0)}` : '—'}
                      </Text>
                    </Text>
                  </View>
                  <TouchableOpacity
                    activeOpacity={0.85}
                    onPress={() => handleToggleAlert(w)}
                    style={[
                      styles.alertChip,
                      w.alertEnabled
                        ? { backgroundColor: 'rgba(255,210,61,0.18)' }
                        : { backgroundColor: 'rgba(255,255,255,0.06)' },
                    ]}
                  >
                    <Text
                      style={[
                        styles.alertChipText,
                        {
                          color: w.alertEnabled ? energy.electric.color : colors.ink3,
                        },
                      ]}
                    >
                      🔔 {w.alertEnabled ? 'ALERT' : 'OFF'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </HoloBackground>
  );
}

const styles = StyleSheet.create({
  addBtn: {
    width: 38,
    height: 38,
    borderRadius: 999,
    backgroundColor: energy.electric.color,
    borderWidth: 2,
    borderColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addBtnText: {
    fontFamily: fonts.display,
    color: '#000',
    fontSize: 22,
    fontWeight: '800',
    lineHeight: 22,
  },

  content: { paddingBottom: 120 },

  header: { paddingHorizontal: 18, paddingBottom: 14 },
  title: {
    fontFamily: fonts.display,
    color: colors.ink0,
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: -0.6,
  },
  sub: {
    fontFamily: fonts.monoBold,
    color: colors.ink2,
    fontSize: 12,
    marginTop: 4,
  },

  addForm: {
    marginHorizontal: 18,
    marginBottom: 16,
    padding: 14,
    borderRadius: 14,
    backgroundColor: colors.bg1,
    borderWidth: 1,
    borderColor: colors.lineStrong,
  },
  formLabel: {
    fontFamily: fonts.monoBlack,
    color: colors.ink2,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.6,
    marginBottom: 6,
  },
  input: {
    fontFamily: fonts.body,
    color: colors.ink0,
    fontSize: 15,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.lineStrong,
    backgroundColor: 'rgba(0,0,0,0.3)',
    marginBottom: 12,
  },
  formSave: {
    paddingVertical: 12,
    borderRadius: 999,
    backgroundColor: energy.electric.color,
    borderWidth: 2,
    borderColor: '#000',
    alignItems: 'center',
  },
  formSaveText: {
    fontFamily: fonts.display,
    color: '#000',
    fontSize: 14,
    fontWeight: '800',
  },

  empty: {
    paddingHorizontal: 32,
    paddingTop: 30,
    alignItems: 'center',
  },
  emptyTitle: {
    fontFamily: fonts.display,
    color: colors.ink0,
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 8,
  },
  emptyHint: {
    fontFamily: fonts.body,
    color: colors.ink3,
    fontSize: 14,
    textAlign: 'center',
  },

  row: {
    flexDirection: 'row',
    gap: 12,
    marginHorizontal: 18,
    marginBottom: 10,
    padding: 12,
    backgroundColor: colors.bg1,
    borderColor: colors.lineStrong,
    borderWidth: 1,
    borderRadius: 14,
  },
  rowArt: { width: 72 },
  rowInfo: { flex: 1, minWidth: 0 },
  typeRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  typeDot: { width: 8, height: 8, borderRadius: 999 },
  typeName: {
    fontFamily: fonts.monoBlack,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  cardName: {
    fontFamily: fonts.display,
    color: colors.ink0,
    fontSize: 16,
    fontWeight: '800',
    marginTop: 2,
  },
  cardSet: {
    fontFamily: fonts.mono,
    color: colors.ink3,
    fontSize: 10,
    marginTop: 1,
  },
  rowFoot: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  priceLabel: {
    fontFamily: fonts.monoBlack,
    color: colors.ink3,
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.6,
  },
  priceValue: {
    fontFamily: fonts.monoBlack,
    color: colors.ink0,
    fontSize: 13,
    fontWeight: '800',
    marginTop: 2,
  },
  alertChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  alertChipText: {
    fontFamily: fonts.monoBlack,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
});
