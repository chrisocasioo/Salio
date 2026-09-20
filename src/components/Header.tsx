import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, fonts } from '../theme/theme';
import { ChevronLeftIcon } from './icons';

export function Header({
  title,
  onBack,
  rightLabel,
  onRightPress,
  rightDisabled,
}: {
  title: string;
  onBack?: () => void;
  rightLabel?: string;
  onRightPress?: () => void;
  rightDisabled?: boolean;
}) {
  return (
    <View style={styles.row}>
      <Pressable onPress={onBack} hitSlop={8} style={styles.side} accessibilityLabel="Back" accessibilityRole="button">
        {onBack ? <ChevronLeftIcon color={colors.inkDim} /> : null}
      </Pressable>
      <Text style={styles.title} numberOfLines={1}>
        {title}
      </Text>
      <Pressable
        onPress={onRightPress}
        hitSlop={8}
        style={[styles.side, styles.sideRight]}
        disabled={!onRightPress || rightDisabled}
      >
        {rightLabel ? (
          <Text style={[styles.rightText, rightDisabled && styles.rightTextDisabled]}>{rightLabel}</Text>
        ) : null}
      </Pressable>
    </View>
  );
}

const SIDE_WIDTH = 60;

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 26,
    paddingBottom: 10,
    paddingHorizontal: 16,
  },
  side: {
    width: SIDE_WIDTH,
    height: 36,
    justifyContent: 'center',
  },
  sideRight: {
    alignItems: 'flex-end',
  },
  title: {
    flex: 1,
    textAlign: 'center',
    fontFamily: fonts.serif,
    fontSize: 19,
    color: colors.ink,
  },
  rightText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.gold,
    padding: 8,
  },
  rightTextDisabled: {
    color: colors.inkFaint,
  },
});
