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
  /** iOS only: called after dismissRingingAlarm so App.tsx can switch back to normal navigation. */
  onDismissed?: () => void;
};

/**
 * Renders whichever alarm is ringing instead of the normal alarm list/navigator, and needs to
 * work whether or not the rest of the app was already running.
 *
 * On Android, this is the RN root booted by AlarmRingingActivity (registered as "alarmRinging" in
 * index.ts) once AlarmManager fires and RingingService posts its full-screen notification — a
 * separate Activity/process entry point from the main app.
 *
 * On iOS, AlarmKit owns the actual ringing alert (lock screen, Live Activity, Dynamic Island), but
 * its automatic Stop button can't be gated for a mission alarm (see UppyStopIntent) — so the
 * intended path is the alert's "Dismiss Mission" button, which opens the app and sets a pending
 * ringing alarm id (see alarmScheduler.getPendingRingingAlarmId). App.tsx renders this same root
 * in place of the normal navigator when that's set, since there's only one process/root on iOS.
 */
export function AlarmRingingRoot({ alarmId, onDismissed }: AlarmRingingRootProps) {
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
    onDismissed?.();
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
