import React from 'react';
import { View, StyleSheet, ViewStyle, StyleProp } from 'react-native';
import { energy } from '../../theme';

interface Props {
  pct: number;
  color?: string;
  height?: number;
  style?: StyleProp<ViewStyle>;
}

export const FillBar = ({ pct, color = energy.electric.color, height = 8, style }: Props) => {
  const safePct = Number.isFinite(pct) ? pct : 0;
  const clamped = Math.max(0, Math.min(100, safePct));
  return (
    <View style={[styles.track, { height }, style]}>
      <View
        style={[
          styles.fill,
          {
            width: `${clamped}%`,
            backgroundColor: color,
            shadowColor: color,
          },
        ]}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  track: {
    width: '100%',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 999,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 999,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.7,
    shadowRadius: 6,
    elevation: 3,
  },
});
