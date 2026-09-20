export type EditorStackParamList = {
  AddEditAlarm: undefined;
  SoundPicker: undefined;
  MissionPicker: undefined;
  RandomObjectSetup: undefined;
  CustomObjectSetup: undefined;
};

export type RootStackParamList = {
  AlarmList: undefined;
  Editor: { alarmId?: string };
};

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}
