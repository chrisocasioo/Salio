import { NativeModule, requireNativeModule } from 'expo';
import type { AlarmSound } from './UppyAlarmAndroid.types';

declare class UppyAlarmAndroidModule extends NativeModule<{}> {
  scheduleAlarm(
    id: string,
    hour: number,
    minute: number,
    repeatOnce: boolean,
    days: number[],
    label: string,
    soundUri: string | null,
    hasMission: boolean
  ): void;
  cancelAlarm(id: string): void;
  dismissAlarm(id: string): void;
  canScheduleExactAlarms(): boolean;
  openExactAlarmSettings(): void;
  isIgnoringBatteryOptimizations(): boolean;
  requestIgnoreBatteryOptimizations(): void;
  listAlarmSounds(): AlarmSound[];
  getDefaultAlarmSoundUri(): string | null;
}

export default requireNativeModule<UppyAlarmAndroidModule>('UppyAlarmAndroid');
