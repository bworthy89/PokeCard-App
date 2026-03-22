import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface Props { centering: number; corners: number; edges: number; surface: number; }

const getScoreColor = (score: number): string => {
  if (score >= 9) return '#22c55e';
  if (score >= 7) return '#facc15';
  if (score >= 5) return '#f97316';
  return '#ef4444';
};

const SubgradeCell = ({ label, score }: { label: string; score: number }) => (
  <View style={styles.cell}>
    <Text style={styles.label}>{label}</Text>
    <Text style={[styles.score, { color: getScoreColor(score) }]}>{score}</Text>
  </View>
);

export const SubgradeGrid = ({ centering, corners, edges, surface }: Props) => (
  <View style={styles.grid}>
    <SubgradeCell label="CENTERING" score={centering} />
    <SubgradeCell label="CORNERS" score={corners} />
    <SubgradeCell label="EDGES" score={edges} />
    <SubgradeCell label="SURFACE" score={surface} />
  </View>
);

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  cell: { flex: 1, minWidth: '45%', backgroundColor: 'rgba(0, 100, 0, 0.15)', borderRadius: 8, padding: 12, alignItems: 'center' },
  label: { color: '#888', fontSize: 10, fontWeight: '600', letterSpacing: 1 },
  score: { fontSize: 20, fontWeight: '700', marginTop: 4 },
});
