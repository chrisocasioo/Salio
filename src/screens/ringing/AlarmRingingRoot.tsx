import {
  EBGaramond_400Regular_Italic,
  EBGaramond_500Medium,
  EBGaramond_600SemiBold,
  useFonts,
} from '@expo-google-fonts/eb-garamond';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { getAlarm } from '../../services/alarmRepository';
import { dismissRingingAlarm } from '../../services/alarmScheduler';
import { colors } from '../../theme/theme';
import type { Alarm } from '../../types/alarm';
import { AlarmRingingMissionScreen } from './AlarmRingingMissionScreen';
import { AlarmRingingScreen } from './AlarmRingingScreen';
import { EmergencyEscapeScreen } from './EmergencyEscapeScreen';
import { MissionCaptureScreen } from './MissionCaptureScreen';
import { pickMissionTarget } from './missionTarget';

type Screen = 'ringing' | 'missionCapture' | 'emergencyEscape';

export type AlarmRingingRootProps = {
  alarmId?: string;
};

/**
 * The RN root rendered by Android's AlarmRingingActivity (registered as "alarmRinging" in
 * index.ts) once AlarmManager fires and RingingService posts its full-screen notification. Kept
 * deliberately separate from the main app's NavigationContainer/root component — it boots
 * straight to whichever alarm is ringing instead of the alarm list, and needs to survive being
 * launched while the rest of the app may not even be running.
 *
 * iOS never launches this: AlarmKit owns the entire ringing UI there (lock screen alert, Live
 * Activity, Dynamic Island) per the build brief, so this root only matters on Android.
 */
export function AlarmRingingRoot({ alarmId }: AlarmRingingRootProps) {
  const [fontsLoaded] = useFonts({
    EBGaramond_500Medium,
    EBGaramond_600SemiBold,
    EBGaramond_400Regular_Italic,
  });
  const [alarm, setAlarm] = useState<Alarm | null>(null);
  const [screen, setScreen] = useState<Screen>('ringing');
  const [missionTarget, setMissionTarget] = useState<{ key: string; label: string } | null>(null);

  useEffect(() => {
    if (!alarmId) return;
    getAlarm(alarmId).then((loaded) => {
      setAlarm(loaded);
      if (loaded) setMissionTarget(pickMissionTarget(loaded));
    });
  }, [alarmId]);

  const handleDismiss = () => {
    if (alarmId) dismissRingingAlarm(alarmId);
  };

  if (!fontsLoaded || !alarm || !alarmId) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={colors.gold} />
      </View>
    );
  }

  if (screen === 'emergencyEscape') {
    return <EmergencyEscapeScreen onDismiss={handleDismiss} />;
  }

  if (screen === 'missionCapture') {
    return (
      <MissionCaptureScreen
        mission={alarm.dismissMission}
        targetKey={missionTarget?.key ?? ''}
        targetLabel={missionTarget?.label ?? 'the object'}
        customObject={alarm.customObject}
        onSuccess={handleDismiss}
        onEmergencyEscape={() => setScreen('emergencyEscape')}
      />
    );
  }

  if (alarm.dismissMission !== 'none' && missionTarget) {
    return (
      <AlarmRingingMissionScreen
        alarm={alarm}
        targetLabel={missionTarget.label}
        onStartMission={() => setScreen('missionCapture')}
      />
    );
  }

  return <AlarmRingingScreen alarm={alarm} onDismiss={handleDismiss} />;
}
