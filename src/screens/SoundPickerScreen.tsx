import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import React from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GoldButton } from '../components/GoldButton';
import { Header } from '../components/Header';
import { CheckIcon, SoundWaveIcon } from '../components/icons';
import { useAlarmDraft } from '../context/AlarmDraftContext';
import type { EditorStackParamList } from '../navigation/types';
import { colors } from '../theme/theme';

type Props = NativeStackScreenProps<EditorStackParamList, 'SoundPicker'>;

// Placeholder list until Stage 3 wires the real RingtoneManager (TYPE_ALARM) cursor on Android.
const PLACEHOLDER_SOUNDS = [
  { uri: null, name: 'Default' },
  { uri: 'chimes', name: 'Chimes' },
  { uri: 'daybreak', name: 'Daybreak' },
  { uri: 'ascend', name: 'Ascend' },
  { uri: 'gentle-waves', name: 'Gentle Waves' },
  { uri: 'classic-bell', name: 'Classic Bell' },
  { uri: 'pulse', name: 'Pulse' },
  { uri: 'radiance', name: 'Radiance' },
  { uri: 'silver-dawn', name: 'Silver Dawn' },
];

export function SoundPickerScreen({ navigation }: Props) {
  const { draft, updateDraft } = useAlarmDraft();

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <Header title="Sound" onBack={() => navigation.goBack()} />
      <FlatList
        data={PLACEHOLDER_SOUNDS}
        keyExtractor={(s) => s.uri ?? 'default'}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => {
          const selected = draft.androidSoundUri === item.uri;
          return (
            <Pressable
              style={styles.row}
              onPress={() => updateDraft({ androidSoundUri: item.uri })}
              accessibilityRole="button"
              accessibilityState={{ selected }}
            >
              <View style={[styles.iconBadge, selected && styles.iconBadgeSelected]}>
                <SoundWaveIcon size={14} color={selected ? colors.gold : colors.inkFaint} />
              </View>
              <Text style={styles.rowLabel}>{item.name}</Text>
              {selected ? <CheckIcon size={18} color={colors.gold} /> : null}
            </Pressable>
          );
        }}
      />
      <View style={styles.footer}>
        <GoldButton label="Done" onPress={() => navigation.goBack()} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  list: {
    paddingHorizontal: 20,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  iconBadge: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.surface2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBadgeSelected: {
    backgroundColor: colors.goldSoft,
  },
  rowLabel: {
    flex: 1,
    fontSize: 15,
    color: colors.ink,
  },
  footer: {
    padding: 20,
    paddingBottom: 30,
  },
});
