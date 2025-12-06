import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import FeedScreen from './screens/FeedScreen';
import PaperDetailScreen from './screens/PaperDetailScreen';

const Stack = createNativeStackNavigator();

const MyTheme = {
  ...DefaultTheme,
  dark: true,
  colors: {
    ...DefaultTheme.colors,
    primary: '#8b5cf6',
    background: '#0f0f1a',
    card: '#1a1a2e',
    text: '#ffffff',
    border: '#2a2a3e',
    notification: '#8b5cf6',
  },
};

export default function App() {
  return (
    <SafeAreaProvider>
      <NavigationContainer theme={MyTheme}>
        <Stack.Navigator
          screenOptions={{
            headerStyle: {
              backgroundColor: '#0f0f1a',
            },
            headerTintColor: '#ffffff',
            headerTitleStyle: {
              fontWeight: '600',
            },
            headerShadowVisible: false,
          }}
        >
          <Stack.Screen
            name="Feed"
            component={FeedScreen}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="PaperDetail"
            component={PaperDetailScreen}
            options={{
              title: 'Paper Details',
              headerBackTitle: 'Back',
            }}
          />
        </Stack.Navigator>
      </NavigationContainer>
      <StatusBar style="light" />
    </SafeAreaProvider>
  );
}
