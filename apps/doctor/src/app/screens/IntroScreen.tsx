import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  Pressable,
  ScrollView,
  useWindowDimensions,
  type NativeSyntheticEvent,
  type NativeScrollEvent,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, spacing, radius } from '../../theme/brand';
import { typeStyles, fontWeight } from '../../theme/typography';
import { Icon } from '../../components/Icon';
import { BrandLockup } from '../../components/BrandLockup';

/**
 * The doctor app's intro carousel — three slides shown once before sign-in.
 *
 * Each slide's artwork is supplied per screen number (`ob1`/`ob2`/`ob3`) and
 * carries its own motifs, so the slides hold nothing but the artwork and the
 * copy over it.
 */
type Slide = {
  key: string;
  art: number;
  /** Lifts this slide's artwork off the bottom edge. Default sits flush. */
  artBottom?: string;
  titleTop: string;
  titleAccent: string;
  body: string;
  cta: string;
};

const SLIDES: Slide[] = [
  {
    key: 'ob1',
    art: require('../../assets/onboarding/ob1 (4).png'),
    artBottom: '23%',
    titleTop: 'Care that',
    titleAccent: 'feels closer.',
    body: 'Connect with patients, manage\nconsultations, and deliver care\nfrom one simple place.',
    cta: 'Continue',
  },
  {
    key: 'ob2',
    art: require('../../assets/onboarding/ob2 (3).png'),
    titleTop: 'Your practice,',
    titleAccent: 'your way.',
    body: 'Set your availability, receive\nconsultation requests, and keep\nyour schedule organized.',
    cta: 'Continue',
  },
  {
    key: 'ob3',
    art: require('../../assets/onboarding/ob3 (3).png'),
    titleTop: 'Everything you',
    titleAccent: 'need to care.',
    body: 'Review patient information, consult\nsecurely, and complete your clinical\nnotes in one connected workflow.',
    cta: 'Get Started',
  },
];

export const IntroScreen = ({ onDone }: { onDone: () => void }) => {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);
  const [index, setIndex] = useState(0);

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const i = Math.round(e.nativeEvent.contentOffset.x / width);
    if (i !== index) setIndex(i);
  };

  const next = () => {
    if (index >= SLIDES.length - 1) return onDone();
    scrollRef.current?.scrollTo({ x: (index + 1) * width, animated: true });
    setIndex(index + 1);
  };

  const slide = SLIDES[index];

  return (
    <View style={s.container} testID="doctor-intro">
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={onScroll}
        keyboardShouldPersistTaps="handled"
      >
        {SLIDES.map((sl) => (
          <View key={sl.key} style={[s.page, { width }]}>
            <Image
              source={sl.art}
              style={[s.art, sl.artBottom ? { bottom: sl.artBottom as any } : null]}
              resizeMode="cover"
            />
          </View>
        ))}
      </ScrollView>

      {/* Chrome sits above the pager so it never scrolls with the art. */}
      <View style={[s.header, { paddingTop: insets.top + spacing.sm }]} pointerEvents="box-none">
        <BrandLockup height={34} accessibilityLabel="Coracure" />
        <Pressable
          onPress={onDone}
          hitSlop={12}
          testID="intro-skip"
          accessibilityRole="button"
          accessibilityLabel="Skip the introduction"
        >
          <Text style={s.skip}>Skip</Text>
        </Pressable>
      </View>

      <View style={s.copy} pointerEvents="none">
        <Text style={s.title}>{slide.titleTop}</Text>
        <Text style={[s.title, s.titleAccent]}>{slide.titleAccent}</Text>
        <Text style={s.body}>{slide.body}</Text>
      </View>

      <View style={[s.footer, { paddingBottom: insets.bottom + spacing.lg }]}>
        <View style={s.dots}>
          {SLIDES.map((sl, i) => (
            <View key={sl.key} style={[s.dot, i === index && s.dotOn]} />
          ))}
        </View>

        <Pressable
          onPress={next}
          style={({ pressed }) => [s.cta, pressed && s.pressed]}
          testID="intro-next"
          accessibilityRole="button"
          accessibilityLabel={slide.cta}
        >
          <Text style={s.ctaText}>{slide.cta}</Text>
          <Icon name="arrowRight" size={20} color={colors.white} />
        </Pressable>
      </View>
    </View>
  );
};

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.white },
  page: { flex: 1 },
  /*
   * Anchored to the bottom at a fraction of the screen rather than full-bleed,
   * so the artwork reads smaller and leaves the copy clear space above it.
   */
  art: { position: 'absolute', left: 0, right: 0, bottom: '20%', height: '62%', width: undefined },

  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
  },
  skip: { ...typeStyles.body, color: colors.inkMuted },

  copy: {
    position: 'absolute',
    top: '13%',
    left: spacing.lg,
    right: spacing.xxl,
  },
  title: {
    ...typeStyles.pageTitle,
    fontSize: 34,
    lineHeight: 42,
    fontWeight: fontWeight.bold,
    color: colors.ink,
  },
  titleAccent: { color: colors.surfie },
  body: {
    ...typeStyles.body,
    color: colors.inkMuted,
    marginTop: spacing.sm,
    lineHeight: 21,
  },


  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
  },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 6 },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#CBDBD6' },
  dotOn: { width: 20, backgroundColor: colors.surfie },

  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    minHeight: 56,
    borderRadius: radius.pill,
    backgroundColor: colors.surfie,
  },
  ctaText: { ...typeStyles.button, color: colors.white },
  pressed: { opacity: 0.9 },
});

export default IntroScreen;
