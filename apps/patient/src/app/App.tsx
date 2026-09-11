import React from 'react';
import { StatusBar, View, StyleSheet } from 'react-native';
import { SafeAreaProvider, initialWindowMetrics } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { AuthProvider } from '../auth/AuthContext';
import { RootNavigator } from '../navigation/RootNavigator';

export const App = () => {
  return (
    <SafeAreaProvider initialMetrics={initialWindowMetrics}>
      <View style={styles.root}>
        <AuthProvider>
          <StatusBar barStyle="dark-content" />
          <RootNavigator />
        </AuthProvider>
      </View>
    </SafeAreaProvider>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
});

export default App;

