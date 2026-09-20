Pod::Spec.new do |s|
  s.name           = 'UppyAlarmKit'
  s.version        = '1.0.0'
  s.summary        = 'Wraps AlarmKit for scheduling, updating, and cancelling alarms.'
  s.description    = 'Wraps AlarmKit (AlarmManager, AlarmConfiguration, stopIntent) so JS can schedule, update, and cancel iOS 26+ alarms.'
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
end
