Pod::Spec.new do |s|
  s.name           = 'UppyObjectEmbedder'
  s.version        = '1.0.0'
  s.summary        = 'Wraps MediaPipe Image Embedder (Custom Object) and Image Classifier (Random Object) for iOS.'
  s.description    = 'Turns a photo into a comparable embedding vector via MediaPipe Tasks Vision Image Embedder (mobilenet_embedder.tflite), and classifies a photo via Image Classifier (efficientnet_lite0.tflite) as the iOS Random Object detector.'
  s.author         = ''
  s.homepage       = 'https://docs.expo.dev/modules/'
  s.platforms      = {
    :ios => '15.0'
  }
  s.source         = { git: '' }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'
  s.dependency 'MediaPipeTasksVision', '~> 1.0'

  # Swift/Objective-C compatibility
  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES',
  }

  s.source_files = "**/*.{h,m,mm,swift,hpp,cpp}"
  s.resources = ['mobilenet_embedder.tflite', 'efficientnet_lite0.tflite']
end
