import React, { ReactNode } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { colors, fonts } from '../../theme';

interface Props {
  title?: string;
  onBack?: () => void;
  right?: ReactNode;
}

export const ScreenHeader = ({ title, onBack, right }: Props) => (
  <View style={styles.row}>
    {onBack ? (
      <TouchableOpacity onPress={onBack} style={styles.iconButton} accessibilityRole="button" accessibilityLabel="Back">
        <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
          <Path d="M15 18l-6-6 6-6" stroke={colors.ink0} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
        </Svg>
      </TouchableOpacity>
    ) : (
      <View style={styles.spacer} />
    )}
    {title ? <Text style={styles.title}>{title}</Text> : <View />}
    {right ?? <View style={styles.spacer} />}
  </View>
);

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 14,
    zIndex: 4,
  },
  iconButton: {
    width: 38,
    height: 38,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: colors.lineStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  spacer: { width: 38 },
  title: {
    color: colors.ink0,
    fontFamily: fonts.display,
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.4,
  },
});
