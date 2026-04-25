import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Animated,
  Easing,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import Svg, { Path } from 'react-native-svg';
import { useScan } from '../contexts/ScanContext';
import { ErrorMessage } from '../components/ErrorMessage';
import { AdBanner } from '../components/AdBanner';
import { saveCard } from '../services/collection';
import {
  HoloBackground,
  ScreenHeader,
  CardArt,
  EnergyChip,
  Chip,
  SubgradeDial,
  HoloFoil,
  Pop,
  Reveal,
} from '../components/holo';
import {
  colors,
  energy,
  fonts,
  tiers,
  Tier,
  inferEnergyType,
} from '../theme';
import { formatPriceCompact } from '../lib/format';

const SUBGRADE_ACCENTS: Array<['Centering' | 'Corners' | 'Edges' | 'Surface', string]> = [
  ['Centering', energy.water.color],
  ['Corners',   energy.grass.color],
  ['Edges',     energy.psychic.color],
  ['Surface',   energy.electric.color],
];

const isKnownTier = (t: string): t is Tier =>
  t === 'Gem Mint' ||
  t === 'Near Mint' ||
  t === 'Lightly Played' ||
  t === 'Moderately Played' ||
  t === 'Heavily Played';

export default function ResultsScreen() {
  const router = useRouter();
  const { scanResult, scanError, reset } = useScan();
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const flash = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!scanResult) return;
    Animated.sequence([
      Animated.timing(flash, {
        toValue: 1,
        duration: 120,
        useNativeDriver: true,
      }),
      Animated.timing(flash, {
        toValue: 0,
        duration: 800,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
    ]).start();
  }, [scanResult, flash]);

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
  const tierKey: Tier = isKnownTier(grading.overallTier) ? grading.overallTier : 'Near Mint';
  const tierMeta = tiers[tierKey];
  const isHolo = tierKey === 'Gem Mint';
  const energyType = inferEnergyType(grading.cardName);
  const subValues: Record<string, number> = {
    Centering: grading.centering,
    Corners: grading.corners,
    Edges: grading.edges,
    Surface: grading.surface,
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await saveCard(scanResult);
      setSaved(true);
    } catch {
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
    <HoloBackground>
      <ScreenHeader title="Grade Report" onBack={handleScanAnother} />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Card hero */}
        <Pop style={styles.hero} delay={120}>
          <CardArt
            type={energyType}
            name={grading.cardName}
            imageUrl={cardArtworkUrl}
            holo={isHolo}
            tilted
            width={200}
          />
        </Pop>

        <Reveal delay={400} style={styles.heroMeta}>
          <Text style={styles.cardName} numberOfLines={2}>{grading.cardName}</Text>
          <Text style={styles.cardSet}>
            {grading.setName} · {grading.setNumber}
          </Text>
          <View style={styles.heroChips}>
            <EnergyChip type={energyType} size="sm" />
            {scanError === 'card_not_found' && (
              <Chip
                background="rgba(255, 138, 61, 0.16)"
                borderColor="rgba(255, 138, 61, 0.4)"
                textColor={energy.fighting.color}
              >
                NOT IN DB
              </Chip>
            )}
          </View>
        </Reveal>

        {/* Tier banner */}
        <Reveal delay={600} style={styles.tierWrap}>
          {isHolo ? (
            <HoloFoil style={styles.tierBanner}>
              <TierBannerInner tier={tierKey} estimatedPSA={grading.estimatedPSA} />
            </HoloFoil>
          ) : (
            <LinearGradient
              colors={[tierMeta.color, colors.bg1]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.tierBanner}
            >
              <TierBannerInner tier={tierKey} estimatedPSA={grading.estimatedPSA} />
            </LinearGradient>
          )}
        </Reveal>

        {/* Sub-grades */}
        <Reveal delay={800}>
          <SectionHead title="Sub-grades" />
          <View style={styles.subgradeGrid}>
            {SUBGRADE_ACCENTS.map(([label, color]) => (
              <View key={label} style={styles.subgradeCell}>
                <SubgradeDial label={label} value={subValues[label]} accent={color} />
              </View>
            ))}
          </View>
        </Reveal>

        {/* AI Notes */}
        {grading.explanation ? (
          <Reveal delay={1000} style={styles.notes}>
            <View style={styles.notesHead}>
              <Text style={styles.notesIcon}>💬</Text>
              <Text style={styles.notesLabel}>AI NOTES</Text>
            </View>
            <Text style={styles.notesBody}>{grading.explanation}</Text>
          </Reveal>
        ) : null}

        {/* Market estimate */}
        <Reveal delay={1200} style={styles.market}>
          <View style={styles.marketHead}>
            <Text style={styles.marketTitle}>Market Estimate</Text>
            <Chip
              background="rgba(61, 165, 255, 0.16)"
              borderColor="rgba(61, 165, 255, 0.32)"
              textColor={energy.water.color}
            >
              ● LIVE
            </Chip>
          </View>
          {price?.market != null ? (
            <>
              <Text style={styles.marketAmount}>
                ${formatPriceCompact(price.low ?? price.market * 0.7)}
                <Text style={styles.marketRange}>
                  {' '}– ${formatPriceCompact(price.high ?? price.market * 1.4)}
                </Text>
              </Text>
              <View style={styles.priceRow}>
                <PriceCol label="Low" value={price.low ?? price.market * 0.7} />
                <PriceCol label="Mid" value={price.market} accent={energy.electric.color} />
                <PriceCol label="High" value={price.high ?? price.market * 1.4} />
              </View>
            </>
          ) : (
            <Text style={styles.marketUnavailable}>Price unavailable for this card</Text>
          )}
        </Reveal>

        {/* Disclaimer */}
        <Reveal delay={1300} style={styles.disclaimer}>
          <Text style={styles.disclaimerIcon}>ⓘ</Text>
          <Text style={styles.disclaimerText}>
            <Text style={styles.disclaimerStrong}>Estimate only.</Text> AI grading is not a substitute
            for professional services like PSA or Beckett. Prices are approximate.
          </Text>
        </Reveal>

        {/* Actions */}
        <Reveal delay={1400} style={styles.actions}>
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={handleSave}
            disabled={saving || saved}
            style={[styles.popBtn, saved && styles.popBtnSaved]}
          >
            <Text style={styles.popBtnText}>
              {saved ? '✓ SAVED' : saving ? 'Saving…' : '+ Add to Vault'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={handleScanAnother}
            style={styles.ghostBtn}
          >
            <Text style={styles.ghostBtnText}>Scan again</Text>
          </TouchableOpacity>
        </Reveal>
      </ScrollView>

      {/* White flash reveal */}
      <Animated.View
        pointerEvents="none"
        style={[
          StyleSheet.absoluteFillObject,
          {
            backgroundColor: '#fff',
            opacity: flash,
          },
        ]}
      />

      <AdBanner />
    </HoloBackground>
  );
}

const TierBannerInner = ({ tier, estimatedPSA }: { tier: Tier; estimatedPSA: string }) => (
  <View style={styles.tierInner}>
    <Text style={styles.tierLabel}>★ OVERALL TIER ★</Text>
    <Text style={styles.tierName}>{tier.toUpperCase()}</Text>
    <Text style={styles.tierPSA}>EST. {estimatedPSA}</Text>
  </View>
);

const SectionHead = ({ title }: { title: string }) => (
  <View style={styles.sectionHead}>
    <Text style={styles.sectionTitle}>{title}</Text>
  </View>
);

const PriceCol = ({ label, value, accent }: { label: string; value: number; accent?: string }) => (
  <View style={styles.priceCol}>
    <Text style={styles.priceLabel}>{label.toUpperCase()}</Text>
    <Text style={[styles.priceValue, { color: accent ?? colors.ink1 }]}>${formatPriceCompact(value)}</Text>
  </View>
);

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  content: { paddingBottom: 130 },

  hero: {
    paddingVertical: 18,
    alignItems: 'center',
  },
  heroMeta: {
    paddingHorizontal: 24,
    alignItems: 'center',
    gap: 6,
  },
  cardName: {
    fontFamily: fonts.display,
    fontWeight: '800',
    fontSize: 26,
    color: colors.ink0,
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  cardSet: {
    fontFamily: fonts.monoBold,
    color: colors.ink3,
    fontSize: 12,
  },
  heroChips: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 4,
  },

  tierWrap: { paddingHorizontal: 18, marginTop: 18 },
  tierBanner: {
    borderRadius: 22,
    borderWidth: 2,
    borderColor: '#000',
    overflow: 'hidden',
  },
  tierInner: {
    paddingVertical: 16,
    paddingHorizontal: 18,
    alignItems: 'center',
  },
  tierLabel: {
    fontFamily: fonts.monoBlack,
    color: '#0A0A1F',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
  },
  tierName: {
    fontFamily: fonts.display,
    color: '#0A0A1F',
    fontSize: 36,
    fontWeight: '800',
    letterSpacing: -1,
    marginTop: 4,
  },
  tierPSA: {
    fontFamily: fonts.monoBold,
    color: '#0A0A1F',
    fontSize: 13,
    fontWeight: '800',
    marginTop: 4,
  },

  sectionHead: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 6,
  },
  sectionTitle: {
    fontFamily: fonts.display,
    fontWeight: '800',
    fontSize: 16,
    color: colors.ink0,
    letterSpacing: -0.4,
  },

  subgradeGrid: {
    paddingHorizontal: 18,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  subgradeCell: { width: '48%' },

  notes: {
    marginHorizontal: 18,
    marginTop: 16,
    padding: 14,
    backgroundColor: colors.bg1,
    borderRadius: 14,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.lineStrong,
  },
  notesHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  notesIcon: { fontSize: 14 },
  notesLabel: {
    fontFamily: fonts.monoBlack,
    color: colors.ink2,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  notesBody: {
    fontFamily: fonts.body,
    color: colors.ink1,
    fontSize: 13,
    lineHeight: 20,
  },

  market: {
    marginHorizontal: 18,
    marginTop: 14,
    padding: 16,
    backgroundColor: colors.bg1,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.lineStrong,
  },
  marketHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  marketTitle: {
    fontFamily: fonts.display,
    color: colors.ink0,
    fontSize: 16,
    fontWeight: '800',
  },
  marketAmount: {
    fontFamily: fonts.display,
    color: colors.ink0,
    fontSize: 36,
    fontWeight: '800',
    letterSpacing: -1,
  },
  marketRange: {
    color: colors.ink3,
    fontSize: 28,
  },
  marketUnavailable: {
    fontFamily: fonts.bodyMed,
    color: colors.ink2,
    fontSize: 14,
    marginTop: 4,
  },
  priceRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 14,
  },
  priceCol: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  priceLabel: {
    fontFamily: fonts.monoBlack,
    color: colors.ink3,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  priceValue: {
    fontFamily: fonts.display,
    fontWeight: '800',
    fontSize: 16,
    marginTop: 2,
  },

  disclaimer: {
    marginHorizontal: 18,
    marginTop: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    flexDirection: 'row',
    gap: 8,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.lineStrong,
  },
  disclaimerIcon: { color: colors.ink2, fontSize: 14, lineHeight: 18 },
  disclaimerText: {
    flex: 1,
    fontFamily: fonts.mono,
    color: colors.ink3,
    fontSize: 11,
    lineHeight: 17,
  },
  disclaimerStrong: { color: colors.ink2, fontFamily: fonts.monoBold },

  actions: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 18,
    marginTop: 16,
  },
  popBtn: {
    flex: 1,
    backgroundColor: energy.electric.color,
    borderWidth: 2,
    borderColor: '#000',
    borderRadius: 999,
    paddingVertical: 14,
    alignItems: 'center',
  },
  popBtnSaved: {
    backgroundColor: energy.grass.color,
  },
  popBtnText: {
    fontFamily: fonts.display,
    color: '#000',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  ghostBtn: {
    paddingHorizontal: 22,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: colors.lineStrong,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ghostBtnText: {
    fontFamily: fonts.display,
    color: colors.ink0,
    fontSize: 14,
    fontWeight: '800',
  },
});
