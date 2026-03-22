import React from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';

const { width: screenWidth } = Dimensions.get('window');
const CARD_RATIO = 3.5 / 2.5;
const GUIDE_WIDTH = screenWidth * 0.7;
const GUIDE_HEIGHT = GUIDE_WIDTH * CARD_RATIO;

export const CardAlignmentGuide = () => (
  <View style={styles.container} pointerEvents="none">
    <View style={styles.guide}>
      <View style={[styles.corner, styles.topLeft]} />
      <View style={[styles.corner, styles.topRight]} />
      <View style={[styles.corner, styles.bottomLeft]} />
      <View style={[styles.corner, styles.bottomRight]} />
    </View>
  </View>
);

const CORNER_SIZE = 24;
const CORNER_BORDER = 3;

const styles = StyleSheet.create({
  container: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  guide: { width: GUIDE_WIDTH, height: GUIDE_HEIGHT, borderRadius: 12, borderWidth: 2, borderColor: 'rgba(255, 215, 0, 0.5)', borderStyle: 'dashed' },
  corner: { position: 'absolute', width: CORNER_SIZE, height: CORNER_SIZE },
  topLeft: { top: -1, left: -1, borderTopWidth: CORNER_BORDER, borderLeftWidth: CORNER_BORDER, borderColor: '#FFD700', borderTopLeftRadius: 12 },
  topRight: { top: -1, right: -1, borderTopWidth: CORNER_BORDER, borderRightWidth: CORNER_BORDER, borderColor: '#FFD700', borderTopRightRadius: 12 },
  bottomLeft: { bottom: -1, left: -1, borderBottomWidth: CORNER_BORDER, borderLeftWidth: CORNER_BORDER, borderColor: '#FFD700', borderBottomLeftRadius: 12 },
  bottomRight: { bottom: -1, right: -1, borderBottomWidth: CORNER_BORDER, borderRightWidth: CORNER_BORDER, borderColor: '#FFD700', borderBottomRightRadius: 12 },
});
