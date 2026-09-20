import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, fonts } from '../../theme/theme';

/**
 * Placeholder for Stage 6: the real screen implements the moving 100/+100/30-day-reset tap
 * target from the build brief. For now it dismisses immediately so the ringing flow (Stage 2's
 * scope) has somewhere for "Emergency" to lead while a mission is active.
 */
export function EmergencyEscapeScreen({ onDismiss }: { onDismiss: () => void }) {
  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <Text style={styles.title}>Emergency Mode</Text>
      <Text style={styles.subtitle}>Full tap-counter escape lands in Stage 6.</Text>
      <Pressable onPress={onDismiss} style={styles.button}>
        <Text style={styles.buttonText}>Dismiss Alarm</Text>
      </Pressable>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    padding: 24,
  },
  title: {
    fontFamily: fonts.serif,
    fontSize: 24,
    color: colors.ink,
  },
  subtitle: {
    fontSize: 13,
    color: colors.inkDim,
    textAlign: 'center',
  },
  button: {
    backgroundColor: colors.gold,
    borderRadius: 999,
    paddingVertical: 14,
    paddingHorizontal: 28,
  },
  buttonText: {
    color: colors.bg,
    fontSize: 15,
    fontWeight: '600',
  },
});
