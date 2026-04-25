import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { ErrorType } from '../types';
import { HoloBackground } from './holo';
import { colors, fonts, energy } from '../theme';

const ERROR_MESSAGES: Record<ErrorType, { title: string; message: string; glyph: string; color: string }> = {
  blurry_image: {
    title: 'Unclear Image',
    message: "We couldn't get a clear read. Try again with better lighting and hold the phone steady.",
    glyph: '◌',
    color: energy.water.color,
  },
  not_pokemon_card: {
    title: 'Not Recognized',
    message: "That doesn't look like a card we know. Make sure the full card is in frame.",
    glyph: '?',
    color: energy.psychic.color,
  },
  network_error: {
    title: 'No Connection',
    message: 'No internet connection. Check your connection and try again.',
    glyph: '✕',
    color: energy.fighting.color,
  },
  camera_permission_denied: {
    title: 'Camera Access Needed',
    message: 'PokeGrade needs camera access to scan your cards. Enable it in Settings.',
    glyph: '◉',
    color: energy.electric.color,
  },
  quota_exceeded: {
    title: 'Too Busy',
    message: "We're busy right now. Try again in a few minutes.",
    glyph: '◐',
    color: energy.fairy.color,
  },
  card_not_found: {
    title: 'Card Not Found',
    message: 'Card not found in database. Grading results are still shown.',
    glyph: '⚐',
    color: energy.steel.color,
  },
  unknown: {
    title: 'Something Went Wrong',
    message: 'An unexpected error occurred. Please try again.',
    glyph: '!',
    color: energy.fire.color,
  },
};

interface Props {
  errorType: ErrorType;
  onRetry: () => void;
}

export const ErrorMessage = ({ errorType, onRetry }: Props) => {
  const { title, message, glyph, color } = ERROR_MESSAGES[errorType];
  return (
    <HoloBackground>
      <View style={styles.center}>
        <View style={[styles.glyphRing, { borderColor: color, shadowColor: color }]}>
          <Text style={[styles.glyph, { color }]}>{glyph}</Text>
        </View>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.message}>{message}</Text>
        <TouchableOpacity activeOpacity={0.85} onPress={onRetry} style={styles.button}>
          <Text style={styles.buttonText}>Try Again</Text>
        </TouchableOpacity>
      </View>
    </HoloBackground>
  );
};

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  glyphRing: {
    width: 80,
    height: 80,
    borderRadius: 999,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 22,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 16,
    elevation: 8,
  },
  glyph: {
    fontFamily: fonts.display,
    fontSize: 36,
    fontWeight: '800',
  },
  title: {
    fontFamily: fonts.display,
    color: colors.ink0,
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: -0.5,
    marginBottom: 10,
    textAlign: 'center',
  },
  message: {
    fontFamily: fonts.body,
    color: colors.ink2,
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: 28,
  },
  button: {
    backgroundColor: energy.electric.color,
    borderWidth: 2,
    borderColor: '#000',
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 999,
  },
  buttonText: {
    fontFamily: fonts.display,
    color: '#000',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
});
