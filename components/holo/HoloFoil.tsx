import React, { ReactNode } from 'react';
import { ViewStyle, StyleProp } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { HOLO_FOIL_COLORS } from '../../theme';

interface Props {
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
}

export const HoloFoil = ({ children, style }: Props) => (
  <LinearGradient
    colors={HOLO_FOIL_COLORS}
    start={{ x: 0, y: 0 }}
    end={{ x: 1, y: 1 }}
    style={style}
  >
    {children}
  </LinearGradient>
);
