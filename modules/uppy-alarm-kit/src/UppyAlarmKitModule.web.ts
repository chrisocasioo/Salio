import { registerWebModule, NativeModule } from 'expo';

// UppyAlarmKitModule is not available on the web platform.
class UppyAlarmKitModule extends NativeModule<{}> {}

export default registerWebModule(UppyAlarmKitModule, 'UppyAlarmKitModule');
