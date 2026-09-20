import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useEffect, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GoldButton } from '../components/GoldButton';
import { Header } from '../components/Header';
import { CheckIcon, SoundWaveIcon } from '../components/icons';
import { useAlarmDraft } from '../context/AlarmDraftContext';
import { t } from '../i18n';
import type { EditorStackParamList } from '../navigation/types';
import { colors } from '../theme/theme';
import type { AlarmSound } from '../../modules/uppy-alarm-android';

type Props = NativeStackScreenProps<EditorStackParamList, 'SoundPicker'>;

const DEFAULT_SOUND: AlarmSound = { uri: '', name: t('addEditAlarm.soundDefault') };

export function SoundPickerScreen({ navigation }: Props) {
  const { draft, updateDraft } = useAlarmDraft();
  const [sounds, setSounds] = useState<AlarmSound[]>([DEFAULT_SOUND]);

  useEffect(() => {
    // This screen only opens on Android (see AddEditAlarmScreen's Platform.OS check), so the
    // module is always the real one there; the try/catch just protects a bare JS bundling
    // context (e.g. Expo Go) where the native module was never linked.
    try {
      const AlarmAndroid = require('../../modules/uppy-alarm-android').default;
      const deviceSounds: AlarmSound[] = AlarmAndroid.listAlarmSounds();
      setSounds([DEFAULT_SOUND, ...deviceSounds]);
    } catch {
      setSounds([DEFAULT_SOUND]);
    }
  }, []);

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <Header title={t('addEditAlarm.sound')} onBack={() => navigation.goBack()} />
      <FlatList
        data={sounds}
        keyExtractor={(s) => s.uri || 'default'}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => {
          const selected = (draft.androidSoundUri ?? '') === item.uri;
          return (
            <Pressable
              style={styles.row}
              onPress={() => updateDraft({ androidSoundUri: item.uri || null })}
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
        <GoldButton label={t('common.done')} onPress={() => navigation.goBack()} />
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
