Pod::Spec.new do |s|
  s.name           = 'UppyAlarmKit'
  s.version        = '1.0.0'
  s.summary        = 'Schedules, updates, and cancels alarms, and rings them reliably in the background.'
  s.description    = 'Schedules local notifications and keeps a background AVAudioSession alive so alarms ring through silent mode/lock screen with a fully app-owned ringing screen (no OS-owned stop button).'
  s.author         = ''
  s.homepage       = 'https://docs.expo.dev/modules/'
  s.platforms      = {
    :ios => '26.1'
  }
  s.source         = { git: '' }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'

  # Swift/Objective-C compatibility
  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES',
  }

  s.source_files = "**/*.{h,m,mm,swift,hpp,cpp}"
  s.resources = ['UppyKeepAlive.wav', 'UppyAlarmTone.wav']
end
