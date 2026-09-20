import { registerRootComponent } from 'expo';
import { AppRegistry } from 'react-native';

import App from './App';
import { AlarmRingingRoot } from './src/screens/ringing/AlarmRingingRoot';

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);

// Second entry point: Android's AlarmRingingActivity (see
// modules/uppy-alarm-android) boots straight into this instead of "main" so a
// ringing alarm opens directly to the ringing screen, not the alarm list.
AppRegistry.registerComponent('alarmRinging', () => AlarmRingingRoot);
