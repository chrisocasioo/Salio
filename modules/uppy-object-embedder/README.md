# uppy-object-embedder

Local Expo module wrapping two MediaPipe Tasks Vision tasks for iOS's two dismiss missions: Image
Embedder (Custom Object, build brief Stage 5) and Object Detector (Random Object, iOS only).

- `embedImage(uri: string): Promise<number[]>` — runs the bundled embedder model on a local photo
  URI and returns its embedding vector. Cosine similarity against reference embeddings is computed
  in JS (`src/services/customObjectMatch.ts`), not natively.
- `classifyImage(uri: string): Promise<{text: string; confidence: number}[]>` — iOS's Random
  Object detector (Android uses `@react-native-ml-kit/image-labeling` instead; see
  `src/services/imageLabeling.ts`). Despite the name, this runs MediaPipe's Object Detector task,
  not an image classifier — see "Random Object detector model" below for why.

## Embedder model

`mobilenet_embedder.tflite` (bundled in both `android/src/main/assets/` and `ios/`) is Google's
own published MobileNetV3-Small embedder model for the Image Embedder task, downloaded from
`https://storage.googleapis.com/mediapipe-models/image_embedder/mobilenet_v3_small/float32/1/mobilenet_v3_small.tflite`
(Apache 2.0, part of the public MediaPipe Solutions model zoo — hosted specifically for apps
building on this task to download and bundle). If a different embedder model is swapped in later,
replace the file at both paths and keep the filename `mobilenet_embedder.tflite`, or update the
`setModelAssetPath` calls in `UppyAndroidModule.kt`/`UppyObjectEmbedderModule.swift` to match.

## Random Object detector model (iOS only)

`efficientdet_lite0.tflite` (`ios/` only — Android's Random Object mission doesn't use this
module at all) is Google's own published EfficientDet-Lite0 model for the Object Detector task,
downloaded from
`https://storage.googleapis.com/mediapipe-models/object_detector/efficientdet_lite0/float32/1/efficientdet_lite0.tflite`
(13,836,895 bytes, Apache 2.0, same public MediaPipe Solutions model zoo). It detects the 80 COCO
classes, which is what the Random Object pool (`RandomObjectSetupScreen.tsx`) was designed
against — this replaced an EfficientNet-Lite0 *image classifier* (`efficientnet_lite0.tflite`,
now removed) that classified the whole frame over the 1000 ImageNet classes instead, a materially
different and worse-matching vocabulary discovered after real-device testing found common pool
items (e.g. scissors — not an ImageNet class at all) never registered. If a different detector
model is swapped in later, keep the filename `efficientdet_lite0.tflite` or update the
`modelAssetPath` lookup in `UppyObjectEmbedderModule.swift` to match, and re-verify its output
label set still lines up with the pool.

## Verification status

Android (`UppyObjectEmbedderModule.kt`) — every MediaPipe class and method used
(`BaseOptions.builder().setModelAssetPath()`, `ImageEmbedder.ImageEmbedderOptions.builder()`,
`ImageEmbedder.createFromOptions()`, `.embed()`, `.embeddingResult().embeddings()[0].floatEmbedding()`,
`BitmapImageBuilder`) was checked against the real compiled classes in `tasks-vision:1.0.0` and
`tasks-core:1.0.0` (decompiled with `javap` during development), not just documentation — high
confidence this compiles as written.

iOS (`UppyObjectEmbedderModule.swift`) — every type and method used (`ImageEmbedder`,
`ImageEmbedderOptions`, `ObjectDetector`, `ObjectDetectorOptions`, `MPImage(uiImage:)`,
`BaseOptions.modelAssetPath`, `EmbeddingResult`, `Embedding.floatEmbedding`,
`ObjectDetectorResult.detections`, `Detection.categories`, `Category.categoryName`/`.score`) was
checked against the real public headers extracted from the `MediaPipeTasksVision` 1.0.0 CocoaPod's
xcframework and Google's own iOS usage guide, not just documentation — high confidence this
compiles as written. What's still unverified, for the same reason as the rest of this project's
native code (no Mac/Xcode/real device in the sandbox this was built in): that it actually runs and
produces sane embeddings/detections on device.
