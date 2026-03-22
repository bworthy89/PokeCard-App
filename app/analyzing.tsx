import React, { useEffect } from 'react';
import { View, Text, Image, ActivityIndicator, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useScan } from '../contexts/ScanContext';
import { scanCard } from '../services/scanCard';
import { InterstitialAd, AdEventType, TestIds } from 'react-native-google-mobile-ads';

const interstitialAdUnitId = __DEV__
  ? TestIds.INTERSTITIAL
  : 'YOUR_PRODUCTION_INTERSTITIAL_ID';

export default function AnalyzingScreen() {
  const router = useRouter();
  const {
    imageUri,
    setScanResult,
    setScanError,
    scanCount,
    incrementScanCount,
  } = useScan();

  useEffect(() => {
    if (!imageUri) {
      router.replace('/');
      return;
    }

    const analyze = async () => {
      // Show interstitial every 3rd scan
      if (scanCount > 0 && scanCount % 3 === 0) {
        try {
          const interstitial = InterstitialAd.createForAdRequest(interstitialAdUnitId);
          await new Promise<void>((resolve) => {
            interstitial.addAdEventListener(AdEventType.LOADED, () => {
              interstitial.show();
            });
            interstitial.addAdEventListener(AdEventType.CLOSED, () => {
              resolve();
            });
            interstitial.addAdEventListener(AdEventType.ERROR, () => {
              resolve(); // Don't block on ad failure
            });
            interstitial.load();
            // Timeout after 5 seconds if ad doesn't load
            setTimeout(resolve, 5000);
          });
        } catch {
          // Ad failure shouldn't block scanning
        }
      }

      const { result, error } = await scanCard(imageUri);
      incrementScanCount();

      if (error) {
        setScanError(error);
      }
      if (result) {
        setScanResult(result);
      }
      router.replace('/results');
    };

    analyze();
  }, [imageUri]);

  return (
    <View style={styles.container}>
      {imageUri && (
        <Image source={{ uri: imageUri }} style={styles.thumbnail} />
      )}
      <ActivityIndicator size="large" color="#FFD700" style={styles.spinner} />
      <Text style={styles.title}>Analyzing card...</Text>
      <Text style={styles.subtitle}>
        Checking corners, edges, centering & surface
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0d0d1a',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  thumbnail: {
    width: 120,
    height: 168,
    borderRadius: 8,
    marginBottom: 24,
  },
  spinner: {
    marginBottom: 16,
  },
  title: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
  },
  subtitle: {
    color: '#888',
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
});
