import {
  EBGaramond_400Regular_Italic,
  EBGaramond_500Medium,
  EBGaramond_600SemiBold,
  useFonts,
} from '@expo-google-fonts/eb-garamond';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { ErrorBoundary } from '../../components/ErrorBoundary';
import { t } from '../../i18n';
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
 * On iOS, there's no separate process/root at all: a background AVAudioSession keeps the app
 * alive to ring (see UppyAlarmScheduler) and a local notification opens it, setting a pending
 * ringing alarm id (see alarmScheduler.getPendingRingingAlarmId). App.tsx renders this same root
 * in place of the normal navigator when that's set.
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

  let content: React.ReactNode;
  if (screen === 'emergencyEscape') {
    content = <EmergencyEscapeScreen onDismiss={handleDismiss} />;
  } else if (screen === 'missionCapture') {
    content = (
      <MissionCaptureScreen
        mission={alarm.dismissMission}
        targetKey={missionTarget?.key ?? ''}
        targetLabel={missionTarget?.label ?? t('alarmRinging.defaultTarget')}
        customObject={alarm.customObject}
        onSuccess={handleDismiss}
        onEmergencyEscape={() => setScreen('emergencyEscape')}
      />
    );
  } else if (alarm.dismissMission !== 'none' && missionTarget) {
    content = (
      <AlarmRingingMissionScreen
        alarm={alarm}
        targetLabel={missionTarget.label}
        onStartMission={() => setScreen('missionCapture')}
      />
    );
  } else {
    content = <AlarmRingingScreen alarm={alarm} onDismiss={handleDismiss} />;
  }

  // A crash anywhere in the mission/emergency-escape flow (a bad photo, a native module error,
  // ...) must never leave someone stuck with a ringing alarm and no working UI — the fallback
  // button dismisses the alarm directly, independent of whatever broke.
  return (
    <ErrorBoundary
      title={t('errorBoundary.ringingTitle')}
      actionLabel={t('errorBoundary.ringingAction')}
      onAction={handleDismiss}
    >
      {content}
    </ErrorBoundary>
  );
}
