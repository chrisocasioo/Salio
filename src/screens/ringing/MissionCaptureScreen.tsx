import { CameraView, useCameraPermissions } from 'expo-camera';
import React, { useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CameraIcon } from '../../components/icons';
import { matchesCustomObject } from '../../services/customObjectMatch';
import { labelImage, matchesTarget } from '../../services/imageLabeling';
import { colors } from '../../theme/theme';
import type { CustomObject, DismissMission } from '../../types/alarm';

type BannerState = { text: string; tone: 'neutral' | 'retry' | 'success' } | null;

export function MissionCaptureScreen({
  mission,
  targetKey,
  targetLabel,
  customObject,
  onSuccess,
  onEmergencyEscape,
}: {
  mission: DismissMission;
  targetKey: string;
  targetLabel: string;
  customObject: CustomObject | null;
  onSuccess: () => void;
  onEmergencyEscape: () => void;
}) {
  const [permission, requestPermission] = useCameraPermissions();
  const [banner, setBanner] = useState<BannerState>(null);
  const [busy, setBusy] = useState(false);
  const cameraRef = useRef<CameraView>(null);

  const checkPhoto = async (uri: string): Promise<boolean> => {
    if (mission === 'custom_object' && customObject) {
      return matchesCustomObject(uri, customObject);
    }
    const labels = await labelImage(uri);
    return matchesTarget(labels, targetKey, targetLabel);
  };

  const shoot = async () => {
    if (busy) return;
    if (!permission?.granted) {
      const res = await requestPermission();
      if (!res.granted) return;
    }
    setBusy(true);
    try {
      const photo = await cameraRef.current?.takePictureAsync({ quality: 0.5 });
      if (!photo?.uri) {
        setBanner({ text: 'Could not take photo — try again', tone: 'retry' });
        return;
      }
      const matched = await checkPhoto(photo.uri);
      if (matched) {
        setBanner({ text: 'Match found — dismissing…', tone: 'success' });
        setTimeout(onSuccess, 900);
      } else {
        setBanner({ text: 'Not quite — try again', tone: 'retry' });
      }
    } catch {
      setBanner({ text: 'Something went wrong — try again', tone: 'retry' });
    } finally {
      setBusy(false);
    }
  };

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
        {permission?.granted ? (
          <CameraView ref={cameraRef} style={StyleSheet.absoluteFill} facing="back" />
        ) : (
          <CameraIcon size={40} color={colors.border} />
        )}
        <View style={[styles.corner, styles.cornerTL]} />
        <View style={[styles.corner, styles.cornerTR]} />
        <View style={[styles.corner, styles.cornerBL]} />
        <View style={[styles.corner, styles.cornerBR]} />

        {banner ? (
          <View
            style={[
              styles.banner,
              banner.tone === 'success' && styles.bannerSuccess,
            ]}
          >
            <Text style={[styles.bannerText, banner.tone === 'success' && styles.bannerTextSuccess]}>
              {banner.text}
            </Text>
          </View>
        ) : null}
      </View>

      <View style={styles.footer}>
        <Pressable onPress={shoot} style={styles.shutter} accessibilityLabel="Take photo" disabled={busy}>
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
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 999,
    paddingVertical: 10,
    paddingHorizontal: 14,
    alignItems: 'center',
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
