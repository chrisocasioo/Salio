# uppy-object-embedder

Local Expo module wrapping MediaPipe Tasks Vision's Image Embedder, used by the Custom Object
dismiss mission (build brief Stage 5) to compare a live capture against the 2-3 reference photos
captured during Custom Object setup.

- `embedImage(uri: string): Promise<number[]>` — runs the bundled model on a local photo URI and
  returns its embedding vector. Cosine similarity against reference embeddings is computed in JS
  (`src/services/customObjectMatch.ts`), not natively.

## Model

`mobilenet_embedder.tflite` (bundled in both `android/src/main/assets/` and `ios/`) is Google's
own published MobileNetV3-Small embedder model for the Image Embedder task, downloaded from
`https://storage.googleapis.com/mediapipe-models/image_embedder/mobilenet_v3_small/float32/1/mobilenet_v3_small.tflite`
(Apache 2.0, part of the public MediaPipe Solutions model zoo — hosted specifically for apps
building on this task to download and bundle). If a different embedder model is swapped in later,
replace the file at both paths and keep the filename `mobilenet_embedder.tflite`, or update the
`setModelAssetPath` calls in `UppyAndroidModule.kt`/`UppyObjectEmbedderModule.swift` to match.

## Verification status

Android (`UppyObjectEmbedderModule.kt`) — every MediaPipe class and method used
(`BaseOptions.builder().setModelAssetPath()`, `ImageEmbedder.ImageEmbedderOptions.builder()`,
`ImageEmbedder.createFromOptions()`, `.embed()`, `.embeddingResult().embeddings()[0].floatEmbedding()`,
`BitmapImageBuilder`) was checked against the real compiled classes in `tasks-vision:1.0.0` and
`tasks-core:1.0.0` (decompiled with `javap` during development), not just documentation — high
confidence this compiles as written.

iOS (`UppyObjectEmbedderModule.swift`) — every type and method used (`ImageEmbedder`,
`ImageEmbedderOptions`, `MPImage(uiImage:)`, `BaseOptions.modelAssetPath`, `EmbeddingResult`,
`Embedding.floatEmbedding`) was checked against the real public headers extracted from the
`MediaPipeTasksVision` 1.0.0 CocoaPod's xcframework, not just documentation — high confidence this
compiles as written. What's still unverified, for the same reason as the rest of this project's
native code (no Mac/Xcode/real device in the sandbox this was built in): that it actually runs and
produces a sane embedding on device.
