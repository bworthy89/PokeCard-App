import React from 'react';
import { View, Text, Image, StyleSheet, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Line } from 'react-native-svg';
import { energy, EnergyType, fonts, HOLO_FOIL_COLORS } from '../../theme';

interface Props {
  type: EnergyType;
  name?: string;
  imageUrl?: string | null;
  holo?: boolean;
  tilted?: boolean;
  width?: number;
  style?: ViewStyle;
}

export const CardArt = ({
  type,
  name = '',
  imageUrl,
  holo = false,
  tilted = false,
  width,
  style,
}: Props) => {
  const t = energy[type] ?? energy.psychic;
  const containerStyle: ViewStyle = {
    width,
    aspectRatio: 2.5 / 3.5,
    borderRadius: 14,
    overflow: 'hidden',
    transform: tilted
      ? [{ perspective: 700 }, { rotateY: '-8deg' }, { rotateX: '6deg' }]
      : undefined,
  };

  return (
    <View style={[styles.shadow, containerStyle, style]}>
      {imageUrl ? (
        <Image source={{ uri: imageUrl }} style={StyleSheet.absoluteFillObject} resizeMode="cover" />
      ) : (
        <LinearGradient
          colors={[t.color, 'rgba(0,0,0,0.6)']}
          start={{ x: 0.2, y: 0 }}
          end={{ x: 0.8, y: 1 }}
          style={StyleSheet.absoluteFillObject}
        >
          <View style={styles.bigGlyph} pointerEvents="none">
            <Text style={styles.bigGlyphText}>{name?.[0]?.toUpperCase() || '?'}</Text>
          </View>
          <Svg style={StyleSheet.absoluteFillObject} viewBox="0 0 100 140" pointerEvents="none">
            {Array.from({ length: 8 }).map((_, i) => {
              const a = i * 0.78;
              return (
                <Line
                  key={i}
                  x1={50}
                  y1={70}
                  x2={50 + Math.cos(a) * 200}
                  y2={70 + Math.sin(a) * 200}
                  stroke="rgba(255,255,255,0.18)"
                  strokeWidth={0.4}
                />
              );
            })}
          </Svg>
        </LinearGradient>
      )}

      {holo && (
        <LinearGradient
          colors={HOLO_FOIL_COLORS}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[StyleSheet.absoluteFillObject, { opacity: 0.45 }]}
          pointerEvents="none"
        />
      )}

      <View style={styles.headerStrip} pointerEvents="none">
        <Text style={styles.headerName} numberOfLines={1}>
          {name}
        </Text>
        <Text style={styles.headerGlyph}>{t.glyph}</Text>
      </View>

      <View style={styles.innerBorder} pointerEvents="none" />
    </View>
  );
};

const styles = StyleSheet.create({
  shadow: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.55,
    shadowRadius: 26,
    elevation: 10,
    backgroundColor: '#0A0A1F',
  },
  innerBorder: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.18)',
  },
  bigGlyph: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bigGlyphText: {
    fontFamily: fonts.display,
    fontWeight: '900',
    color: 'rgba(255,255,255,0.92)',
    fontSize: 96,
    textShadowColor: 'rgba(255,255,255,0.4)',
    textShadowRadius: 20,
  },
  headerStrip: {
    position: 'absolute',
    top: 8,
    left: 8,
    right: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
    paddingHorizontal: 8,
    backgroundColor: 'rgba(0,0,0,0.4)',
    borderRadius: 8,
  },
  headerName: {
    flex: 1,
    color: '#fff',
    fontFamily: fonts.monoBold,
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  headerGlyph: {
    color: '#fff',
    fontSize: 10,
    opacity: 0.7,
    marginLeft: 6,
  },
});
