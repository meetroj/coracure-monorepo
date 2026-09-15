import { typeStyles } from '../../../../libs/typography/src';
import React, { Component, type ReactNode } from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable } from 'react-native';

/**
 * Catches a render error instead of letting the app die silently.
 *
 * In a release build a thrown JS error leaves a white screen or closes the
 * app, with nothing to go on. This turns that into a readable message the
 * tester can screenshot, which is the difference between "it crashed" and a
 * stack trace.
 *
 * It cannot catch a native crash — if the app still dies outright, the fault
 * is below JS and `adb logcat` is the only source of truth.
 */
type Props = { children: ReactNode };
type State = { error: Error | null; info: string };

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null, info: '' };

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { error };
  }

  componentDidCatch(error: Error, info: { componentStack?: string | null }) {
    this.setState({ info: info.componentStack ?? '' });
  }

  render() {
    const { error, info } = this.state;
    if (!error) return this.props.children;

    return (
      <View style={s.root}>
        <ScrollView contentContainerStyle={s.content}>
          <Text style={[typeStyles.body, s.title]}>Something went wrong</Text>
          <Text style={[typeStyles.body, s.subtitle]}>
            The screen failed to render. Please share this with the team.
          </Text>

          <Text style={[typeStyles.body, s.label]}>Error</Text>
          <Text selectable style={[typeStyles.body, s.body]}>
            {error.name}: {error.message}
          </Text>

          {!!error.stack && (
            <>
              <Text style={[typeStyles.body, s.label]}>Stack</Text>
              <Text selectable style={[typeStyles.body, s.mono]}>
                {error.stack.split('\n').slice(0, 12).join('\n')}
              </Text>
            </>
          )}

          {!!info && (
            <>
              <Text style={[typeStyles.body, s.label]}>Component tree</Text>
              <Text selectable style={[typeStyles.body, s.mono]}>
                {info.split('\n').slice(0, 12).join('\n')}
              </Text>
            </>
          )}

          <Pressable style={s.btn} onPress={() => this.setState({ error: null, info: '' })}>
            <Text style={[typeStyles.body, s.btnText]}>Try again</Text>
          </Pressable>
        </ScrollView>
      </View>
    );
  }
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#FFFFFF' },
  content: { padding: 20, paddingTop: 64, gap: 6 },
  title: { ...typeStyles.pageTitle, color: '#1C1C1C' },
  subtitle: { ...typeStyles.bodySmall, color: '#5A6B67', marginBottom: 14 },
  label: { ...typeStyles.label, textTransform: 'uppercase', color: '#0E766C', marginTop: 16 },
  body: { ...typeStyles.body, color: '#1C1C1C' },
  mono: { ...typeStyles.caption, color: '#5A6B67' },
  btn: {
    marginTop: 28,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#0E766C',
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnText: { ...typeStyles.button, color: '#FFFFFF' },
});

export default ErrorBoundary;
