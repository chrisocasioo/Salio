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
    label: string
  ): Promise<void>;
  cancelAlarm(id: string): void;
}

export default requireNativeModule<UppyAlarmKitModule>('UppyAlarmKit');
