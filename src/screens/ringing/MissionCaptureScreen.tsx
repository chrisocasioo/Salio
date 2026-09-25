import { CameraView, useCameraPermissions } from 'expo-camera';
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CameraIcon } from '../../components/icons';
import { t } from '../../i18n';
import { matchesCustomObject } from '../../services/customObjectMatch';
import { labelImage, matchesTarget } from '../../services/imageLabeling';
import { colors } from '../../theme/theme';
import type { CustomObject, DismissMission } from '../../types/alarm';

// Pause between one scan finishing and the next starting -- not a fixed-rate interval, since a
// classification round trip (capture -> native label/embedding lookup) can itself take a while,
// and firing on a plain setInterval regardless of that would pile up overlapping captures.
const SCAN_PAUSE_MS = 500;
// A miss is the expected, default state while scanning, not an error -- only surface a message if
// capturing/classifying itself keeps failing (a real problem), and only after enough consecutive
// failures that a single camera hiccup doesn't flash a scary message during normal use.
const TROUBLE_AFTER_CONSECUTIVE_ERRORS = 4;

export function MissionCaptureScreen({
  mission,
  targetKey,
  targetLabel,
  customObject,
  canReroll,
  onReroll,
  onSuccess,
  onEmergencyEscape,
}: {
  mission: DismissMission;
  targetKey: string;
  targetLabel: string;
  customObject: CustomObject | null;
  canReroll?: boolean;
  onReroll?: () => void;
  onSuccess: () => void;
  onEmergencyEscape: () => void;
}) {
  const [permission, requestPermission] = useCameraPermissions();
  const [matched, setMatched] = useState(false);
  const [inTrouble, setInTrouble] = useState(false);
  const cameraRef = useRef<CameraView>(null);

  // Runs the whole continuous-scan loop: as soon as the camera's ready, keep capturing and
  // checking frames on its own, with no button to tap, until one matches. Re-runs (restarting the
  // loop against the new target) whenever the mission target changes, e.g. after a reroll.
  useEffect(() => {
    if (permission === null) return;
    if (!permission.granted) {
      requestPermission();
      return;
    }

    let cancelled = false;
    let timeoutId: ReturnType<typeof setTimeout>;
    let consecutiveErrors = 0;

    const checkPhoto = async (uri: string): Promise<boolean> => {
      if (mission === 'custom_object' && customObject) {
        return matchesCustomObject(uri, customObject);
      }
      const labels = await labelImage(uri);
      return matchesTarget(labels, targetKey, targetLabel);
    };

    const scanOnce = async () => {
      try {
        const photo = await cameraRef.current?.takePictureAsync({ quality: 0.4 });
        if (cancelled) return;
        if (!photo?.uri) throw new Error('no photo uri');

        const isMatch = await checkPhoto(photo.uri);
        if (cancelled) return;
        consecutiveErrors = 0;
        setInTrouble(false);

        if (isMatch) {
          setMatched(true);
          setTimeout(onSuccess, 900);
          return; // stop scanning -- the mission is complete
        }
      } catch {
        consecutiveErrors += 1;
        if (!cancelled) setInTrouble(consecutiveErrors >= TROUBLE_AFTER_CONSECUTIVE_ERRORS);
      }
      if (!cancelled) {
        timeoutId = setTimeout(scanOnce, SCAN_PAUSE_MS);
      }
    };

    setMatched(false);
    setInTrouble(false);
    scanOnce();

    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
    };
  }, [permission, mission, targetKey, targetLabel, customObject]);

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <CameraIcon size={16} color={colors.goldLight} />
          <Text style={styles.headerLabel}>{t('alarmRinging.find', { target: targetLabel })}</Text>
        </View>
        <Pressable onPress={onEmergencyEscape}>
          <Text style={styles.emergency}>{t('alarmRinging.emergency')}</Text>
        </Pressable>
      </View>

      {canReroll ? (
        <Pressable onPress={onReroll} hitSlop={8} style={styles.rerollRow}>
          <Text style={styles.rerollText}>{t('alarmRinging.reroll')}</Text>
        </Pressable>
      ) : null}

      <View style={styles.viewfinderWrap}>
        <View style={styles.viewfinder}>
          {permission?.granted ? (
            <CameraView ref={cameraRef} style={StyleSheet.absoluteFill} facing="back" />
          ) : (
            <CameraIcon size={40} color={colors.border} />
          )}
          <View style={[styles.corner, styles.cornerTL]} />
          <View style={[styles.corner, styles.cornerTR]} />
          <View style={[styles.corner, styles.cornerBL]} />
          <View style={[styles.corner, styles.cornerBR]} />

          {matched ? (
            <View style={[styles.banner, styles.bannerSuccess]}>
              <Text style={[styles.bannerText, styles.bannerTextSuccess]}>
                {t('alarmRinging.matchFoundDismissing')}
              </Text>
            </View>
          ) : (
            <View style={styles.banner}>
              <ActivityIndicator size="small" color={colors.inkDim} />
              <Text style={styles.bannerText}>
                {t(inTrouble ? 'alarmRinging.somethingWentWrongTryAgain' : 'alarmRinging.scanning')}
              </Text>
            </View>
          )}
        </View>
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
  rerollRow: {
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  rerollText: {
    fontSize: 12,
    color: colors.inkDim,
    textDecorationLine: 'underline',
  },
  // expo-camera's CameraView always scales its preview to *cover* (crop-to-fill) whatever bounds
  // it's given on iOS -- there's no "fit"/letterbox option in its API (the `ratio` prop that would
  // otherwise do this is Android-only). A container that stretches to fill all remaining vertical
  // space ends up far taller/narrower than the camera sensor's native ~3:4 preview, so covering it
  // means cropping in hard on the frame -- effectively "zoomed in" and hard to fit an object into.
  // Constraining the box to roughly that same 3:4 ratio instead keeps the crop minimal.
  viewfinderWrap: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  viewfinder: {
    width: '100%',
    aspectRatio: 3 / 4,
    borderRadius: 24,
    backgroundColor: colors.surface2,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  corner: {
    position: 'absolute',
    width: 22,
    height: 22,
    borderColor: colors.gold,
  },
  cornerTL: { top: 18, left: 18, borderTopWidth: 2, borderLeftWidth: 2, borderRadius: 4 },
  cornerTR: { top: 18, right: 18, borderTopWidth: 2, borderRightWidth: 2, borderRadius: 4 },
  cornerBL: { bottom: 18, left: 18, borderBottomWidth: 2, borderLeftWidth: 2, borderRadius: 4 },
  cornerBR: { bottom: 18, right: 18, borderBottomWidth: 2, borderRightWidth: 2, borderRadius: 4 },
  banner: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 999,
    paddingVertical: 10,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  bannerSuccess: {
    backgroundColor: colors.goldSoft,
    borderColor: colors.gold,
  },
  bannerText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.inkDim,
  },
  bannerTextSuccess: {
    color: colors.gold,
  },
});
