import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { colors, typography } from '@coracure/brand';
import LogoMark from '../assets/brand/logo-mark.svg';

export const SplashScreen = () => {
  return (
    <View style={styles.container}>
      <LogoMark width={80} height={80} />
      <Text style={styles.title}>CoraCure</Text>
      <Text style={styles.tagline}>Care. Connected.</Text>
      <ActivityIndicator style={styles.spinner} color={colors.paris} size="small" />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface.page,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontFamily: typography.heading.family,
    fontWeight: typography.heading.weight,
    fontSize: typography.size.xxxl,
    color: colors.surfie,
    marginTop: 24,
  },
  tagline: {
    fontFamily: typography.body.family,
    fontWeight: typography.body.weight,
    fontSize: typography.size.md,
    color: colors.inkMuted,
    marginTop: 8,
  },
  spinner: {
    marginTop: 48,
  },
});

export default SplashScreen;
