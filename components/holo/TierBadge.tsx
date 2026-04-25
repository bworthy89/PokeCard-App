import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { tiers, Tier, fonts, HOLO_FOIL_COLORS } from '../../theme';

interface Props {
  tier: Tier;
  large?: boolean;
}

export const TierBadge = ({ tier, large = false }: Props) => {
  const t = tiers[tier] ?? tiers['Near Mint'];

  if (t.holo) {
    return (
      <LinearGradient
        colors={HOLO_FOIL_COLORS}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[
          styles.base,
          large ? styles.large : styles.small,
          styles.holoOutline,
        ]}
      >
        <Text
          style={[
            styles.label,
            { fontSize: large ? 18 : 12, color: '#0A0A1F' },
          ]}
        >
          ★ {tier.toUpperCase()} ★
        </Text>
      </LinearGradient>
    );
  }

  return (
    <View
      style={[
        styles.base,
        large ? styles.large : styles.small,
        { backgroundColor: t.color, borderColor: 'rgba(0,0,0,0.4)', borderWidth: 2 },
      ]}
    >
      <Text
        style={[
          styles.label,
          { fontSize: large ? 16 : 11, color: '#0A0A1F' },
        ]}
      >
        {tier}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  base: {
    borderRadius: 999,
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  small: { paddingVertical: 4, paddingHorizontal: 10 },
  large: { paddingVertical: 8, paddingHorizontal: 18 },
  holoOutline: {
    borderColor: '#fff',
    borderWidth: 2,
    shadowColor: '#C24DFF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.7,
    shadowRadius: 14,
    elevation: 8,
  },
  label: {
    fontFamily: fonts.display,
    fontWeight: '900',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
});
