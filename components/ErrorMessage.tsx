import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { ErrorType } from '../types';

const ERROR_MESSAGES: Record<ErrorType, { title: string; message: string }> = {
  blurry_image: { title: 'Unclear Image', message: "We couldn't get a clear read. Try again with better lighting and hold the phone steady." },
  not_pokemon_card: { title: 'Not Recognized', message: "That doesn't look like a Pokemon card. Make sure the full card is in frame." },
  network_error: { title: 'No Connection', message: 'No internet connection. Check your connection and try again.' },
  camera_permission_denied: { title: 'Camera Access Needed', message: 'PokeGrade needs camera access to scan your cards. Please enable it in Settings.' },
  quota_exceeded: { title: 'Too Busy', message: "We're busy right now. Try again in a few minutes." },
  card_not_found: { title: 'Card Not Found', message: 'Card not found in database. Grading results are still shown.' },
  unknown: { title: 'Something Went Wrong', message: 'An unexpected error occurred. Please try again.' },
};

interface Props { errorType: ErrorType; onRetry: () => void; }

export const ErrorMessage = ({ errorType, onRetry }: Props) => {
  const { title, message } = ERROR_MESSAGES[errorType];
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.message}>{message}</Text>
      <TouchableOpacity style={styles.button} onPress={onRetry}>
        <Text style={styles.buttonText}>Try Again</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0d0d1a', alignItems: 'center', justifyContent: 'center', padding: 32 },
  title: { color: '#fff', fontSize: 22, fontWeight: '700', marginBottom: 12 },
  message: { color: '#888', fontSize: 15, textAlign: 'center', lineHeight: 22, marginBottom: 32 },
  button: { backgroundColor: '#FFD700', paddingHorizontal: 32, paddingVertical: 14, borderRadius: 12 },
  buttonText: { color: '#000', fontSize: 16, fontWeight: '700' },
});
