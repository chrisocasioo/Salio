import ExpoModulesCore
import MediaPipeTasksVision
import UIKit

/// Wraps two MediaPipe Tasks Vision tasks used by the two dismiss missions:
///
/// - Image Embedder (MobileNetV3-Small, mobilenet_embedder.tflite) turns a photo into a
///   comparable embedding vector for the Custom Object mission. Cosine similarity against the
///   2-3 reference embeddings captured at registration is computed in JS
///   (src/services/customObjectMatch.ts) — a plain dot-product/norm calculation doesn't need a
///   native round trip.
/// - Object Detector (EfficientDet-Lite0, efficientdet_lite0.tflite) is iOS's Random Object
///   detector. Previously an Image Classifier (EfficientNet-Lite0, whole-frame classification
///   over the 1000 ImageNet classes) -- switched after a real-device report that common pool
///   items (scissors, a spoon) never registered. Checked the actual ImageNet-1000 label list:
///   "scissors" isn't a class in it at all (no amount of threshold/synonym tuning could ever fix
///   that), and several others only existed as odd narrow variants ("wooden spoon", "race car").
///   The random object pool was always designed against COCO's 80 classes (see
///   RandomObjectSetupScreen.tsx's own doc comment), which is what Android's ML Kit labeler
///   roughly matches -- EfficientDet-Lite0 detects those same real 80 COCO classes, restoring the
///   pool's original design intent on iOS without changing a single pool item. It also localizes
///   a bounding box per detected object rather than classifying the whole frame's dominant
///   content, which should generally help smaller objects held up against background clutter.
///   Android keeps using @react-native-ml-kit/image-labeling for that mission, but its iOS pod
///   transitively links GoogleToolboxForMac/GTMSessionFetcher, and MediaPipeTasksCommon's
///   prebuilt static graph library separately embeds its own copies of the same ObjC classes —
///   linking both produced ~220 duplicate-symbol errors at the final link step. Consolidating
///   iOS onto MediaPipe alone (react-native.config.js excludes the ML Kit pod on iOS) removes the
///   conflict entirely. src/services/imageLabeling.ts dispatches to whichever one matches
///   Platform.OS, and doesn't need to know or care that this returns detections rather than
///   whole-frame classifications -- both come back as the same flat {text, confidence} shape.
///
/// Unlike UppyAlarmKitModule (AlarmKit, iOS 26, no Mac available to verify), every type and
/// method here was checked against the real MediaPipeTasksVision 1.0.0 headers (ImageEmbedder,
/// ImageEmbedderOptions, ObjectDetector, ObjectDetectorOptions, MPImage, EmbeddingResult,
/// ObjectDetectorResult, Detection, Category) and Google's own iOS usage guide — see this
/// module's README — so this should compile as-is; Google still labels Image Embedder a
/// "Solutions Preview" (build brief Section 6), and running inference has not been exercised on a
/// real device.
public class UppyObjectEmbedderModule: Module {
  private var embedder: ImageEmbedder?
  private var detector: ObjectDetector?

  public func definition() -> ModuleDefinition {
    Name("UppyObjectEmbedder")

    AsyncFunction("embedImage") { (uri: String) -> [Double] in
      let mpImage = try Self.loadMPImage(uri: uri)
      let embedder = try self.getEmbedder()
      let result = try embedder.embed(image: mpImage)
      let floatEmbedding = result.embeddingResult.embeddings.first?.floatEmbedding ?? []
      return floatEmbedding.map { $0.doubleValue }
    }

    AsyncFunction("classifyImage") { (uri: String) -> [[String: Any]] in
      let mpImage = try Self.loadMPImage(uri: uri)
      let detector = try self.getDetector()
      let result = try detector.detect(image: mpImage)
      // One or more objects can be detected per frame; each carries its own top category. Flatten
      // them into the same flat label list a whole-frame classifier would have returned -- the JS
      // matching logic already just looks for any label in the list that matches the target.
      let categories = result.detections.flatMap { $0.categories }
      return categories.map { category in
        [
          "text": category.categoryName ?? "",
          "confidence": Double(category.score),
        ]
      }
    }
  }

  private static func loadMPImage(uri: String) throws -> MPImage {
    guard let url = URL(string: uri), let data = try? Data(contentsOf: url), let uiImage = UIImage(data: data) else {
      throw UppyObjectEmbedderError.invalidImage
    }
    return try MPImage(uiImage: uiImage)
  }

  private func getEmbedder() throws -> ImageEmbedder {
    if let embedder = embedder {
      return embedder
    }
    guard let modelPath = Bundle(for: UppyObjectEmbedderModule.self).path(forResource: "mobilenet_embedder", ofType: "tflite") else {
      throw UppyObjectEmbedderError.modelNotFound
    }
    let options = ImageEmbedderOptions()
    options.baseOptions.modelAssetPath = modelPath
    options.l2Normalize = true
    options.quantize = false
    let newEmbedder = try ImageEmbedder(options: options)
    embedder = newEmbedder
    return newEmbedder
  }

  private func getDetector() throws -> ObjectDetector {
    if let detector = detector {
      return detector
    }
    guard let modelPath = Bundle(for: UppyObjectEmbedderModule.self).path(forResource: "efficientdet_lite0", ofType: "tflite") else {
      throw UppyObjectEmbedderError.modelNotFound
    }
    let options = ObjectDetectorOptions()
    options.baseOptions.modelAssetPath = modelPath
    options.maxResults = 5
    let newDetector = try ObjectDetector(options: options)
    detector = newDetector
    return newDetector
  }
}

enum UppyObjectEmbedderError: Error {
  case invalidImage
  case modelNotFound
}
