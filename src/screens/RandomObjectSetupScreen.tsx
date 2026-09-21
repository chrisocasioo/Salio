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

// Small, common household objects someone actually has to get up for — no bedside-reachable items
// (a pillow, a clock, a water cup someone might already keep on a nightstand) and nothing too
// vague to picture at a glance (a "bag" could be a purse, a backpack, or a trash bag; an "umbrella"
// looks nothing like itself folded, which is the only state anyone photographs one indoors in).
// Also picked to match generic on-device classifier vocabulary (ML Kit's bundled base
// image-labeling model on Android, MediaPipe's Image Classifier on iOS), which overlaps with
// widely-used object-detection label sets. Large fixed furniture/fixtures (a sink, a couch, a whole
// shelf) are deliberately left out too: not really "objects" someone can locate and photograph up
// close. `toilet` is the one deliberate exception to "small" — it's the single item on this list
// structurally guaranteed to never be reachable from bed, and one of the most visually consistent
// object-detector categories there is.
// `key` stays a fixed English identifier (matched against the classifier's own labels, with
// forgiving synonym matching in src/services/imageLabeling.ts); only `name` is localized.
export const RANDOM_OBJECT_LABELS: { key: string; name: string }[] = [
  { key: 'coffeemaker', name: t('randomObjectSetup.items.coffeemaker') },
  { key: 'shoe', name: t('randomObjectSetup.items.shoe') },
  { key: 'microwave', name: t('randomObjectSetup.items.microwave') },
  { key: 'toilet', name: t('randomObjectSetup.items.toilet') },
  { key: 'knife', name: t('randomObjectSetup.items.knife') },
  { key: 'pan', name: t('randomObjectSetup.items.pan') },
  { key: 'remote', name: t('randomObjectSetup.items.remote') },
  { key: 'toothbrush', name: t('randomObjectSetup.items.toothbrush') },
  { key: 'spoon', name: t('randomObjectSetup.items.spoon') },
  { key: 'bowl', name: t('randomObjectSetup.items.bowl') },
  { key: 'scissors', name: t('randomObjectSetup.items.scissors') },
  { key: 'hairdryer', name: t('randomObjectSetup.items.hairdryer') },
  { key: 'vase', name: t('randomObjectSetup.items.vase') },
  { key: 'backpack', name: t('randomObjectSetup.items.backpack') },
  { key: 'toaster', name: t('randomObjectSetup.items.toaster') },
  { key: 'fork', name: t('randomObjectSetup.items.fork') },
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
