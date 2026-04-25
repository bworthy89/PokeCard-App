import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Animated,
  Easing,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Path } from 'react-native-svg';
import { signInAnonymously } from '../services/firebase';
import {
  HoloBackground,
  DotGrid,
  BurstSpinner,
  CardArt,
} from './holo';
import { colors, fonts, energy } from '../theme';

type Mode = 'signin' | 'signup';

interface FloatProps {
  delay?: number;
  amplitude?: number;
  duration?: number;
  children: React.ReactNode;
}

const FloatLoop = ({ delay = 0, amplitude = 6, duration = 3200, children }: FloatProps) => {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(v, {
          toValue: 1,
          duration,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(v, {
          toValue: 0,
          duration,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [v, delay, duration]);
  const ty = v.interpolate({ inputRange: [0, 1], outputRange: [0, -amplitude] });
  return <Animated.View style={{ transform: [{ translateY: ty }] }}>{children}</Animated.View>;
};

interface Props {
  onSignedIn?: () => void;
}

export const LoginScreen = ({ onSignedIn }: Props) => {
  const [mode, setMode] = useState<Mode>('signin');
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const slide = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(slide, {
      toValue: 1,
      duration: 480,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [slide]);

  const goAuth = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await signInAnonymously();
      onSignedIn?.();
    } catch (e) {
      console.error('Sign-in failed:', e);
      const message =
        e instanceof Error && e.message
          ? e.message
          : 'Please check your connection and try again.';
      Alert.alert('Sign-in failed', message);
    } finally {
      setBusy(false);
    }
  };

  const sheetTranslate = slide.interpolate({ inputRange: [0, 1], outputRange: [40, 0] });
  const sheetOpacity = slide;

  return (
    <HoloBackground>
      <DotGrid />

      {/* Burst behind cards */}
      <View style={styles.heroBurst} pointerEvents="none">
        <BurstSpinner size={360} rays={20} opacity={0.1} speed={20000} />
      </View>

      {/* Floating cards */}
      <View style={styles.cardStack} pointerEvents="none">
        <View style={[styles.cardSlot, styles.cardLeft]}>
          <FloatLoop delay={200} amplitude={5}>
            <View style={styles.cardLeftTilt}>
              <CardArt type="fire" name="Volcyon" width={110} />
            </View>
          </FloatLoop>
        </View>
        <View style={[styles.cardSlot, styles.cardRight]}>
          <FloatLoop delay={600} amplitude={6}>
            <View style={styles.cardRightTilt}>
              <CardArt type="water" name="Hydraqua" width={110} />
            </View>
          </FloatLoop>
        </View>
        <View style={[styles.cardSlot, styles.cardCenter]}>
          <FloatLoop delay={0} amplitude={8} duration={3600}>
            <CardArt type="psychic" name="Mythara" width={130} holo />
          </FloatLoop>
        </View>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.kav}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Animated.View
            style={[
              styles.sheet,
              {
                transform: [{ translateY: sheetTranslate }],
                opacity: sheetOpacity,
              },
            ]}
          >
            <LinearGradient
              colors={['transparent', colors.bg0]}
              start={{ x: 0.5, y: 0 }}
              end={{ x: 0.5, y: 0.4 }}
              style={styles.sheetGradient}
              pointerEvents="none"
            />
            <View style={styles.titleWrap}>
              <Text style={styles.title}>
                Grade<Text style={{ color: energy.electric.color }}>.</Text>Track
                <Text style={{ color: energy.psychic.color }}>.</Text>Flex
                <Text style={{ color: energy.fire.color }}>.</Text>
              </Text>
              <Text style={styles.subtitle}>AI grades your cards in seconds.</Text>
            </View>

            {/* Mode toggle */}
            <View style={styles.modeToggle}>
              {(['signin', 'signup'] as const).map((k) => {
                const active = mode === k;
                return (
                  <TouchableOpacity
                    key={k}
                    activeOpacity={0.85}
                    onPress={() => setMode(k)}
                    style={[
                      styles.modeBtn,
                      active && {
                        backgroundColor: colors.ink0,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.modeText,
                        { color: active ? '#000' : colors.ink2 },
                      ]}
                    >
                      {k === 'signin' ? 'SIGN IN' : 'CREATE ACCOUNT'}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Social */}
            <TouchableOpacity activeOpacity={0.85} onPress={goAuth} style={styles.socialLight}>
              <Svg width={18} height={18} viewBox="0 0 24 24">
                <Path
                  d="M21.35 11.1h-9.17v2.74h5.27c-.23 1.42-1.69 4.16-5.27 4.16-3.17 0-5.76-2.62-5.76-5.85s2.59-5.85 5.76-5.85c1.8 0 3.01.77 3.7 1.43l2.52-2.43C16.97 3.84 14.78 3 12.18 3 7.07 3 3 7.07 3 12s4.07 9 9.18 9c5.3 0 8.82-3.73 8.82-8.97 0-.6-.07-1.06-.15-1.93z"
                  fill="#000"
                />
              </Svg>
              <Text style={styles.socialLightText}>Continue with Google</Text>
            </TouchableOpacity>

            <TouchableOpacity activeOpacity={0.85} onPress={goAuth} style={styles.socialDark}>
              <Svg width={18} height={18} viewBox="0 0 24 24" fill={colors.ink0}>
                <Path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
              </Svg>
              <Text style={styles.socialDarkText}>Continue with Apple</Text>
            </TouchableOpacity>

            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>OR</Text>
              <View style={styles.dividerLine} />
            </View>

            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="trainer@email.com"
              placeholderTextColor={colors.ink4}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              style={styles.input}
            />

            <TouchableOpacity
              activeOpacity={0.85}
              onPress={goAuth}
              disabled={busy}
              style={styles.popBtn}
            >
              <Text style={styles.popBtnText}>
                {busy
                  ? 'Signing in…'
                  : mode === 'signin'
                  ? 'Enter the Arena →'
                  : 'Start trading →'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity activeOpacity={0.85} onPress={goAuth} style={styles.guest}>
              <Text style={styles.guestText}>Skip — try as guest</Text>
            </TouchableOpacity>

            <Text style={styles.legal}>
              By continuing you agree to our Terms & Privacy Policy.
            </Text>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </HoloBackground>
  );
};

const styles = StyleSheet.create({
  heroBurst: {
    position: 'absolute',
    top: '5%',
    alignSelf: 'center',
    opacity: 0.5,
  },
  cardStack: {
    position: 'absolute',
    top: '12%',
    left: 0,
    right: 0,
    height: 230,
  },
  cardSlot: {
    position: 'absolute',
  },
  cardLeft: { left: '12%', top: 30 },
  cardRight: { right: '12%', top: 50 },
  cardCenter: { left: '50%', top: 0, transform: [{ translateX: -65 }] },
  cardLeftTilt: { transform: [{ rotate: '-14deg' }] },
  cardRightTilt: { transform: [{ rotate: '12deg' }] },

  kav: { flex: 1 },
  scroll: { flexGrow: 1, justifyContent: 'flex-end' },

  sheet: {
    paddingHorizontal: 20,
    paddingTop: 28,
    paddingBottom: 36,
    position: 'relative',
  },
  sheetGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: -60,
    height: 100,
  },
  titleWrap: {
    alignItems: 'center',
    marginBottom: 18,
  },
  title: {
    fontFamily: fonts.display,
    color: colors.ink0,
    fontSize: 38,
    fontWeight: '800',
    letterSpacing: -1.6,
    lineHeight: 38,
    textAlign: 'center',
  },
  subtitle: {
    fontFamily: fonts.monoBold,
    color: colors.ink2,
    fontSize: 13,
    marginTop: 8,
  },

  modeToggle: {
    flexDirection: 'row',
    backgroundColor: colors.bg1,
    borderRadius: 999,
    padding: 4,
    borderWidth: 1,
    borderColor: colors.lineStrong,
    marginBottom: 14,
  },
  modeBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 999,
    alignItems: 'center',
  },
  modeText: {
    fontFamily: fonts.monoBlack,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.6,
  },

  socialLight: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 14,
    backgroundColor: '#fff',
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#000',
    marginBottom: 8,
  },
  socialLightText: {
    fontFamily: fonts.display,
    color: '#000',
    fontSize: 15,
    fontWeight: '800',
  },
  socialDark: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 14,
    backgroundColor: colors.bg1,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.lineStrong,
  },
  socialDarkText: {
    fontFamily: fonts.display,
    color: colors.ink0,
    fontSize: 15,
    fontWeight: '800',
  },

  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginVertical: 14,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.lineStrong,
  },
  dividerText: {
    fontFamily: fonts.monoBlack,
    color: colors.ink3,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
  },

  input: {
    fontFamily: fonts.body,
    color: colors.ink0,
    fontSize: 15,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: colors.bg1,
    borderWidth: 1,
    borderColor: colors.lineStrong,
    marginBottom: 10,
  },

  popBtn: {
    paddingVertical: 14,
    borderRadius: 999,
    backgroundColor: energy.electric.color,
    borderWidth: 2,
    borderColor: '#000',
    alignItems: 'center',
  },
  popBtnText: {
    fontFamily: fonts.display,
    color: '#000',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: -0.2,
  },

  guest: {
    alignItems: 'center',
    paddingVertical: 12,
    marginTop: 4,
  },
  guestText: {
    fontFamily: fonts.monoBold,
    color: colors.ink2,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.4,
    textDecorationLine: 'underline',
  },

  legal: {
    fontFamily: fonts.mono,
    color: colors.ink4,
    fontSize: 10,
    textAlign: 'center',
    marginTop: 10,
    lineHeight: 15,
  },
});
