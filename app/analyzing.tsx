import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  Animated,
  Easing,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { useRouter } from 'expo-router';
import { useScan } from '../contexts/ScanContext';
import { scanCard } from '../services/scanCard';
import { InterstitialAd, AdEventType, TestIds } from 'react-native-google-mobile-ads';
import {
  HoloBackground,
  DotGrid,
  BurstSpinner,
} from '../components/holo';
import { colors, fonts, energy } from '../theme';

const interstitialAdUnitId = __DEV__
  ? TestIds.INTERSTITIAL
  : 'YOUR_PRODUCTION_INTERSTITIAL_ID';

const CHECKS = ['Centering', 'Corners', 'Edges', 'Surface'] as const;
const RING_COLORS = [energy.electric.color, energy.psychic.color, energy.grass.color];

export default function AnalyzingScreen() {
  const router = useRouter();
  const {
    imageUri,
    setScanResult,
    setScanError,
    scanCount,
    incrementScanCount,
  } = useScan();

  const [step, setStep] = useState(0);
  const [backendDone, setBackendDone] = useState(false);

  const ringValues = useRef(RING_COLORS.map(() => new Animated.Value(0))).current;

  useEffect(() => {
    const loops = ringValues.map((v, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(i * 400),
          Animated.timing(v, {
            toValue: 1,
            duration: 1600,
            easing: Easing.out(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      )
    );
    loops.forEach((l) => l.start());
    return () => loops.forEach((l) => l.stop());
  }, [ringValues]);

  useEffect(() => {
    if (step >= CHECKS.length) return;
    const t = setTimeout(() => setStep((s) => s + 1), 700);
    return () => clearTimeout(t);
  }, [step]);

  useEffect(() => {
    if (!imageUri) {
      router.replace('/');
      return;
    }

    const analyze = async () => {
      if (scanCount > 0 && scanCount % 3 === 0) {
        try {
          const interstitial = InterstitialAd.createForAdRequest(interstitialAdUnitId);
          await new Promise<void>((resolve) => {
            interstitial.addAdEventListener(AdEventType.LOADED, () => {
              interstitial.show();
            });
            interstitial.addAdEventListener(AdEventType.CLOSED, () => resolve());
            interstitial.addAdEventListener(AdEventType.ERROR, () => resolve());
            interstitial.load();
            setTimeout(resolve, 5000);
          });
        } catch {
          // Ad failure shouldn't block scanning
        }
      }

      const { result, error } = await scanCard(imageUri);
      incrementScanCount();
      if (error) setScanError(error);
      if (result) setScanResult(result);
      setBackendDone(true);
    };

    analyze();
  }, [imageUri]);

  useEffect(() => {
    if (backendDone && step >= CHECKS.length) {
      const t = setTimeout(() => router.replace('/results'), 600);
      return () => clearTimeout(t);
    }
  }, [backendDone, step, router]);

  return (
    <HoloBackground>
      <DotGrid />

      {/* Spinning bursts */}
      <View pointerEvents="none" style={styles.burstWrap}>
        <BurstSpinner size={300} rays={20} opacity={0.06} speed={12000} />
        <View style={StyleSheet.absoluteFill}>
          <BurstSpinner size={300} rays={14} opacity={0.04} speed={9000} reverse />
        </View>
      </View>

      {/* Card with energy rings */}
      <View style={styles.cardWrap} pointerEvents="none">
        {ringValues.map((v, i) => {
          const scale = v.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1.45] });
          const opacity = v.interpolate({ inputRange: [0, 1], outputRange: [0.7, 0] });
          return (
            <Animated.View
              key={i}
              style={[
                styles.ring,
                {
                  borderColor: RING_COLORS[i],
                  transform: [{ scale }],
                  opacity,
                },
              ]}
            />
          );
        })}
        {imageUri && (
          <Image
            source={{ uri: imageUri }}
            style={styles.cardImage}
            resizeMode="cover"
          />
        )}
      </View>

      {/* Bottom panel */}
      <View style={styles.bottomPanel}>
        <Text style={styles.title}>Reading aura…</Text>
        <Text style={styles.sub}>AI grader • 4 dimensions • PSA estimate</Text>

        <View style={styles.checklist}>
          {CHECKS.map((c, i) => {
            const done = i < step;
            const active = i === step;
            return (
              <View
                key={c}
                style={[
                  styles.checkRow,
                  i < CHECKS.length - 1 && styles.checkRowBorder,
                ]}
              >
                <View
                  style={[
                    styles.checkBubble,
                    done && {
                      backgroundColor: energy.grass.color,
                      borderColor: energy.grass.color,
                    },
                  ]}
                >
                  {done ? (
                    <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
                      <Path
                        d="M5 12l5 5L20 7"
                        stroke="#000"
                        strokeWidth={3}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </Svg>
                  ) : active ? (
                    <View style={styles.checkActiveDot} />
                  ) : null}
                </View>
                <Text
                  style={[
                    styles.checkLabel,
                    done
                      ? { color: colors.ink0 }
                      : active
                      ? { color: colors.ink1 }
                      : { color: colors.ink3 },
                  ]}
                >
                  {c}
                </Text>
                <Text
                  style={[
                    styles.checkStatus,
                    done
                      ? { color: energy.grass.color }
                      : active
                      ? { color: energy.electric.color }
                      : { color: colors.ink3 },
                  ]}
                >
                  {done ? '✓ DONE' : active ? 'SCAN…' : 'WAIT'}
                </Text>
              </View>
            );
          })}
        </View>
      </View>
    </HoloBackground>
  );
}

const styles = StyleSheet.create({
  burstWrap: {
    position: 'absolute',
    top: '20%',
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  cardWrap: {
    position: 'absolute',
    top: '14%',
    left: 0,
    right: 0,
    height: 260,
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  ring: {
    position: 'absolute',
    top: 0,
    width: 200,
    height: 260,
    borderRadius: 24,
    borderWidth: 3,
  },
  cardImage: {
    width: 180,
    height: 252,
    borderRadius: 14,
    backgroundColor: colors.bg1,
  },
  bottomPanel: {
    position: 'absolute',
    bottom: 70,
    left: 0,
    right: 0,
    paddingHorizontal: 24,
  },
  title: {
    fontFamily: fonts.display,
    fontWeight: '800',
    color: colors.ink0,
    fontSize: 28,
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  sub: {
    fontFamily: fonts.monoBold,
    color: colors.ink2,
    fontSize: 13,
    textAlign: 'center',
    marginTop: 6,
    marginBottom: 22,
  },
  checklist: {
    backgroundColor: colors.bg1,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.lineStrong,
    padding: 14,
  },
  checkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
  },
  checkRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
    borderStyle: 'dashed',
  },
  checkBubble: {
    width: 28,
    height: 28,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 2,
    borderColor: colors.lineStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkActiveDot: {
    width: 8,
    height: 8,
    borderRadius: 999,
    backgroundColor: energy.electric.color,
    shadowColor: energy.electric.color,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 6,
    elevation: 4,
  },
  checkLabel: {
    flex: 1,
    fontFamily: fonts.display,
    fontWeight: '700',
    fontSize: 14,
  },
  checkStatus: {
    fontFamily: fonts.monoBold,
    fontWeight: '700',
    fontSize: 11,
  },
});
