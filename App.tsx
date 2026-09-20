import { NavigationContainer } from '@react-navigation/native';
import {
  EBGaramond_400Regular_Italic,
  EBGaramond_500Medium,
  EBGaramond_600SemiBold,
  useFonts,
} from '@expo-google-fonts/eb-garamond';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, AppState, Platform, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { getSetting, setSetting } from './src/db/database';
import { RootNavigator } from './src/navigation/RootNavigator';
import { AlarmRingingRoot } from './src/screens/ringing/AlarmRingingRoot';
import { OnboardingScreen } from './src/screens/OnboardingScreen';
import { getPendingRingingAlarmId } from './src/services/alarmScheduler';
import { colors } from './src/theme/theme';
import './src/navigation/types';

const ONBOARDING_SETTING_KEY = 'onboarding_completed';

export default function App() {
  const [fontsLoaded] = useFonts({
    EBGaramond_500Medium,
    EBGaramond_600SemiBold,
    EBGaramond_400Regular_Italic,
  });
  const [needsOnboarding, setNeedsOnboarding] = useState<boolean | null>(null);
  const [ringingAlarmId, setRingingAlarmId] = useState<string | null>(null);

  useEffect(() => {
    getSetting(ONBOARDING_SETTING_KEY).then((value) => setNeedsOnboarding(value !== 'true'));
  }, []);

  // iOS only: AlarmKit's alert "Dismiss Mission" button opens the app and records which alarm to
  // show (see UppyOpenMissionIntent) rather than pushing a normal navigation event, since it can
  // launch the app from cold. Check on mount and every time the app comes back to the foreground.
  useEffect(() => {
    if (Platform.OS !== 'ios') return;
    const checkPending = () => {
      const pendingId = getPendingRingingAlarmId();
      if (pendingId) setRingingAlarmId(pendingId);
    };
    checkPending();
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') checkPending();
    });
    return () => subscription.remove();
  }, []);

  const finishOnboarding = () => {
    setSetting(ONBOARDING_SETTING_KEY, 'true');
    setNeedsOnboarding(false);
  };

  if (!fontsLoaded || needsOnboarding === null) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={colors.gold} />
      </View>
    );
  }

  if (ringingAlarmId) {
    return (
      <SafeAreaProvider>
        <AlarmRingingRoot alarmId={ringingAlarmId} onDismissed={() => setRingingAlarmId(null)} />
        <StatusBar style="light" />
      </SafeAreaProvider>
    );
  }

  if (needsOnboarding) {
    return (
      <SafeAreaProvider>
        <OnboardingScreen onDone={finishOnboarding} />
        <StatusBar style="light" />
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <RootNavigator />
      </NavigationContainer>
      <StatusBar style="light" />
    </SafeAreaProvider>
  );
}
