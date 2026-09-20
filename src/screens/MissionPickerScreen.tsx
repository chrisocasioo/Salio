import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GoldButton } from '../components/GoldButton';
import { Header } from '../components/Header';
import { BoltIcon, CircleIcon, GridIcon, TargetIcon } from '../components/icons';
import { useAlarmDraft } from '../context/AlarmDraftContext';
import type { EditorStackParamList } from '../navigation/types';
import { RANDOM_OBJECT_LABELS } from './RandomObjectSetupScreen';
import { colors, radii } from '../theme/theme';
import type { DismissMission } from '../types/alarm';

type Props = NativeStackScreenProps<EditorStackParamList, 'MissionPicker'>;

const OPTIONS: { key: DismissMission; title: string; description: string; icon: (color: string) => React.ReactNode }[] = [
  {
    key: 'none',
    title: 'None',
    description: 'Tap once to dismiss.',
    icon: (color) => <CircleIcon size={20} color={color} />,
  },
  {
    key: 'random_object',
    title: 'Random Object',
    description: 'Photograph an item from a pool you choose.',
    icon: (color) => <GridIcon size={20} color={color} />,
  },
  {
    key: 'custom_object',
    title: 'Custom Object',
    description: 'Register one object to find each time.',
    icon: (color) => <TargetIcon size={20} color={color} />,
  },
];

export function MissionPickerScreen({ navigation }: Props) {
  const { draft, updateDraft } = useAlarmDraft();
  const [selected, setSelected] = useState<DismissMission>(draft.dismissMission);

  const commitSave = () => {
    // The first time an alarm switches to Random Object, start with every item in the pool
    // selected (rather than none) — matches the pool screen's own copy ("we'll pick one at
    // random"), and an empty pool would otherwise leave the mission impossible to complete.
    const randomObjectPool =
      selected === 'random_object' && draft.randomObjectPool.length === 0
        ? RANDOM_OBJECT_LABELS.map((o) => o.key)
        : draft.randomObjectPool;
    // Switching away from a Custom Object mission that already has a registered object leaves
    // that registration orphaned (Add/Edit Alarm only shows the Custom Object row while this
    // mission is selected) — clear it so a later switch back to Custom Object is really a fresh
    // setup, matching what the warning below tells the user will happen.
    const customObject = selected === 'custom_object' ? draft.customObject : null;
    updateDraft({ dismissMission: selected, randomObjectPool, customObject });
    navigation.goBack();
  };

  const handleSave = () => {
    const leavingConfiguredCustomObject =
      draft.dismissMission === 'custom_object' && draft.customObject !== null && selected !== 'custom_object';

    if (leavingConfiguredCustomObject) {
      Alert.alert(
        'Change dismiss mission?',
        `You'll need to set up "${draft.customObject?.name}" again if you switch back to Custom Object later.`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Change Mission', style: 'destructive', onPress: commitSave },
        ]
      );
      return;
    }

    commitSave();
  };

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <Header title="Dismiss Mission" onBack={() => navigation.goBack()} />
      <View style={styles.list}>
        {OPTIONS.map((opt) => {
          const isSelected = selected === opt.key;
          return (
            <Pressable
              key={opt.key}
              onPress={() => setSelected(opt.key)}
              style={[styles.card, isSelected && styles.cardSelected]}
              accessibilityRole="button"
              accessibilityState={{ selected: isSelected }}
            >
              <View style={[styles.iconBadge, isSelected && styles.iconBadgeSelected]}>
                {opt.icon(isSelected ? colors.gold : colors.inkDim)}
              </View>
              <View style={styles.cardText}>
                <Text style={styles.cardTitle}>{opt.title}</Text>
                <Text style={styles.cardDescription}>{opt.description}</Text>
              </View>
              <View style={[styles.radioOuter, isSelected && styles.radioOuterSelected]}>
                {isSelected ? <View style={styles.radioInner} /> : null}
              </View>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.footer}>
        <GoldButton label="Save" onPress={handleSave} />
      </View>

      <View style={styles.notice}>
        <BoltIcon />
        <Text style={styles.noticeText}>Once a mission starts, only Emergency Escape can skip it.</Text>
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
    flex: 1,
    paddingHorizontal: 20,
    gap: 12,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.xl,
    padding: 16,
  },
  cardSelected: {
    borderColor: colors.gold,
  },
  iconBadge: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.surface2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBadgeSelected: {
    backgroundColor: colors.goldSoft,
  },
  cardText: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.ink,
  },
  cardDescription: {
    fontSize: 13,
    color: colors.inkDim,
    marginTop: 2,
  },
  radioOuter: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioOuterSelected: {
    borderColor: colors.gold,
    backgroundColor: colors.gold,
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.bg,
  },
  footer: {
    padding: 20,
    paddingBottom: 10,
  },
  notice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 32,
    paddingBottom: 30,
  },
  noticeText: {
    flex: 1,
    fontSize: 12,
    color: colors.inkFaint,
    lineHeight: 17,
  },
});
