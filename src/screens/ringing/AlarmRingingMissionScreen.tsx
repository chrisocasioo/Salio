import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CameraIcon } from '../../components/icons';
import { t } from '../../i18n';
import { colors, fonts, radii } from '../../theme/theme';
import type { Alarm } from '../../types/alarm';
import { formatTimeParts } from '../../utils/time';

/** Has a dismiss mission set: matches AlarmRingingMission.dc.html — leads into Start Mission. */
export function AlarmRingingMissionScreen({
  alarm,
  targetLabel,
  onStartMission,
}: {
  alarm: Alarm;
  targetLabel: string;
  onStartMission: () => void;
}) {
  const { main, ampm } = formatTimeParts(alarm.hour, alarm.minute);

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <Text style={styles.eyebrow}>{t('alarmRinging.eyebrow')}</Text>

      <View style={styles.center}>
        <View style={styles.timeRow}>
          <Text style={styles.time}>{main}</Text>
          {ampm ? <Text style={styles.ampm}>{ampm}</Text> : null}
        </View>
        {alarm.label ? <Text style={styles.label}>{alarm.label}</Text> : null}
      </View>

      <View style={styles.missionCard}>
        <View style={styles.missionIconBadge}>
          <CameraIcon size={22} color={colors.gold} />
        </View>
        <Text style={styles.missionTitle}>{t('alarmRinging.find', { target: targetLabel })}</Text>
        <Text style={styles.missionSubtitle}>{t('alarmRinging.takePhotoToTurnOff')}</Text>
      </View>

      <View style={styles.actions}>
        <Pressable onPress={onStartMission} style={styles.pillButton}>
          <Text style={styles.pillButtonText}>{t('alarmRinging.startMission')}</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 76,
    paddingBottom: 20,
  },
  eyebrow: {
    fontSize: 12,
    letterSpacing: 3,
    color: colors.inkFaint,
    textTransform: 'uppercase',
  },
  center: {
    alignItems: 'center',
    gap: 6,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
  },
  time: {
    fontFamily: fonts.serif,
    fontSize: 60,
    color: colors.ink,
  },
  ampm: {
    fontSize: 18,
    color: colors.inkDim,
  },
  label: {
    fontSize: 16,
    color: colors.inkDim,
  },
  missionCard: {
    width: 300,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.goldSoft,
    borderRadius: radii.xxl,
    paddingVertical: 22,
    paddingHorizontal: 20,
    alignItems: 'center',
    gap: 10,
  },
  missionIconBadge: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: colors.goldSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  missionTitle: {
    fontFamily: fonts.serif,
    fontSize: 22,
    color: colors.ink,
    textAlign: 'center',
  },
  missionSubtitle: {
    fontSize: 13,
    color: colors.inkDim,
    textAlign: 'center',
  },
  actions: {
    width: 280,
    gap: 16,
  },
  pillButton: {
    backgroundColor: colors.gold,
    borderRadius: 999,
    paddingVertical: 15,
    alignItems: 'center',
  },
  pillButtonText: {
    color: colors.bg,
    fontSize: 16,
    fontWeight: '600',
  },
});
