// Re-export the native module. On web, it will be resolved to UppyAlarmAndroidModule.web.ts
// and on native platforms to UppyAlarmAndroidModule.ts
export { default } from './src/UppyAlarmAndroidModule';
export * from './src/UppyAlarmAndroid.types';
