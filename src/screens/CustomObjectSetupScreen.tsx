import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { CameraView, useCameraPermissions } from 'expo-camera';
import React, { useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GoldButton } from '../components/GoldButton';
import { Header } from '../components/Header';
import { CameraIcon, CheckIcon } from '../components/icons';
import { useAlarmDraft } from '../context/AlarmDraftContext';
import type { EditorStackParamList } from '../navigation/types';
import { embedReferencePhotos } from '../services/customObjectMatch';
import { colors, radii } from '../theme/theme';

type Props = NativeStackScreenProps<EditorStackParamList, 'CustomObjectSetup'>;

const MAX_PHOTOS = 3;
const MIN_PHOTOS = 2;

export function CustomObjectSetupScreen({ navigation }: Props) {
  const { draft, updateDraft } = useAlarmDraft();
  const [name, setName] = useState(draft.customObject?.name ?? '');
  const [photoUris, setPhotoUris] = useState<string[]>([]);
  const [permission, requestPermission] = useCameraPermissions();
  const [saving, setSaving] = useState(false);
  const [busy, setBusy] = useState(false);
  const cameraRef = useRef<CameraView>(null);

  const atMax = photoUris.length >= MAX_PHOTOS;
  const canSave = name.trim().length > 0 && photoUris.length >= MIN_PHOTOS && !saving;

  const capture = async () => {
    if (busy || atMax) return;
    if (!permission?.granted) {
      await requestPermission();
      return;
    }
    setBusy(true);
    try {
      const photo = await cameraRef.current?.takePictureAsync({ quality: 0.6 });
      if (photo?.uri) {
        setPhotoUris((prev) => [...prev, photo.uri].slice(0, MAX_PHOTOS));
      }
    } finally {
      setBusy(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const embeddings = await embedReferencePhotos(photoUris);
      updateDraft({ customObject: { name: name.trim(), embeddings } });
      navigation.goBack();
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <Header title="Custom Object" onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>Name</Text>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="e.g. Blue Mug"
            placeholderTextColor={colors.inkFaint}
            style={styles.input}
          />
        </View>

        <Pressable
          style={styles.viewfinder}
          onPress={!permission?.granted ? requestPermission : undefined}
          disabled={permission?.granted}
        >
          {permission?.granted ? (
            <CameraView ref={cameraRef} style={StyleSheet.absoluteFill} facing="back" />
          ) : (
            <>
              <CameraIcon size={34} color={colors.inkFaint} />
              <Text style={styles.captureHint}>Tap to enable the camera</Text>
            </>
          )}
          <View pointerEvents="none" style={[styles.corner, styles.cornerTL]} />
          <View pointerEvents="none" style={[styles.corner, styles.cornerTR]} />
          <View pointerEvents="none" style={[styles.corner, styles.cornerBL]} />
          <View pointerEvents="none" style={[styles.corner, styles.cornerBR]} />
          {permission?.granted ? (
            <Text pointerEvents="none" style={styles.centerHint}>
              Center the object
            </Text>
          ) : null}
        </Pressable>

        <Pressable
          onPress={capture}
          style={[styles.shutter, (atMax || busy) && styles.shutterDisabled]}
          accessibilityLabel="Take photo"
          disabled={atMax || busy}
        >
          <View style={styles.shutterInner} />
        </Pressable>

        <View style={styles.slots}>
          {[1, 2, 3].map((n) => {
            const filled = n <= photoUris.length;
            return (
              <View key={n} style={[styles.slot, filled ? styles.slotFilled : styles.slotEmpty]}>
                {filled ? <CheckIcon size={20} color={colors.bg} strokeWidth={3} /> : <Text style={styles.slotNumber}>{n}</Text>}
              </View>
            );
          })}
        </View>

        <Text style={styles.helperText}>
          {atMax
            ? 'That’s enough — tap Save Object below.'
            : 'Take at least 2 photos, in the lighting you’ll use each morning.'}
        </Text>

        {saving ? (
          <ActivityIndicator color={colors.gold} />
        ) : (
          <GoldButton label="Save Object" onPress={handleSave} disabled={!canSave} />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 24,
    gap: 20,
  },
  fieldGroup: {
    gap: 8,
  },
  fieldLabel: {
    fontSize: 12,
    color: colors.inkFaint,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingVertical: 14,
    paddingHorizontal: 16,
    color: colors.ink,
    fontSize: 16,
  },
  viewfinder: {
    alignSelf: 'center',
    width: 260,
    height: 260,
    borderRadius: radii.xxl,
    backgroundColor: colors.surface2,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    gap: 10,
  },
  captureHint: {
    fontSize: 12,
    color: colors.inkFaint,
  },
  centerHint: {
    position: 'absolute',
    bottom: 14,
    fontSize: 12,
    color: colors.inkFaint,
    backgroundColor: 'rgba(21,18,13,0.6)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  corner: {
    position: 'absolute',
    width: 18,
    height: 18,
    borderColor: colors.gold,
  },
  cornerTL: { top: 14, left: 14, borderTopWidth: 2, borderLeftWidth: 2, borderRadius: 4 },
  cornerTR: { top: 14, right: 14, borderTopWidth: 2, borderRightWidth: 2, borderRadius: 4 },
  cornerBL: { bottom: 14, left: 14, borderBottomWidth: 2, borderLeftWidth: 2, borderRadius: 4 },
  cornerBR: { bottom: 14, right: 14, borderBottomWidth: 2, borderRightWidth: 2, borderRadius: 4 },
  shutter: {
    alignSelf: 'center',
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.bg,
    borderWidth: 4,
    borderColor: colors.gold,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shutterDisabled: {
    opacity: 0.4,
  },
  shutterInner: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.gold,
  },
  slots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 14,
  },
  slot: {
    width: 64,
    height: 64,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  slotFilled: {
    backgroundColor: colors.gold,
  },
  slotEmpty: {
    borderWidth: 1.5,
    borderColor: colors.border,
    borderStyle: 'dashed',
  },
  slotNumber: {
    color: colors.inkFaint,
    fontSize: 13,
  },
  helperText: {
    textAlign: 'center',
    fontSize: 12,
    color: colors.inkFaint,
    lineHeight: 18,
  },
});
