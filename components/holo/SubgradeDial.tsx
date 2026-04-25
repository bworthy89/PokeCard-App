import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, fonts } from '../../theme';
import { FillBar } from './FillBar';

interface Props {
  label: string;
  value: number;
  accent: string;
}

export const SubgradeDial = ({ label, value, accent }: Props) => {
  const pct = (value / 10) * 100;
  return (
    <View style={styles.card}>
      <View style={styles.row}>
        <Text style={styles.label}>{label.toUpperCase()}</Text>
        <Text style={[styles.value, { color: accent }]}>{value}</Text>
      </View>
      <FillBar pct={pct} color={accent} style={styles.bar} />
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.bg1,
    borderColor: colors.line,
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
  },
  row: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  label: {
    fontFamily: fonts.monoBlack,
    fontSize: 11,
    fontWeight: '800',
    color: colors.ink2,
    letterSpacing: 0.6,
  },
  value: {
    fontFamily: fonts.display,
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  bar: { marginTop: 8 },
});
