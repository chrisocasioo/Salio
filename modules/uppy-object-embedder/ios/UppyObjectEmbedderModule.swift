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
/// - Image Classifier (EfficientNet-Lite0, efficientnet_lite0.tflite) is iOS's Random Object
///   detector. Android keeps using @react-native-ml-kit/image-labeling for that mission, but its
///   iOS pod transitively links GoogleToolboxForMac/GTMSessionFetcher, and MediaPipeTasksCommon's
///   prebuilt static graph library separately embeds its own copies of the same ObjC classes —
///   linking both produced ~220 duplicate-symbol errors at the final link step. Consolidating
///   iOS onto MediaPipe alone (react-native.config.js excludes the ML Kit pod on iOS) removes the
///   conflict entirely. src/services/imageLabeling.ts dispatches to whichever one matches
///   Platform.OS.
///
/// Unlike UppyAlarmKitModule (AlarmKit, iOS 26, no Mac available to verify), every type and
/// method here was checked against the real MediaPipeTasksVision 1.0.0 headers (ImageEmbedder,
/// ImageEmbedderOptions, ImageClassifier, ImageClassifierOptions, MPImage, EmbeddingResult,
/// ClassificationResult, Category) — see this module's README — so this should compile as-is;
/// Google still labels Image Embedder a "Solutions Preview" (build brief Section 6), and running
/// inference has not been exercised on a real device.
public class UppyObjectEmbedderModule: Module {
  private var embedder: ImageEmbedder?
  private var classifier: ImageClassifier?

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
      let classifier = try self.getClassifier()
      let result = try classifier.classify(image: mpImage)
      let categories = result.classificationResult.classifications.first?.categories ?? []
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

  private func getClassifier() throws -> ImageClassifier {
    if let classifier = classifier {
      return classifier
    }
    guard let modelPath = Bundle(for: UppyObjectEmbedderModule.self).path(forResource: "efficientnet_lite0", ofType: "tflite") else {
      throw UppyObjectEmbedderError.modelNotFound
    }
    let options = ImageClassifierOptions()
    options.baseOptions.modelAssetPath = modelPath
    options.maxResults = 5
    let newClassifier = try ImageClassifier(options: options)
    classifier = newClassifier
    return newClassifier
  }
}

enum UppyObjectEmbedderError: Error {
  case invalidImage
  case modelNotFound
}
