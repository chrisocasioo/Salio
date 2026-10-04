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

// Common household objects someone actually has to get up for — no bedside-reachable items (a
// pillow, a clock, a water cup someone might already keep on a nightstand) and nothing too vague
// to picture at a glance (a "bag" could be a purse, a backpack, or a trash bag; an "umbrella" looks
// nothing like itself folded, which is the only state anyone photographs one indoors in).
// Every key here must be one of COCO's 80 classes (or covered by a synonym in
// src/services/imageLabeling.ts): iOS's Object Detector can only ever output those exact names, so
// an item outside that set (a coffee maker, a shoe, a frying pan -- all removed for exactly this
// reason after a real-device test) can never register there. The large fixtures (`toilet`,
// `refrigerator`, `oven`, `sink`) are deliberate: they're structurally never reachable from bed,
// and are among the most reliably detected COCO categories.
// `key` stays a fixed English identifier (matched against the classifier's own labels, with
// forgiving synonym matching in src/services/imageLabeling.ts); only `name` is localized.
export const RANDOM_OBJECT_LABELS: { key: string; name: string }[] = [
  { key: 'refrigerator', name: t('randomObjectSetup.items.refrigerator') },
  { key: 'oven', name: t('randomObjectSetup.items.oven') },
  { key: 'microwave', name: t('randomObjectSetup.items.microwave') },
  { key: 'toilet', name: t('randomObjectSetup.items.toilet') },
  { key: 'knife', name: t('randomObjectSetup.items.knife') },
  { key: 'sink', name: t('randomObjectSetup.items.sink') },
  { key: 'vehicle', name: t('randomObjectSetup.items.vehicle') },
  { key: 'toothbrush', name: t('randomObjectSetup.items.toothbrush') },
  { key: 'spoon', name: t('randomObjectSetup.items.spoon') },
  { key: 'couch', name: t('randomObjectSetup.items.couch') },
  { key: 'scissors', name: t('randomObjectSetup.items.scissors') },
  { key: 'table', name: t('randomObjectSetup.items.table') },
  { key: 'vase', name: t('randomObjectSetup.items.vase') },
  { key: 'backpack', name: t('randomObjectSetup.items.backpack') },
  { key: 'toaster', name: t('randomObjectSetup.items.toaster') },
  { key: 'fork', name: t('randomObjectSetup.items.fork') },
];

export function RandomObjectSetupScreen({ navigation }: Props) {
  const { draft, updateDraft } = useAlarmDraft();
  const knownKeys = new Set(RANDOM_OBJECT_LABELS.map((o) => o.key));
  const pool = new Set(draft.randomObjectPool.filter((k) => knownKeys.has(k)));

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
