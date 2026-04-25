import React from 'react';
import { View, StyleSheet } from 'react-native';
import { tiers, Tier, TIER_ORDER } from '../../theme';

interface Props {
  current: Tier;
}

export const TierLadder = ({ current }: Props) => {
  const idx = TIER_ORDER.indexOf(current);
  return (
    <View style={styles.row}>
      {TIER_ORDER.map((t, i) => {
        const tier = tiers[t];
        const active = i <= idx;
        return (
          <View
            key={t}
            style={[
              styles.seg,
              active
                ? { backgroundColor: tier.color, shadowColor: tier.color }
                : styles.inactive,
            ]}
          />
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 4 },
  seg: {
    flex: 1,
    height: 6,
    borderRadius: 999,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 4,
    elevation: 2,
  },
  inactive: { backgroundColor: 'rgba(255,255,255,0.08)' },
});
