// Re-export the native module. On web, it will be resolved to UppyAlarmKitModule.web.ts
// and on native platforms to UppyAlarmKitModule.ts
export { default } from './src/UppyAlarmKitModule';
export * from './src/UppyAlarmKit.types';
