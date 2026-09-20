import { NativeModule, requireNativeModule } from 'expo';
import type { AlarmKitAuthorizationStatus } from './UppyAlarmKit.types';

declare class UppyAlarmKitModule extends NativeModule<{}> {
  requestAuthorization(): Promise<AlarmKitAuthorizationStatus>;
  getAuthorizationStatus(): AlarmKitAuthorizationStatus;
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
  /** Actually silences AlarmKit for this alarm once its dismiss mission (or Emergency Escape) completes. */
  stopRinging(id: string): Promise<void>;
  /** Set when the "Dismiss Mission" alert button opened the app; null otherwise. */
  getPendingRingingAlarmId(): string | null;
  clearPendingRingingAlarmId(): void;
}

export default requireNativeModule<UppyAlarmKitModule>('UppyAlarmKit');
