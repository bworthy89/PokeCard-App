import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { energy, EnergyType, fonts } from '../../theme';

interface Props {
  type: EnergyType;
  size?: 'sm' | 'md';
}

export const EnergyChip = ({ type, size = 'md' }: Props) => {
  const t = energy[type] ?? energy.psychic;
  const small = size === 'sm';
  return (
    <View
      style={[
        styles.chip,
        {
          backgroundColor: t.color,
          paddingVertical: small ? 4 : 6,
          paddingHorizontal: small ? 8 : 10,
          shadowColor: t.color,
        },
      ]}
    >
      <Text style={styles.glyph}>{t.glyph}</Text>
      <Text
        style={[
          styles.name,
          { fontSize: small ? 10 : 11 },
        ]}
      >
        {t.name.toUpperCase()}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 999,
    alignSelf: 'flex-start',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 3,
  },
  glyph: { fontSize: 12 },
  name: {
    color: '#0A0A1F',
    fontFamily: fonts.monoBlack,
    fontWeight: '900',
    letterSpacing: 0.6,
  },
});
