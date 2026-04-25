import React, { ReactNode } from 'react';
import { View, Text, StyleSheet, ViewStyle, TextStyle, StyleProp } from 'react-native';
import { colors, fonts } from '../../theme';

interface Props {
  children: ReactNode;
  background?: string;
  borderColor?: string;
  textColor?: string;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
}

export const Chip = ({
  children,
  background = 'rgba(255,255,255,0.04)',
  borderColor = colors.lineStrong,
  textColor = colors.ink1,
  style,
  textStyle,
}: Props) => (
  <View style={[styles.chip, { backgroundColor: background, borderColor }, style]}>
    <Text style={[styles.text, { color: textColor }, textStyle]}>{children}</Text>
  </View>
);

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  text: {
    fontFamily: fonts.monoBold,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
});
