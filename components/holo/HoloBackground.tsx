import React from 'react';
import { View, ViewProps, StyleSheet } from 'react-native';
import Svg, { Defs, RadialGradient, Stop, Rect } from 'react-native-svg';
import { colors } from '../../theme';

export const HoloBackground = ({ children, style, ...rest }: ViewProps) => (
  <View style={[styles.fill, style]} {...rest}>
    <Svg style={StyleSheet.absoluteFillObject} pointerEvents="none">
      <Defs>
        <RadialGradient id="hg1" cx="20%" cy="10%" rx="60%" ry="60%" fx="20%" fy="10%">
          <Stop offset="0%" stopColor="#C24DFF" stopOpacity={0.18} />
          <Stop offset="100%" stopColor="#C24DFF" stopOpacity={0} />
        </RadialGradient>
        <RadialGradient id="hg2" cx="80%" cy="30%" rx="60%" ry="60%" fx="80%" fy="30%">
          <Stop offset="0%" stopColor="#3DA5FF" stopOpacity={0.18} />
          <Stop offset="100%" stopColor="#3DA5FF" stopOpacity={0} />
        </RadialGradient>
        <RadialGradient id="hg3" cx="50%" cy="90%" rx="70%" ry="70%" fx="50%" fy="90%">
          <Stop offset="0%" stopColor="#FF7AB6" stopOpacity={0.14} />
          <Stop offset="100%" stopColor="#FF7AB6" stopOpacity={0} />
        </RadialGradient>
      </Defs>
      <Rect width="100%" height="100%" fill="url(#hg1)" />
      <Rect width="100%" height="100%" fill="url(#hg2)" />
      <Rect width="100%" height="100%" fill="url(#hg3)" />
    </Svg>
    {children}
  </View>
);

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: colors.bg0 },
});
