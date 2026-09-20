import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { t } from '../../i18n';
import { colors, fonts } from '../../theme/theme';
import type { Alarm } from '../../types/alarm';
import { formatTimeParts } from '../../utils/time';

function formatRingingDate(): string {
  return new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });
}

/** No dismiss mission set: matches AlarmRinging.dc.html — a single Dismiss action. */
export function AlarmRingingScreen({ alarm, onDismiss }: { alarm: Alarm; onDismiss: () => void }) {
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
        <Text style={styles.date}>{formatRingingDate()}</Text>
      </View>

      <View style={styles.actions}>
        <Pressable onPress={onDismiss} style={styles.pillButton}>
          <Text style={styles.pillButtonText}>{t('alarmRinging.dismiss')}</Text>
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
    paddingVertical: 56,
  },
  eyebrow: {
    fontSize: 12,
    letterSpacing: 3,
    color: colors.inkFaint,
    textTransform: 'uppercase',
  },
  center: {
    alignItems: 'center',
    gap: 8,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
  },
  time: {
    fontFamily: fonts.serif,
    fontSize: 96,
    color: colors.ink,
  },
  ampm: {
    fontSize: 24,
    color: colors.inkDim,
  },
  label: {
    fontSize: 18,
    color: colors.inkDim,
    marginTop: 6,
  },
  date: {
    fontSize: 13,
    color: colors.inkFaint,
  },
  actions: {
    width: 280,
    gap: 14,
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
