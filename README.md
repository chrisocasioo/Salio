# Uppy

A simple alarm app for iOS and Android with no snooze — dismissing is the
only way an alarm stops. Alarms can optionally require a "dismiss mission"
(photographing an object) before they'll stop ringing. Fully on-device: no
accounts, no backend, no analytics.

See the full spec in the build brief this repo was built from (data model,
locked scope decisions, and the stage-by-stage plan). Design reference:
black-and-gold theme, EB Garamond display type, 10 artboards covering every
screen.

## Stack

- Expo / React Native, TypeScript
- `expo-sqlite` for local persistence (no server, no sync)
- `@react-navigation` (native-stack) for navigation
- `expo-camera` for dismiss-mission photo capture
- `expo-localization` for the device's 12/24-hour clock setting
- Native modules (Swift/Kotlin) for AlarmKit / AlarmManager scheduling,
  ML Kit image labeling, and a MediaPipe Image Embedder — **these require an
  EAS dev client build; Expo Go will not run this app past Stage 0.**

## Running

```
npm install
npx expo run:ios      # or: npx expo run:android
```

Because of the custom native modules, day-to-day development also works via
an EAS dev client:

```
eas build --profile development --platform ios
eas build --profile development --platform android
npx expo start --dev-client
```

`npm run typecheck` runs `tsc --noEmit`.

## Project structure

```
src/
  types/       Alarm, EmergencyEscapeState data model
  db/          expo-sqlite schema + CRUD
  theme/       colors, fonts, spacing tokens (black-and-gold theme)
  components/  shared UI: Header, GoldButton, WheelPicker, icons
  context/     AlarmDraftContext — the in-progress alarm shared by
               Add/Edit Alarm, Sound Picker, and Mission Picker so a
               choice on a sub-screen shows up immediately on return
  navigation/  RootNavigator (Alarm List, Editor) and the nested
               EditorNavigator stack for the alarm-editing flow
  screens/     one file per screen; screens/ringing/ is the second,
               ringing-only RN root Android's full-screen alarm Activity
               boots into (see Native modules below)
  services/    alarmRepository (sqlite + native scheduling) and
               alarmScheduler (the Platform.OS-dispatched native calls)

modules/
  uppy-alarm-kit/      iOS-only Expo module wrapping AlarmKit
  uppy-alarm-android/  Android-only Expo module: AlarmManager scheduling,
                       the ringing foreground service, the full-screen
                       ringing Activity, and boot/timezone receivers
```

## Native modules

Both are local Expo modules (autolinked from `modules/`, no separate npm
package): `uppy-alarm-kit` (iOS) and `uppy-alarm-android` (Android). See
each module's Kotlin/Swift sources for the implementation; the short version:

- **Android** re-arms one AlarmManager occurrence at a time (self-rescheduling
  on repeat, rather than the drifting/inexact `setRepeating`), and keeps a
  lightweight duplicate of every enabled alarm's schedule in SharedPreferences
  purely so `BootTimezoneReceiver` can re-arm everything after a reboot,
  timezone change, or date change without needing the JS runtime or sqlite.
  `RingingService` is a foreground service that holds the wake lock, plays
  looping audio on the alarm stream, and posts the full-screen notification.
  That notification's full-screen intent opens `AlarmRingingActivity`, a
  second `ReactActivity` that shares the app's existing `ReactNativeHost` and
  boots straight into a second RN root (`alarmRinging`, registered in
  `index.ts`) instead of the normal app root — see
  `src/screens/ringing/AlarmRingingRoot.tsx`.
- **iOS** just wraps `AlarmManager`/`AlarmConfiguration`/`stopIntent`.
  AlarmKit owns the entire ringing UI (lock screen alert, Live Activity,
  Dynamic Island) per the build brief, so there's no custom ringing screen
  to wire up on iOS — `src/screens/ringing/` only matters on Android.

**`modules/uppy-alarm-kit`'s Swift is unverified against the real SDK.**
AlarmKit is brand new (iOS 26) and this was written in a Linux sandbox with
no Mac/Xcode toolchain to compile-check against — every AlarmKit type and
initializer label (`Alarm.Schedule.Relative`'s shape,
`AlarmPresentation.Alert`'s button parameters, `AlarmConfiguration`'s
initializer, whether `stopIntent` wants a `LiveActivityIntent` or a plain
`AppIntent`) was written from the AlarmKit WWDC session and public docs.
Confirm each one against the real framework headers on first build on a
Mac — see the comments at the top of `UppyAlarmKitModule.swift` and
`UppyStopIntent.swift`.

## Build stages

- [x] **Stage 0** — Scaffolding: Expo TS project, EAS dev-client config,
      local DB schema, folder structure, base navigation shell.
- [x] **Stage 1** — Alarm CRUD + list UI: create/edit/delete/toggle,
      repeat-day selection, local persistence, and the shared draft state
      across Add/Edit Alarm, Sound Picker, and Mission Picker. No real
      scheduling or ringing yet.
- [x] **Stage 2** — Native scheduling and ringing (AlarmKit / AlarmManager,
      full-screen ringing UI, dismiss wiring). Code complete; **needs a real
      device pass** (see Known limitations) — the "Done when" checkpoints
      (rings through a locked/silenced phone on both platforms, survives
      reboot + DST, `stopIntent` fires on every dismiss path) are unverified.
- [x] **Stage 3** — Sound: Android `RingtoneManager` picker (real on-device
      alarm sounds via `listAlarmSounds`, wired in Stage 2's Kotlin module);
      iOS static "Default" row, no picker UI.
- [ ] **Stage 4** — Mission framework + Random Object (ML Kit image
      labeling).
- [ ] **Stage 5** — Custom Object mission (MediaPipe Image Embedder native
      module).
- [ ] **Stage 6** — Emergency Escape (100/+100/30-day-reset tap bypass).
- [ ] **Stage 7** — Polish: permission copy, first-run flow, real-device
      checklist.

## Known limitations of this environment

This was built in a cloud sandbox with no iOS/Android device or simulator
attached, so stages 2 and up — which require AlarmKit, AlarmManager,
ML Kit, and MediaPipe running on real hardware — are implemented as
best-effort native code against the documented APIs, verified by
type-checking and Metro bundling only. They still need a real-device pass
per the "Done when" checkpoints in the build brief before shipping.
