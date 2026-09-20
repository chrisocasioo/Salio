import { useCameraPermissions } from 'expo-camera';
import React, { useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AlarmClockIcon, CameraIcon, CheckIcon } from '../components/icons';
import { GoldButton } from '../components/GoldButton';
import {
  canScheduleExactAlarms,
  isIgnoringBatteryOptimizations,
  openExactAlarmSettings,
  requestAlarmPermissions,
  requestIgnoreBatteryOptimizations,
  requestNotificationPermission,
} from '../services/alarmScheduler';
import { colors, fonts, radii } from '../theme/theme';

const ANDROID_EXACT_ALARM_MIN_SDK = 31;
const isAndroid = Platform.OS === 'android';
const androidSdkInt = isAndroid ? (Platform.Version as number) : 0;

export function OnboardingScreen({ onDone }: { onDone: () => void }) {
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [alarmsGranted, setAlarmsGranted] = useState(false);
  const [notificationsGranted, setNotificationsGranted] = useState(false);
  const [exactAlarmGranted, setExactAlarmGranted] = useState(() => (isAndroid ? canScheduleExactAlarms() : true));
  const [batteryGranted, setBatteryGranted] = useState(() => (isAndroid ? isIgnoringBatteryOptimizations() : true));

  const handleAlarms = async () => {
    await requestAlarmPermissions();
    setAlarmsGranted(true);
    if (isAndroid) setExactAlarmGranted(canScheduleExactAlarms());
  };

  const handleNotifications = async () => {
    await requestNotificationPermission();
    setNotificationsGranted(true);
  };

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.logoBadge}>
          <AlarmClockIcon size={26} color={colors.gold} />
        </View>
        <Text style={styles.title}>Welcome to Uppy</Text>
        <Text style={styles.subtitle}>
          A few permissions so your alarms ring reliably, even through silent mode and a locked
          screen.
        </Text>

        <PermissionRow
          title="Alarms"
          description={
            isAndroid
              ? 'Lets Uppy schedule exact alarms that ring on time.'
              : 'Lets Uppy schedule alarms through AlarmKit.'
          }
          granted={alarmsGranted}
          onPress={handleAlarms}
        />

        <PermissionRow
          title="Camera"
          description="Only used to check a dismiss-mission photo — never uploaded anywhere."
          granted={cameraPermission?.granted ?? false}
          onPress={() => requestCameraPermission()}
        />

        {isAndroid && (
          <PermissionRow
            title="Notifications"
            description="Needed to show the full-screen alarm when it rings."
            granted={notificationsGranted}
            onPress={handleNotifications}
          />
        )}

        {isAndroid && androidSdkInt >= ANDROID_EXACT_ALARM_MIN_SDK && (
          <PermissionRow
            title="Exact alarms"
            description="Android requires this separately so alarms aren't delayed."
            granted={exactAlarmGranted}
            onPress={() => {
              openExactAlarmSettings();
              setExactAlarmGranted(canScheduleExactAlarms());
            }}
          />
        )}

        {isAndroid && (
          <PermissionRow
            title="Battery optimization"
            description="Exempts Uppy so the system doesn't stop it from ringing on time."
            granted={batteryGranted}
            onPress={() => {
              requestIgnoreBatteryOptimizations();
              setBatteryGranted(isIgnoringBatteryOptimizations());
            }}
          />
        )}
      </ScrollView>

      <View style={styles.footer}>
        <GoldButton label="Continue" onPress={onDone} />
      </View>
    </SafeAreaView>
  );
}

function PermissionRow({
  title,
  description,
  granted,
  onPress,
}: {
  title: string;
  description: string;
  granted: boolean;
  onPress: () => void;
}) {
  return (
    <View style={styles.row}>
      <View style={styles.rowIcon}>
        <CameraIcon size={18} color={colors.gold} />
      </View>
      <View style={styles.rowText}>
        <Text style={styles.rowTitle}>{title}</Text>
        <Text style={styles.rowDescription}>{description}</Text>
      </View>
      <Pressable
        onPress={onPress}
        disabled={granted}
        style={[styles.rowButton, granted && styles.rowButtonGranted]}
      >
        {granted ? <CheckIcon size={16} color={colors.gold} /> : <Text style={styles.rowButtonText}>Allow</Text>}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  content: {
    padding: 24,
    paddingTop: 40,
    gap: 16,
  },
  logoBadge: {
    alignSelf: 'center',
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: colors.goldSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  title: {
    fontFamily: fonts.serif,
    fontSize: 26,
    color: colors.ink,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: colors.inkDim,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
    padding: 14,
  },
  rowIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: colors.goldSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowText: {
    flex: 1,
  },
  rowTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.ink,
  },
  rowDescription: {
    fontSize: 12,
    color: colors.inkDim,
    marginTop: 2,
  },
  rowButton: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.gold,
  },
  rowButtonGranted: {
    borderColor: colors.goldSoft,
    backgroundColor: colors.goldSoft,
    paddingHorizontal: 10,
  },
  rowButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.gold,
  },
  footer: {
    padding: 20,
    paddingBottom: 24,
  },
});
