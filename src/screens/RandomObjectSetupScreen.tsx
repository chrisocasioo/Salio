import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import React from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GoldButton } from '../components/GoldButton';
import { Header } from '../components/Header';
import { CheckIcon } from '../components/icons';
import { useAlarmDraft } from '../context/AlarmDraftContext';
import { t } from '../i18n';
import type { EditorStackParamList } from '../navigation/types';
import { colors } from '../theme/theme';

type Props = NativeStackScreenProps<EditorStackParamList, 'RandomObjectSetup'>;

// ML Kit's bundled base image-labeling model covers roughly 25-30 genuinely
// usable household items (see build brief Stage 4 note). Full label set is
// wired against the real ML Kit label list in Stage 4; this is the initial pool.
// `key` stays a fixed English identifier (matched against ML Kit's own labels);
// only `name` (the displayed text) is localized.
export const RANDOM_OBJECT_LABELS: { key: string; name: string }[] = [
  { key: 'sink', name: t('randomObjectSetup.items.sink') },
  { key: 'chair', name: t('randomObjectSetup.items.chair') },
  { key: 'couch', name: t('randomObjectSetup.items.couch') },
  { key: 'pillow', name: t('randomObjectSetup.items.pillow') },
  { key: 'clock', name: t('randomObjectSetup.items.clock') },
  { key: 'television', name: t('randomObjectSetup.items.television') },
  { key: 'cup', name: t('randomObjectSetup.items.cup') },
  { key: 'shoe', name: t('randomObjectSetup.items.shoe') },
  { key: 'plant', name: t('randomObjectSetup.items.plant') },
  { key: 'bag', name: t('randomObjectSetup.items.bag') },
  { key: 'shelf', name: t('randomObjectSetup.items.shelf') },
  { key: 'drawer', name: t('randomObjectSetup.items.drawer') },
  { key: 'countertop', name: t('randomObjectSetup.items.countertop') },
  { key: 'lampshade', name: t('randomObjectSetup.items.lampshade') },
  { key: 'curtain', name: t('randomObjectSetup.items.curtain') },
  { key: 'umbrella', name: t('randomObjectSetup.items.umbrella') },
];

export function RandomObjectSetupScreen({ navigation }: Props) {
  const { draft, updateDraft } = useAlarmDraft();
  const pool = new Set(draft.randomObjectPool);

  const toggle = (key: string) => {
    const next = new Set(pool);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    updateDraft({ randomObjectPool: Array.from(next) });
  };

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <Header title={t('common.randomObjectPool')} onBack={() => navigation.goBack()} />
      <Text style={styles.subtitle}>
        {t('randomObjectSetup.subtitle', { count: pool.size, total: RANDOM_OBJECT_LABELS.length })}
      </Text>
      <FlatList
        data={RANDOM_OBJECT_LABELS}
        keyExtractor={(o) => o.key}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => {
          const checked = pool.has(item.key);
          return (
            <Pressable
              style={styles.row}
              onPress={() => toggle(item.key)}
              accessibilityRole="button"
              accessibilityState={{ selected: checked }}
            >
              <Text style={[styles.rowLabel, !checked && styles.rowLabelDim]}>{item.name}</Text>
              <View style={[styles.checkbox, checked && styles.checkboxChecked]}>
                {checked ? <CheckIcon size={12} color={colors.bg} strokeWidth={3.4} /> : null}
              </View>
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
  subtitle: {
    fontSize: 13,
    color: colors.inkDim,
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  list: {
    paddingHorizontal: 20,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  rowLabel: {
    fontSize: 15,
    color: colors.ink,
  },
  rowLabelDim: {
    color: colors.inkFaint,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: colors.gold,
    borderColor: colors.gold,
  },
  footer: {
    padding: 20,
    paddingBottom: 30,
  },
});
