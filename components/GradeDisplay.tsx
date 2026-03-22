import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const TIER_COLORS: Record<string, string> = {
  'Gem Mint': '#22c55e',
  'Near Mint': '#4ade80',
  'Lightly Played': '#facc15',
  'Moderately Played': '#f97316',
  'Heavily Played': '#ef4444',
};

interface Props { tier: string; estimatedPSA: string; }

export const GradeDisplay = ({ tier, estimatedPSA }: Props) => {
  const color = TIER_COLORS[tier] || '#888';
  return (
    <View style={[styles.container, { borderColor: color }]}>
      <Text style={[styles.tier, { color }]}>{tier}</Text>
      <Text style={styles.psa}>Est. PSA {estimatedPSA}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { backgroundColor: 'rgba(0, 0, 0, 0.3)', borderWidth: 1, borderRadius: 12, padding: 16, alignItems: 'center' },
  tier: { fontSize: 24, fontWeight: '700' },
  psa: { color: '#888', fontSize: 12, marginTop: 4 },
});
