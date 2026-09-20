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
  const [showCamera, setShowCamera] = useState(false);
  const [saving, setSaving] = useState(false);
  const cameraRef = useRef<CameraView>(null);

  const canSave = name.trim().length > 0 && photoUris.length >= MIN_PHOTOS && !saving;

  const openCamera = async () => {
    if (photoUris.length >= MAX_PHOTOS) return;
    if (!permission?.granted) {
      const res = await requestPermission();
      if (!res.granted) return;
    }
    setShowCamera(true);
  };

  const capture = async () => {
    const photo = await cameraRef.current?.takePictureAsync({ quality: 0.6 });
    if (photo?.uri) {
      setPhotoUris((prev) => [...prev, photo.uri].slice(0, MAX_PHOTOS));
    }
    setShowCamera(false);
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

  if (showCamera) {
    return (
      <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
        <CameraView ref={cameraRef} style={styles.camera} facing="back">
          <View style={styles.cameraOverlay}>
            <Pressable onPress={capture} style={styles.shutter} accessibilityLabel="Capture photo" />
            <Pressable onPress={() => setShowCamera(false)} style={styles.cancelCamera}>
              <Text style={styles.cancelCameraText}>Cancel</Text>
            </Pressable>
          </View>
        </CameraView>
      </SafeAreaView>
    );
  }

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

        <View style={styles.captureFrame}>
          <CameraIcon size={34} color={colors.inkFaint} />
          <Text style={styles.captureHint}>Center the object</Text>
        </View>

        <Pressable
          onPress={openCamera}
          style={styles.shutterButton}
          accessibilityLabel="Capture photo"
          disabled={photoUris.length >= MAX_PHOTOS}
        />

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

        <Text style={styles.helperText}>Take at least 2 photos, in the lighting you'll use each morning.</Text>

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
  captureFrame: {
    alignSelf: 'center',
    width: 260,
    height: 260,
    borderRadius: radii.xxl,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderStyle: 'dashed',
    backgroundColor: colors.surface2,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  captureHint: {
    fontSize: 12,
    color: colors.inkFaint,
  },
  shutterButton: {
    alignSelf: 'center',
    width: 66,
    height: 66,
    borderRadius: 33,
    backgroundColor: colors.gold,
    borderWidth: 4,
    borderColor: colors.goldSoft,
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
  camera: {
    flex: 1,
  },
  cameraOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingBottom: 40,
    gap: 16,
  },
  shutter: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.gold,
    borderWidth: 4,
    borderColor: '#fff',
  },
  cancelCamera: {
    padding: 10,
  },
  cancelCameraText: {
    color: '#fff',
    fontSize: 15,
  },
});
