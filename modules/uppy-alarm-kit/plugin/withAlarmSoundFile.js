const { withDangerousMod, withXcodeProject, IOSConfig } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

// AlarmKit's AlertConfiguration.AlertSound.named(_:) requires the sound file to live directly in
// the app's own main bundle (Apple's docs: "a file that's in your app's main bundle or the
// Library/Sounds folder") -- NOT inside a CocoaPods module's own private resource bundle, which is
// where UppyAlarmKit.podspec's `s.resources` entry for this same file already lands it for our own
// AVAudioPlayer lookup (Bundle(for: UppyAlarmKitModule.self)). Copies the file into the app
// target's source directory and registers it on the main target's Copy Bundle Resources phase so
// AlarmManager.AlarmConfiguration's `sound: .named("UppyAlarmTone.wav")` can actually find it.
const SOUND_FILENAME = 'UppyAlarmTone.wav';
const SOUND_SOURCE = path.join(__dirname, '..', 'ios', SOUND_FILENAME);

function withAlarmSoundFile(config) {
  config = withDangerousMod(config, [
    'ios',
    (config) => {
      const destDir = IOSConfig.Paths.getSourceRoot(config.modRequest.projectRoot);
      fs.copyFileSync(SOUND_SOURCE, path.join(destDir, SOUND_FILENAME));
      return config;
    },
  ]);

  config = withXcodeProject(config, (config) => {
    const project = config.modResults;
    const projectName = config.modRequest.projectName;
    // Every existing file in this project (AppDelegate.swift, Info.plist, Images.xcassets, ...) is
    // recorded with its path fully qualified from the project root, e.g. "Salio/Info.plist", as a
    // direct child of the PBXGroup literally named after the project ("Salio") -- there's no nested
    // per-folder path segment doing that for them. Matching that exactly is what makes the path
    // resolve to where withDangerousMod above actually copied the file on disk.
    const resourcePath = `${projectName}/${SOUND_FILENAME}`;

    if (!project.hasFile(resourcePath)) {
      // addResourceFile unconditionally looks up a PBXGroup literally named "Resources" (to strip
      // a "Resources/" path prefix -- irrelevant to us either way) and crashes with `Cannot read
      // properties of null (reading 'path')` when that group doesn't exist, which is the normal
      // case here since this project groups files under its own name instead. An empty, path-less
      // placeholder group with that exact name short-circuits the crash harmlessly; it's otherwise
      // unused since we pass the real project group as the destination below.
      if (!project.pbxGroupByName('Resources')) {
        project.addPbxGroup([], 'Resources');
      }
      const [targetUuid] = IOSConfig.Target.findFirstNativeTarget(project);
      const projectGroupKey = findGroupKeyByName(project, projectName);
      // .wav isn't in this library's small built-in extension map (it only covers source/text
      // types), so without this it falls back to `lastKnownFileType = unknown`. Passing the real
      // UTI matches what Xcode itself writes when a .wav is added through its own UI.
      project.addResourceFile(
        resourcePath,
        { target: targetUuid, lastKnownFileType: 'audio.wav' },
        projectGroupKey ?? undefined
      );
    }
    return config;
  });

  return config;
}

// project.pbxGroupByName returns the group object, not its key/uuid, and addResourceFile's
// `group` parameter needs the key -- this mirrors pbxGroupByName's own comment-key lookup.
function findGroupKeyByName(project, name) {
  const groups = project.hash.project.objects['PBXGroup'] ?? {};
  for (const key of Object.keys(groups)) {
    if (!key.endsWith('_comment')) continue;
    if (groups[key] === name) {
      return key.slice(0, -'_comment'.length);
    }
  }
  return null;
}

module.exports = withAlarmSoundFile;
