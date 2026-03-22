import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useScan } from '../contexts/ScanContext';
import { CardPreview } from '../components/CardPreview';
import { GradeDisplay } from '../components/GradeDisplay';
import { SubgradeGrid } from '../components/SubgradeGrid';
import { PriceRange } from '../components/PriceRange';
import { ErrorMessage } from '../components/ErrorMessage';
import { AdBanner } from '../components/AdBanner';
import { saveCard } from '../services/collection';

export default function ResultsScreen() {
  const router = useRouter();
  const { scanResult, scanError, reset } = useScan();
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  if (scanError && scanError !== 'card_not_found') {
    return (
      <ErrorMessage
        errorType={scanError}
        onRetry={() => {
          reset();
          router.replace('/');
        }}
      />
    );
  }

  if (!scanResult) {
    return (
      <ErrorMessage
        errorType="unknown"
        onRetry={() => {
          reset();
          router.replace('/');
        }}
      />
    );
  }

  const { grading, price, cardArtworkUrl } = scanResult;

  const handleSave = async () => {
    setSaving(true);
    try {
      await saveCard(scanResult);
      setSaved(true);
    } catch (error) {
      Alert.alert('Error', 'Failed to save card. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleScanAnother = () => {
    reset();
    router.replace('/');
  };

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <CardPreview
          cardName={grading.cardName}
          setName={grading.setName}
          setNumber={grading.setNumber}
          imageUrl={cardArtworkUrl}
        />

        {scanError === 'card_not_found' && (
          <Text style={styles.warning}>Card not found in database</Text>
        )}

        <GradeDisplay tier={grading.overallTier} estimatedPSA={grading.estimatedPSA} />

        <SubgradeGrid
          centering={grading.centering}
          corners={grading.corners}
          edges={grading.edges}
          surface={grading.surface}
        />

        <View style={styles.explanationBox}>
          <Text style={styles.explanation}>{grading.explanation}</Text>
        </View>

        <PriceRange price={price} />

        <Text style={styles.disclaimer}>
          Estimates only — not a substitute for professional grading. Prices are approximate and may not reflect current market value.
        </Text>

        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.saveButton, saved && styles.savedButton]}
            onPress={handleSave}
            disabled={saving || saved}
          >
            <Text style={styles.saveButtonText}>
              {saved ? 'Saved!' : saving ? 'Saving...' : 'Save to Collection'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.scanButton} onPress={handleScanAnother}>
            <Text style={styles.scanButtonText}>Scan Another</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <AdBanner />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0d0d1a',
  },
  scroll: {
    flex: 1,
  },
  content: {
    padding: 20,
    paddingTop: 60,
    gap: 16,
  },
  warning: {
    color: '#facc15',
    fontSize: 13,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  explanationBox: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 8,
    padding: 12,
  },
  explanation: {
    color: '#ccc',
    fontSize: 14,
    lineHeight: 20,
  },
  disclaimer: {
    color: '#555',
    fontSize: 11,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  saveButton: {
    flex: 1,
    backgroundColor: '#FFD700',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  savedButton: {
    backgroundColor: '#22c55e',
  },
  saveButtonText: {
    color: '#000',
    fontSize: 15,
    fontWeight: '700',
  },
  scanButton: {
    flex: 1,
    backgroundColor: '#1a1a2e',
    borderWidth: 1,
    borderColor: '#333',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  scanButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
});
