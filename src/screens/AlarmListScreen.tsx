import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useCallback, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AlarmClockIcon, PlusIcon, TargetIcon } from '../components/icons';
import type { RootStackParamList } from '../navigation/types';
import { listAlarms, setAlarmEnabled } from '../services/alarmRepository';
import { colors, fonts } from '../theme/theme';
import type { Alarm } from '../types/alarm';
import { repeatSummary } from '../types/alarm';
import { formatTimeParts } from '../utils/time';

type Props = NativeStackScreenProps<RootStackParamList, 'AlarmList'>;

export function AlarmListScreen({ navigation }: Props) {
  const [alarms, setAlarms] = useState<Alarm[]>([]);

  const reload = useCallback(() => {
    listAlarms().then(setAlarms);
  }, []);

  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload])
  );

  const toggle = async (alarm: Alarm) => {
    setAlarms((prev) => prev.map((a) => (a.id === alarm.id ? { ...a, enabled: !a.enabled } : a)));
    await setAlarmEnabled(alarm, !alarm.enabled);
  };

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <View style={styles.headerRow}>
        <View style={styles.headerLeft}>
          <View style={styles.logoBadge}>
            <AlarmClockIcon size={18} color={colors.gold} />
          </View>
          <Text style={styles.headerTitle}>Alarms</Text>
        </View>
        <Pressable
          onPress={() => navigation.navigate('Editor', {})}
          accessibilityLabel="Add alarm"
          accessibilityRole="button"
          style={styles.addButton}
        >
          <PlusIcon />
        </Pressable>
      </View>

      <FlatList
        data={alarms}
        keyExtractor={(a) => a.id}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No alarms yet. Tap + to add one.</Text>
          </View>
        }
        renderItem={({ item }) => (
          <AlarmRow alarm={item} onPress={() => navigation.navigate('Editor', { alarmId: item.id })} onToggle={() => toggle(item)} />
        )}
      />
    </SafeAreaView>
  );
}

function AlarmRow({ alarm, onPress, onToggle }: { alarm: Alarm; onPress: () => void; onToggle: () => void }) {
  const { main, ampm } = formatTimeParts(alarm.hour, alarm.minute);
  const hasMission = alarm.dismissMission !== 'none';
  const missionChipLabel =
    alarm.dismissMission === 'custom_object'
      ? alarm.customObject?.name || 'Custom Object'
      : alarm.dismissMission === 'random_object'
      ? 'Random Object'
      : '';

  return (
    <View style={[styles.card, !alarm.enabled && styles.cardDisabled]}>
      <Pressable style={styles.cardBody} onPress={onPress}>
        <View style={styles.timeRow}>
          <Text style={styles.timeMain}>{main}</Text>
          {ampm ? <Text style={styles.timeAmpm}>{ampm}</Text> : null}
        </View>
        {alarm.label ? <Text style={styles.label}>{alarm.label}</Text> : null}
        <View style={styles.metaRow}>
          <Text style={styles.days}>{repeatSummary(alarm.repeat)}</Text>
          {hasMission ? (
            <View style={styles.missionChip}>
              <TargetIcon size={11} color={colors.gold} />
              <Text style={styles.missionChipText}>{missionChipLabel}</Text>
            </View>
          ) : null}
        </View>
      </Pressable>
      <Switch
        value={alarm.enabled}
        onValueChange={onToggle}
        trackColor={{ false: colors.surface2, true: colors.gold }}
        thumbColor={alarm.enabled ? colors.bg : colors.inkFaint}
        ios_backgroundColor={colors.surface2}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 4,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  logoBadge: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: colors.goldSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontFamily: fonts.serif,
    fontSize: 30,
    color: colors.ink,
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.gold,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContent: {
    padding: 20,
    paddingTop: 12,
    gap: 12,
  },
  empty: {
    paddingTop: 80,
    alignItems: 'center',
  },
  emptyText: {
    color: colors.inkDim,
    fontSize: 15,
  },
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 20,
    paddingVertical: 16,
    paddingLeft: 18,
    paddingRight: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 12,
  },
  cardDisabled: {
    opacity: 0.5,
  },
  cardBody: {
    flex: 1,
    minWidth: 0,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 5,
  },
  timeMain: {
    fontFamily: fonts.serif,
    fontSize: 32,
    color: colors.ink,
  },
  timeAmpm: {
    fontSize: 14,
    color: colors.inkDim,
  },
  label: {
    fontSize: 14,
    color: colors.inkDim,
    marginTop: 2,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 9,
    flexWrap: 'wrap',
  },
  days: {
    fontSize: 12,
    color: colors.inkFaint,
    letterSpacing: 0.2,
  },
  missionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.goldSoft,
    paddingVertical: 3,
    paddingLeft: 7,
    paddingRight: 9,
    borderRadius: 999,
  },
  missionChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.gold,
  },
});
