# Real-device checklist

Everything in this repo was built in a cloud sandbox with no iOS/Android device, simulator, or
Xcode available. `tsc` and Metro bundling pass for both platforms, and Expo's autolinking resolves
all three native modules, but none of it has actually run. This is the checklist for the real-device
pass the build brief calls for in Stage 7 — work through it in order, since later items assume
earlier ones are already working.

## 0. First build

- [ ] `eas build --profile development --platform ios` and `--platform android` both complete.
      For iOS, this is also the first real compile of `modules/uppy-alarm-kit` and
      `modules/uppy-object-embedder`'s Swift against the actual SDK headers — expect to fix
      compile errors in `UppyAlarmKitModule.swift`/`UppyStopIntent.swift` first (see their
      top-of-file comments for exactly what's unverified: `Alarm.Schedule.Relative`'s shape,
      `AlarmPresentation.Alert`'s parameters, whether `stopIntent` wants `LiveActivityIntent` or
      a plain `AppIntent`). `UppyObjectEmbedderModule.swift` and the Android Kotlin modules were
      checked against decompiled real classes/headers during development and are much less likely
      to need changes here — see `modules/uppy-object-embedder/README.md`.
- [ ] Both dev clients install and `npx expo start --dev-client` connects.
- [ ] Onboarding screen appears on first launch; each permission's system prompt/settings screen
      opens and returns correctly.

## 1. Stage 1 — CRUD (should just work, but confirm on real hardware)

- [ ] Create, edit, delete, toggle an alarm; force-quit and reopen the app — it's still there.
- [ ] Pick a mission or sound on its sub-screen, back out without tapping Save on Add/Edit Alarm,
      re-enter that sub-screen — the choice is still shown (this is `AlarmDraftContext`'s whole
      point; confirm it survives a real navigation stack, not just the type-checker).

## 2. Stage 2 — scheduling and ringing (the important one)

- [ ] **iOS**: schedule an alarm, lock the phone, put it in silent mode. It rings on time through
      both. Check `stopIntent` (`UppyStopIntent.swift`) fires for every dismiss path per the
      brief's Known Risk: tapping the button, unlocking the phone without tapping anything, and
      swiping the Live Activity away. If any of those don't call through, that path needs its own
      handling (e.g. a periodic JS-side check of `AlarmManager.shared.alarms` state) before
      relying on `stopIntent` alone for anything state-critical.
- [ ] **Android**: schedule an alarm, lock the phone, put it in silent/DND mode. It rings on time
      through both, with the full-screen `AlarmRingingActivity` showing over the lock screen.
- [ ] **Android reboot**: schedule a repeating alarm, reboot the device, confirm it still rings on
      schedule (`BootTimezoneReceiver` re-arming from `AlarmStore`'s SharedPreferences).
- [ ] **DST transition**: schedule an alarm for a time that falls during a DST change (or just
      change the device's date/timezone manually) and confirm it still fires at the intended local
      time, not shifted by an hour.
- [ ] Dismiss works on both platforms; the alarm sound stops immediately and the notification/
      Live Activity clears.

## 3. Stage 3 — Sound

- [ ] Android Sound Picker lists real device alarm sounds (names and count will differ by
      manufacturer per the brief — don't expect a specific list). Selected sound persists and
      actually plays when that alarm rings.
- [ ] iOS Sound row is static "Default" text, no chevron, doesn't navigate anywhere.

## 4. Stage 4 — Random Object mission

- [ ] Set a Random Object mission, ring the alarm, tap Start Mission, photograph a pool item —
      it's accepted. Photograph something else — it's rejected with the retry banner, and the
      alarm keeps ringing.
- [ ] Try a few different enabled pool items and confirm ML Kit's real label vocabulary matches
      reasonably (`src/services/imageLabeling.ts`'s synonym table is a starting guess — expand it
      based on what labels the model actually returns on a real device for your test objects).
- [ ] A disabled pool item is never the one asked for (`pickMissionTarget` only picks from
      `randomObjectPool`).

## 5. Stage 5 — Custom Object mission

- [ ] Register a Custom Object with 2-3 reference photos in varied lighting.
- [ ] Ring the alarm, photograph the same object — it's accepted.
- [ ] Photograph a clearly different object — it's rejected.
- [ ] Tune `SIMILARITY_THRESHOLD` in `src/services/customObjectMatch.ts` (starts at 0.7) based on
      real accept/reject behavior — the brief calls this out explicitly as something to tune, not
      a fixed constant.

## 6. Stage 6 — Emergency Escape

- [ ] Complete a 100-tap escape; confirm the alarm actually dismisses.
- [ ] Use it again within 30 days — confirm the second attempt needs 200 taps.
- [ ] Fake a 30+ day gap (or wait) and confirm a third use resets to 100.

## 7. Cross-cutting

- [ ] Battery optimization exemption and exact-alarm settings screens (Android) actually open and,
      once granted, alarms keep ringing reliably after a day of normal phone use (locked, app
      swiped away, battery saver on at some point).
- [ ] App icon, splash screen, and adaptive icon render correctly (the current assets are the
      Expo template's — replace with Uppy's own before shipping).
