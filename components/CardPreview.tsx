import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';

interface Props { cardName: string; setName: string; setNumber: string; imageUrl?: string | null; }

export const CardPreview = ({ cardName, setName, setNumber, imageUrl }: Props) => (
  <View style={styles.container}>
    {imageUrl ? (
      <Image source={{ uri: imageUrl }} style={styles.image} />
    ) : (
      <View style={[styles.image, styles.placeholder]}>
        <Text style={styles.placeholderText}>?</Text>
      </View>
    )}
    <View style={styles.info}>
      <Text style={styles.name} numberOfLines={1}>{cardName}</Text>
      <Text style={styles.set}>{setName} #{setNumber}</Text>
    </View>
  </View>
);

const styles = StyleSheet.create({
  container: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  image: { width: 60, height: 84, borderRadius: 6 },
  placeholder: { backgroundColor: '#1a3a5c', alignItems: 'center', justifyContent: 'center' },
  placeholderText: { color: '#888', fontSize: 24 },
  info: { flex: 1 },
  name: { color: '#fff', fontSize: 18, fontWeight: '700' },
  set: { color: '#888', fontSize: 13, marginTop: 2 },
});
