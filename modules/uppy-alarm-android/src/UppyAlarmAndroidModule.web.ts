import { registerWebModule, NativeModule } from 'expo';

// UppyAlarmAndroidModule is not available on the web platform.
class UppyAlarmAndroidModule extends NativeModule<{}> {}

export default registerWebModule(UppyAlarmAndroidModule, 'UppyAlarmAndroidModule');
