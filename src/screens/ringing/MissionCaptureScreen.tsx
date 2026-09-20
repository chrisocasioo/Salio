import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CameraIcon } from '../../components/icons';
import { colors } from '../../theme/theme';

/**
 * Placeholder for Stage 4/5: the real screen runs the camera + ML Kit image labeling (Random
 * Object) or the MediaPipe Image Embedder (Custom Object) against the live capture. For now this
 * lets the ringing flow's "Start Mission" button navigate somewhere and still dismiss the alarm,
 * so Stage 2's "Dismiss wired on both" is testable end to end.
 */
export function MissionCaptureScreen({ targetLabel, onEmergencyEscape, onDismiss }: {
  targetLabel: string;
  onEmergencyEscape: () => void;
  onDismiss: () => void;
}) {
  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <CameraIcon size={16} color={colors.goldLight} />
          <Text style={styles.headerLabel}>Find: {targetLabel}</Text>
        </View>
        <Pressable onPress={onEmergencyEscape}>
          <Text style={styles.emergency}>Emergency</Text>
        </Pressable>
      </View>

      <View style={styles.viewfinder}>
        <CameraIcon size={40} color={colors.border} />
      </View>

      <View style={styles.footer}>
        <Pressable onPress={onDismiss} style={styles.shutter} accessibilityLabel="Take photo">
          <View style={styles.shutterInner} />
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 26,
    paddingBottom: 14,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerLabel: {
    color: colors.goldLight,
    fontSize: 14,
    fontWeight: '600',
  },
  emergency: {
    color: colors.inkFaint,
    fontSize: 11,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  viewfinder: {
    flex: 1,
    marginHorizontal: 20,
    marginBottom: 16,
    borderRadius: 24,
    backgroundColor: colors.surface2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footer: {
    alignItems: 'center',
    paddingBottom: 40,
  },
  shutter: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.bg,
    borderWidth: 4,
    borderColor: colors.gold,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shutterInner: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.gold,
  },
});
