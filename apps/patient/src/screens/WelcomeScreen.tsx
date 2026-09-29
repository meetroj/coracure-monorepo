import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Image,
  ScrollView,
  useWindowDimensions,
  type NativeSyntheticEvent,
  type NativeScrollEvent,
} from 'react-native';
import { colors, typography, spacing } from '@coracure/brand';
import { Icon } from '@coracure/ui';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/RootNavigator';
import { useNavigation } from '@react-navigation/native';
import LogoWide from '../assets/brand/logo-wide.svg';

type WelcomeScreenProp = NativeStackNavigationProp<RootStackParamList, 'Welcome'>;

/**
 * Three full-bleed slides. The heading is split so its middle line can carry
 * the brand green, which is the one thing the mock does on every slide.
 */
const SLIDES = [
  {
    image: require('../assets/onboarding/onb1.png'),
    lines: ['Find the', 'Right Doctor', 'for Your Health'],
    body: 'Search trusted doctors, check profiles, ratings and book appointments with ease.',
  },
  {
    image: require('../assets/onboarding/onb2.png'),
    lines: ['Consult with', 'Trusted Doctors', 'Online'],
    body: 'Get expert advice through secure video or chat consultations from the comfort of your home.',
  },
  {
    image: require('../assets/onboarding/onb3.png'),
    lines: ['Manage', 'Your Health', 'Easily'],
    body: 'Keep track of your appointments, prescriptions, lab reports and more — all in one secure place.',
  },
];

export const WelcomeScreen = () => {
  const navigation = useNavigation<WelcomeScreenProp>();
  const { width } = useWindowDimensions();
  const scrollRef = useRef<ScrollView>(null);
  const [index, setIndex] = useState(0);

  const toSignIn = () => navigation.navigate('Login');

  const onNext = () => {
    if (index === SLIDES.length - 1) return toSignIn();
    const next = index + 1;
    setIndex(next);
    scrollRef.current?.scrollTo({ x: next * width, animated: true });
  };

  const onMomentumEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) =>
    setIndex(Math.round(e.nativeEvent.contentOffset.x / width));

  return (
    <View testID="welcome" style={styles.container}>
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={onMomentumEnd}
      >
        {SLIDES.map((slide) => (
          <View key={slide.lines[1]} style={[styles.slide, { width }]}>
            <Image source={slide.image} style={styles.photo} resizeMode="cover" />
            <View style={styles.scrim} />
            <View style={styles.copy}>
              <Text style={styles.heading}>{slide.lines[0]}</Text>
              <Text style={[styles.heading, styles.headingAccent]}>{slide.lines[1]}</Text>
              <Text style={styles.heading}>{slide.lines[2]}</Text>
              <Text style={styles.body}>{slide.body}</Text>
            </View>
          </View>
        ))}
      </ScrollView>

      <View style={styles.logo} pointerEvents="none">
        <LogoWide width={132} height={34} />
      </View>

      <Pressable
        style={styles.skip}
        onPress={toSignIn}
        hitSlop={12}
        accessibilityRole="button"
        accessibilityLabel="Skip"
      >
        <Text style={styles.skipText}>Skip</Text>
      </Pressable>

      <View style={styles.footer}>
        <View style={styles.dots}>
          {SLIDES.map((slide, i) => (
            <View key={slide.lines[1]} style={[styles.dot, i === index && styles.dotOn]} />
          ))}
        </View>

        <Pressable
          style={styles.nextBtn}
          onPress={onNext}
          accessibilityRole="button"
          accessibilityLabel={index === SLIDES.length - 1 ? 'Get Started' : 'Next'}
        >
          <Icon name="arrowRight" size={22} color={colors.white} />
        </Pressable>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.white },
  slide: { flex: 1 },
  photo: { ...StyleSheet.absoluteFillObject, width: '100%', height: '100%' },
  /* A light veil over the photo — enough to sit the copy on, not enough to wash it out. */
  scrim: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(255,255,255,0.14)' },
  copy: {
    paddingHorizontal: spacing.xl,
    paddingTop: 110,
    paddingRight: spacing.xxxl * 2,
  },
  heading: {
    /*
     * A white halo rather than a panel: the accent line lands on leaves and
     * green upholstery on two of the three photos, where brand green on green
     * disappears. Costs nothing and leaves the mock's layout alone.
     */
    textShadowColor: 'rgba(255,255,255,0.95)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
    fontFamily: typography.heading.family,
    fontSize: 30,
    fontWeight: '800',
    lineHeight: 38,
    color: '#111827',
  },
  headingAccent: { color: colors.surfie },
  body: {
    textShadowColor: 'rgba(255,255,255,0.95)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
    fontFamily: typography.body.family,
    fontSize: 14,
    lineHeight: 21,
    color: '#374151',
    marginTop: spacing.md,
  },
  logo: {
    position: 'absolute',
    top: spacing.lg,
    left: spacing.xl,
  },
  skip: {
    position: 'absolute',
    top: spacing.lg + 3,
    right: spacing.md,
    /* Room around the glyphs: hard against the edge the 'p' was being cut. */
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
  },
  skipText: {
    fontFamily: typography.body.family,
    fontSize: 14,
    color: colors.inkMuted,
    includeFontPadding: false,
  },
  footer: {
    position: 'absolute',
    left: spacing.xl,
    right: spacing.xl,
    bottom: spacing.xl,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dots: { flexDirection: 'row', gap: 8 },
  dot: { width: 9, height: 9, borderRadius: 5, backgroundColor: '#C9D3CF' },
  dotOn: { backgroundColor: colors.surfie },
  nextBtn: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.surfie,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default WelcomeScreen;
