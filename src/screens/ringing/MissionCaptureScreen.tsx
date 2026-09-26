import { CameraView, useCameraPermissions } from 'expo-camera';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, LayoutChangeEvent, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CameraIcon, CheckIcon } from '../../components/icons';
import { t } from '../../i18n';
import { matchesCustomObject } from '../../services/customObjectMatch';
import { labelImage, matchesTarget } from '../../services/imageLabeling';
import { colors, fonts } from '../../theme/theme';
import type { CustomObject, DismissMission } from '../../types/alarm';

// Pause between one scan finishing and the next starting -- not a fixed-rate interval, since a
// classification round trip (capture -> native label/embedding lookup) can itself take a while,
// and firing on a plain setInterval regardless of that would pile up overlapping captures.
const SCAN_PAUSE_MS = 500;
// A miss is the expected, default state while scanning, not an error -- only surface a message if
// capturing/classifying itself keeps failing (a real problem), and only after enough consecutive
// failures that a single camera hiccup doesn't flash a scary message during normal use.
const TROUBLE_AFTER_CONSECUTIVE_ERRORS = 4;
const SCAN_LINE_SWEEP_MS = 1600;
const TROUBLE_COLOR = '#C97B63';

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
  const [viewfinderHeight, setViewfinderHeight] = useState(0);
  const cameraRef = useRef<CameraView>(null);

  const scanLineAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(0)).current;
  const matchAnim = useRef(new Animated.Value(0)).current;

  // A slow, continuous sweep across the frame -- purely decorative (see the corner pulse below for
  // feedback tied to real activity), but it's what reads as "actively looking" at a glance instead
  // of a static box with a spinner bolted underneath it.
  useEffect(() => {
    if (matched) return;
    scanLineAnim.setValue(0);
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(scanLineAnim, {
          toValue: 1,
          duration: SCAN_LINE_SWEEP_MS,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(scanLineAnim, {
          toValue: 0,
          duration: SCAN_LINE_SWEEP_MS,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [matched, scanLineAnim]);

  useEffect(() => {
    if (!matched) return;
    matchAnim.setValue(0);
    Animated.spring(matchAnim, { toValue: 1, friction: 6, tension: 80, useNativeDriver: true }).start();
  }, [matched, matchAnim]);

  // Briefly brightens the corner brackets each time a frame is actually captured -- unlike the
  // scan-line sweep, this is directly tied to scanOnce's own cadence below, so it's a genuine
  // "something just happened" cue rather than a decorative loop running on its own clock.
  const pulseCorners = () => {
    pulseAnim.setValue(1);
    Animated.timing(pulseAnim, {
      toValue: 0,
      duration: 480,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start();
  };

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
      pulseCorners();
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
          setTimeout(onSuccess, 1100);
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

  const handleViewfinderLayout = (event: LayoutChangeEvent) => {
    setViewfinderHeight(event.nativeEvent.layout.height);
  };

  const pulseOpacity = pulseAnim.interpolate({ inputRange: [0, 1], outputRange: [0.55, 1] });
  const pulseScale = pulseAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 1.18] });
  const cornerAnimatedStyle = { opacity: pulseOpacity, transform: [{ scale: pulseScale }] };

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <View style={styles.topBar}>
        <Pressable onPress={onEmergencyEscape} hitSlop={8}>
          <Text style={styles.emergency}>{t('alarmRinging.emergency')}</Text>
        </Pressable>
      </View>

      <View style={styles.titleBlock}>
        <View style={styles.targetBadge}>
          <CameraIcon size={18} color={colors.gold} />
        </View>
        <Text style={styles.targetLabel}>{t('alarmRinging.find', { target: targetLabel })}</Text>
        {canReroll ? (
          <Pressable onPress={onReroll} hitSlop={8} style={styles.rerollChip}>
            <Text style={styles.rerollText}>{t('alarmRinging.reroll')}</Text>
          </Pressable>
        ) : null}
      </View>

      <View style={styles.viewfinderWrap}>
        <View style={styles.viewfinder} onLayout={handleViewfinderLayout}>
          {permission?.granted ? (
            <CameraView ref={cameraRef} style={StyleSheet.absoluteFill} facing="back" />
          ) : (
            <CameraIcon size={40} color={colors.border} />
          )}

          {!matched && viewfinderHeight > 0 ? (
            <Animated.View
              pointerEvents="none"
              style={[
                styles.scanLine,
                {
                  transform: [
                    {
                      translateY: scanLineAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [18, viewfinderHeight - 18],
                      }),
                    },
                  ],
                },
              ]}
            />
          ) : null}

          <Animated.View style={[styles.corner, styles.cornerTL, cornerAnimatedStyle]} />
          <Animated.View style={[styles.corner, styles.cornerTR, cornerAnimatedStyle]} />
          <Animated.View style={[styles.corner, styles.cornerBL, cornerAnimatedStyle]} />
          <Animated.View style={[styles.corner, styles.cornerBR, cornerAnimatedStyle]} />

          {matched ? (
            <Animated.View
              pointerEvents="none"
              style={[
                styles.matchOverlay,
                {
                  opacity: matchAnim,
                  transform: [
                    { scale: matchAnim.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1] }) },
                  ],
                },
              ]}
            >
              <View style={styles.matchBadge}>
                <CheckIcon size={26} color={colors.bg} strokeWidth={3.4} />
              </View>
            </Animated.View>
          ) : null}
        </View>

        <View style={styles.statusRow} accessibilityLiveRegion="polite">
          {matched ? (
            <Text style={styles.statusTextSuccess}>{t('alarmRinging.matchFoundDismissing')}</Text>
          ) : (
            <>
              <ScanningDot inTrouble={inTrouble} />
              <Text style={[styles.statusText, inTrouble && styles.statusTextTrouble]}>
                {t(inTrouble ? 'alarmRinging.somethingWentWrongTryAgain' : 'alarmRinging.scanning')}
              </Text>
            </>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}

/** A slow, continuous breathing dot -- a lighter-weight "I'm alive" cue than a spinner. */
function ScanningDot({ inTrouble }: { inTrouble: boolean }) {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 1, duration: 650, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0, duration: 650, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [anim]);

  const opacity = anim.interpolate({ inputRange: [0, 1], outputRange: [0.35, 1] });
  return <Animated.View style={[styles.dot, inTrouble && styles.dotTrouble, { opacity }]} />;
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: 20,
    paddingTop: 18,
  },
  emergency: {
    color: colors.inkFaint,
    fontSize: 11,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  titleBlock: {
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 4,
    paddingBottom: 18,
    gap: 10,
  },
  targetBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.goldSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  targetLabel: {
    fontFamily: fonts.serif,
    fontSize: 21,
    color: colors.ink,
    textAlign: 'center',
  },
  rerollChip: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  rerollText: {
    fontSize: 12,
    color: colors.inkDim,
  },
  viewfinderWrap: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingBottom: 40,
    gap: 16,
  },
  // expo-camera's CameraView always scales its preview to *cover* (crop-to-fill) whatever bounds
  // it's given on iOS -- there's no "fit"/letterbox option in its API (the `ratio` prop that would
  // otherwise do this is Android-only). Constraining the box to roughly the camera's native ~3:4
  // preview ratio keeps that crop minimal instead of feeling zoomed in.
  viewfinder: {
    width: '100%',
    aspectRatio: 3 / 4,
    borderRadius: 24,
    backgroundColor: colors.surface2,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  scanLine: {
    position: 'absolute',
    left: 16,
    right: 16,
    height: 2,
    borderRadius: 1,
    backgroundColor: colors.gold,
    shadowColor: colors.gold,
    shadowOpacity: 0.9,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 },
  },
  corner: {
    position: 'absolute',
    width: 24,
    height: 24,
    borderColor: colors.gold,
  },
  cornerTL: { top: 16, left: 16, borderTopWidth: 2.5, borderLeftWidth: 2.5, borderRadius: 4 },
  cornerTR: { top: 16, right: 16, borderTopWidth: 2.5, borderRightWidth: 2.5, borderRadius: 4 },
  cornerBL: { bottom: 16, left: 16, borderBottomWidth: 2.5, borderLeftWidth: 2.5, borderRadius: 4 },
  cornerBR: { bottom: 16, right: 16, borderBottomWidth: 2.5, borderRightWidth: 2.5, borderRadius: 4 },
  matchOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(201,163,78,0.22)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  matchBadge: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.gold,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    minHeight: 20,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.gold,
  },
  dotTrouble: {
    backgroundColor: TROUBLE_COLOR,
  },
  statusText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.inkDim,
  },
  statusTextTrouble: {
    color: TROUBLE_COLOR,
  },
  statusTextSuccess: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.gold,
  },
});
