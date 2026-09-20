import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { AlarmDraftProvider } from '../context/AlarmDraftContext';
import { getAlarm } from '../services/alarmRepository';
import { AddEditAlarmScreen } from '../screens/AddEditAlarmScreen';
import { CustomObjectSetupScreen } from '../screens/CustomObjectSetupScreen';
import { MissionPickerScreen } from '../screens/MissionPickerScreen';
import { RandomObjectSetupScreen } from '../screens/RandomObjectSetupScreen';
import { SoundPickerScreen } from '../screens/SoundPickerScreen';
import { colors } from '../theme/theme';
import type { Alarm } from '../types/alarm';
import { createBlankAlarm } from '../types/alarm';
import type { EditorStackParamList, RootStackParamList } from './types';

const Stack = createNativeStackNavigator<EditorStackParamList>();

type Props = NativeStackScreenProps<RootStackParamList, 'Editor'>;

export function EditorNavigator({ route }: Props) {
  const { alarmId } = route.params;
  const [initialAlarm, setInitialAlarm] = useState<Alarm | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (alarmId) {
        const existing = await getAlarm(alarmId);
        if (!cancelled) setInitialAlarm(existing ?? createBlankAlarm());
      } else {
        setInitialAlarm(createBlankAlarm());
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [alarmId]);

  if (!initialAlarm) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={colors.gold} />
      </View>
    );
  }

  return (
    <AlarmDraftProvider initialAlarm={initialAlarm} isNew={!alarmId}>
      <Stack.Navigator screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
        <Stack.Screen name="AddEditAlarm" component={AddEditAlarmScreen} />
        <Stack.Screen name="SoundPicker" component={SoundPickerScreen} />
        <Stack.Screen name="MissionPicker" component={MissionPickerScreen} />
        <Stack.Screen name="RandomObjectSetup" component={RandomObjectSetupScreen} />
        <Stack.Screen name="CustomObjectSetup" component={CustomObjectSetupScreen} />
      </Stack.Navigator>
    </AlarmDraftProvider>
  );
}
