import { NativeModule, requireNativeModule } from 'expo';
import type { AlarmKitAuthorizationStatus } from './UppyAlarmKit.types';

type UppyAlarmKitEvents = {
  /** Sent the moment a ringing alarm's notification or AlarmKit alert is tapped -- see
   * UppyAlarmKitModule.swift's notifyAlarmTapped for why this exists alongside
   * getPendingRingingAlarmId's poll-on-foreground check. */
  onAlarmTapped(payload: { alarmId: string }): void;
};

declare class UppyAlarmKitModule extends NativeModule<UppyAlarmKitEvents> {
  /** Requests notification permission (needed for the ringing alert's lock-screen banner). */
  requestAuthorization(): Promise<AlarmKitAuthorizationStatus>;
  scheduleAlarm(
    id: string,
    hour: number,
    minute: number,
    repeatOnce: boolean,
    days: number[],
    label: string,
    hasMission: boolean
  ): Promise<void>;
  cancelAlarm(id: string): void;
  /** Actually stops the alarm ringing once its dismiss mission (or Emergency Escape) completes. */
  stopRinging(id: string): Promise<void>;
  /** Set when the ringing notification opened the app; null otherwise. */
  getPendingRingingAlarmId(): string | null;
  clearPendingRingingAlarmId(): void;
}

export default requireNativeModule<UppyAlarmKitModule>('UppyAlarmKit');
