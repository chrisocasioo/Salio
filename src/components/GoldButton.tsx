import React from 'react';
import { Pressable, StyleSheet, Text, ViewStyle } from 'react-native';
import { colors, radii } from '../theme/theme';

export function GoldButton({
  label,
  onPress,
  disabled,
  pill,
  style,
}: {
  label: string;
  onPress?: () => void;
  disabled?: boolean;
  pill?: boolean;
  style?: ViewStyle;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={[
        styles.button,
        pill && styles.pill,
        disabled && styles.disabled,
        style,
      ]}
    >
      <Text style={styles.label}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: colors.gold,
    borderRadius: radii.md,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pill: {
    borderRadius: radii.pill,
  },
  disabled: {
    opacity: 0.45,
  },
  label: {
    color: colors.bg,
    fontSize: 16,
    fontWeight: '600',
  },
});
