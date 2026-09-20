import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useMemo } from 'react';
import { Alert, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GoldButton } from '../components/GoldButton';
import { Header } from '../components/Header';
import { ChevronRightIcon } from '../components/icons';
import { WheelPicker } from '../components/WheelPicker';
import { useAlarmDraft } from '../context/AlarmDraftContext';
import { deleteAlarm, saveAlarm } from '../db/database';
import type { EditorStackParamList } from '../navigation/types';
import { colors, fonts, radii } from '../theme/theme';
import type { DayOfWeek } from '../types/alarm';
import { DAY_LABELS, missionLabel } from '../types/alarm';
import { from12Hour, to12Hour, uses24HourClock } from '../utils/time';

type Props = NativeStackScreenProps<EditorStackParamList, 'AddEditAlarm'>;

const HOURS_24 = Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, '0'));
const HOURS_12 = Array.from({ length: 12 }, (_, i) => ((i + 1).toString()));
const MINUTES = Array.from({ length: 60 }, (_, i) => i.toString().padStart(2, '0'));
const AMPM = ['AM', 'PM'];
const DAY_ORDER: DayOfWeek[] = [0, 1, 2, 3, 4, 5, 6];

export function AddEditAlarmScreen({ navigation }: Props) {
  const { draft, updateDraft, isNew } = useAlarmDraft();
  const is24h = uses24HourClock();

  const selectedDays = useMemo(
    () => (draft.repeat === 'once' ? new Set<DayOfWeek>() : draft.repeat.days),
    [draft.repeat]
  );

  const toggleDay = (day: DayOfWeek) => {
    const next = new Set(selectedDays);
    if (next.has(day)) next.delete(day);
    else next.add(day);
    updateDraft({ repeat: next.size === 0 ? 'once' : { days: next } });
  };

  const handleSave = async () => {
    const toSave = draft.id ? draft : { ...draft, id: `alarm_${Date.now()}_${Math.random().toString(36).slice(2, 8)}` };
    await saveAlarm(toSave);
    navigation.getParent()?.goBack();
  };

  const handleDelete = () => {
    Alert.alert('Delete Alarm', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          if (draft.id) await deleteAlarm(draft.id);
          navigation.getParent()?.goBack();
        },
      },
    ]);
  };

  const missionText = missionLabel(draft.dismissMission);

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <Header
        title={isNew ? 'Add Alarm' : 'Edit Alarm'}
        onBack={() => navigation.getParent()?.goBack()}
        rightLabel="Save"
        onRightPress={handleSave}
      />
      <ScrollView contentContainerStyle={styles.content}>
        {is24h ? (
          <View style={styles.timeCard}>
            <WheelPicker
              values={HOURS_24}
              selectedIndex={draft.hour}
              onChange={(i) => updateDraft({ hour: i })}
            />
            <Text style={styles.colon}>:</Text>
            <WheelPicker
              values={MINUTES}
              selectedIndex={draft.minute}
              onChange={(i) => updateDraft({ minute: i })}
            />
          </View>
        ) : (
          <View style={styles.timeCard}>
            <WheelPicker
              values={HOURS_12}
              selectedIndex={to12Hour(draft.hour).hour12 - 1}
              onChange={(i) => {
                const ampm = to12Hour(draft.hour).ampm;
                updateDraft({ hour: from12Hour(i + 1, ampm) });
              }}
            />
            <Text style={styles.colon}>:</Text>
            <WheelPicker
              values={MINUTES}
              selectedIndex={draft.minute}
              onChange={(i) => updateDraft({ minute: i })}
            />
            <WheelPicker
              values={AMPM}
              selectedIndex={to12Hour(draft.hour).ampm === 'AM' ? 0 : 1}
              onChange={(i) => {
                const hour12 = to12Hour(draft.hour).hour12;
                updateDraft({ hour: from12Hour(hour12, i === 0 ? 'AM' : 'PM') });
              }}
              minWidth={44}
            />
          </View>
        )}

        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>Label</Text>
          <TextInput
            value={draft.label}
            onChangeText={(label) => updateDraft({ label })}
            placeholder="Alarm label"
            placeholderTextColor={colors.inkFaint}
            style={styles.input}
          />
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>Repeat</Text>
          <View style={styles.dayRow}>
            {DAY_ORDER.map((day) => {
              const selected = selectedDays.has(day);
              return (
                <Pressable
                  key={day}
                  onPress={() => toggleDay(day)}
                  style={[styles.dayButton, selected && styles.dayButtonSelected]}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                >
                  <Text style={[styles.dayButtonText, selected && styles.dayButtonTextSelected]}>
                    {DAY_LABELS[day][0]}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={styles.linkGroup}>
          {Platform.OS === 'ios' ? (
            <View style={[styles.linkRow, styles.linkRowBorder]}>
              <Text style={styles.linkRowLabel}>Sound</Text>
              <Text style={styles.linkRowValueStatic}>Default</Text>
            </View>
          ) : (
            <Pressable
              style={[styles.linkRow, styles.linkRowBorder]}
              onPress={() => navigation.navigate('SoundPicker')}
            >
              <Text style={styles.linkRowLabel}>Sound</Text>
              <View style={styles.linkRowValue}>
                <Text style={styles.linkRowValueDim}>{draft.androidSoundUri ? 'Custom' : 'Default'}</Text>
                <ChevronRightIcon color={colors.inkDim} />
              </View>
            </Pressable>
          )}

          <Pressable
            style={[styles.linkRow, draft.dismissMission !== 'none' && styles.linkRowBorder]}
            onPress={() => navigation.navigate('MissionPicker')}
          >
            <Text style={styles.linkRowLabel}>Dismiss mission</Text>
            <View style={styles.linkRowValue}>
              <Text style={styles.linkRowValueGold}>{missionText}</Text>
              <ChevronRightIcon color={colors.inkDim} />
            </View>
          </Pressable>

          {draft.dismissMission === 'random_object' && (
            <Pressable style={styles.linkRow} onPress={() => navigation.navigate('RandomObjectSetup')}>
              <Text style={styles.linkRowLabel}>Random Object Pool</Text>
              <ChevronRightIcon color={colors.inkDim} />
            </Pressable>
          )}
          {draft.dismissMission === 'custom_object' && (
            <Pressable style={styles.linkRow} onPress={() => navigation.navigate('CustomObjectSetup')}>
              <Text style={styles.linkRowLabel}>Custom Object</Text>
              <ChevronRightIcon color={colors.inkDim} />
            </Pressable>
          )}
        </View>

        {!isNew && (
          <Pressable onPress={handleDelete} style={styles.deleteButton}>
            <Text style={styles.deleteButtonText}>Delete Alarm</Text>
          </Pressable>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 24,
    gap: 24,
  },
  timeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 22,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.xl,
  },
  colon: {
    fontFamily: fonts.serif,
    fontSize: 34,
    color: colors.inkFaint,
  },
  fieldGroup: {
    gap: 8,
  },
  fieldLabel: {
    fontSize: 12,
    color: colors.inkFaint,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingVertical: 14,
    paddingHorizontal: 16,
    color: colors.ink,
    fontSize: 16,
  },
  dayRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 6,
  },
  dayButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayButtonSelected: {
    backgroundColor: colors.gold,
    borderColor: colors.gold,
  },
  dayButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.inkDim,
  },
  dayButtonTextSelected: {
    color: colors.bg,
  },
  linkGroup: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    overflow: 'hidden',
  },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 16,
    backgroundColor: colors.surface,
  },
  linkRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  linkRowLabel: {
    fontSize: 15,
    color: colors.ink,
  },
  linkRowValue: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  linkRowValueStatic: {
    fontSize: 14,
    color: colors.inkDim,
  },
  linkRowValueDim: {
    fontSize: 14,
    color: colors.inkDim,
  },
  linkRowValueGold: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.gold,
  },
  deleteButton: {
    alignSelf: 'center',
    paddingVertical: 6,
  },
  deleteButtonText: {
    fontSize: 14,
    color: colors.inkFaint,
  },
});
