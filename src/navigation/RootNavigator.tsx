import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';
import { AlarmListScreen } from '../screens/AlarmListScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { EditorNavigator } from './EditorNavigator';
import type { RootStackParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
      <Stack.Screen name="AlarmList" component={AlarmListScreen} />
      <Stack.Screen name="Editor" component={EditorNavigator} />
      <Stack.Screen name="Settings" component={SettingsScreen} />
    </Stack.Navigator>
  );
}
