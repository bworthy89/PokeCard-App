import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { PriceData } from '../types';

interface Props { price: PriceData | null; }

export const PriceRange = ({ price }: Props) => {
  if (!price || (!price.low && !price.market)) {
    return (
      <View style={styles.container}>
        <Text style={styles.label}>ESTIMATED VALUE</Text>
        <Text style={styles.unavailable}>Price unavailable</Text>
        <Text style={styles.hint}>Check TCGPlayer for current pricing</Text>
      </View>
    );
  }

  const marketPrice = price.market ? `$${price.market.toFixed(2)}` : 'N/A';
  const range = price.low && price.high ? `$${price.low.toFixed(2)} - $${price.high.toFixed(2)}` : null;

  return (
    <View style={styles.container}>
      <Text style={styles.label}>ESTIMATED VALUE</Text>
      <Text style={styles.market}>{marketPrice}</Text>
      {range && <Text style={styles.range}>Range: {range}</Text>}
      <Text style={styles.gradingNote}>PSA grading starts at ~$20/card</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { backgroundColor: 'rgba(0, 0, 0, 0.3)', borderWidth: 1, borderColor: '#333', borderRadius: 12, padding: 16 },
  label: { color: '#888', fontSize: 10, fontWeight: '600', letterSpacing: 1 },
  market: { color: '#FFD700', fontSize: 28, fontWeight: '700', marginTop: 4 },
  range: { color: '#888', fontSize: 12, marginTop: 2 },
  gradingNote: { color: '#666', fontSize: 11, marginTop: 8, fontStyle: 'italic' },
  unavailable: { color: '#888', fontSize: 18, fontWeight: '600', marginTop: 4 },
  hint: { color: '#666', fontSize: 11, marginTop: 4 },
});
