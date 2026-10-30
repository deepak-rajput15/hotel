import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { View, StyleSheet, Platform } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from './src/context/AuthContext';
import AppNavigator from './src/navigation/AppNavigator';

export default function App() {
  const content = (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <AuthProvider>
        <AppNavigator />
      </AuthProvider>
    </SafeAreaProvider>
  );

  if (Platform.OS === 'web') {
    return (
      <View style={styles.webContainer}>
        <View style={styles.phoneFrame}>
          {content}
        </View>
      </View>
    );
  }

  return content;
}

const styles = StyleSheet.create({
  webContainer: {
    flex: 1,
    backgroundColor: '#090d16',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    width: '100%',
  },
  phoneFrame: {
    width: '100%',
    maxWidth: 440,
    height: '100vh',
    maxHeight: 900,
    backgroundColor: '#f8fafc',
    overflow: 'hidden',
    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(255, 255, 255, 0.1)',
    borderRadius: 24,
  },
});
