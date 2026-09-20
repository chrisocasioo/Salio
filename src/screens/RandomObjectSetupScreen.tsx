import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import React from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GoldButton } from '../components/GoldButton';
import { Header } from '../components/Header';
import { CheckIcon } from '../components/icons';
import { useAlarmDraft } from '../context/AlarmDraftContext';
import type { EditorStackParamList } from '../navigation/types';
import { colors } from '../theme/theme';

type Props = NativeStackScreenProps<EditorStackParamList, 'RandomObjectSetup'>;

// ML Kit's bundled base image-labeling model covers roughly 25-30 genuinely
// usable household items (see build brief Stage 4 note). Full label set is
// wired against the real ML Kit label list in Stage 4; this is the initial pool.
export const RANDOM_OBJECT_LABELS: { key: string; name: string }[] = [
  { key: 'sink', name: 'Sink' },
  { key: 'chair', name: 'Chair' },
  { key: 'couch', name: 'Couch' },
  { key: 'pillow', name: 'Pillow' },
  { key: 'clock', name: 'Clock' },
  { key: 'television', name: 'Television' },
  { key: 'cup', name: 'Cup' },
  { key: 'shoe', name: 'Shoe' },
  { key: 'plant', name: 'Plant' },
  { key: 'bag', name: 'Bag' },
  { key: 'shelf', name: 'Shelf' },
  { key: 'drawer', name: 'Drawer' },
  { key: 'countertop', name: 'Countertop' },
  { key: 'lampshade', name: 'Lampshade' },
  { key: 'curtain', name: 'Curtain' },
  { key: 'umbrella', name: 'Umbrella' },
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
      <Header title="Random Object Pool" onBack={() => navigation.goBack()} />
      <Text style={styles.subtitle}>
        {pool.size} of {RANDOM_OBJECT_LABELS.length} selected · we'll pick one at random when this alarm rings.
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
