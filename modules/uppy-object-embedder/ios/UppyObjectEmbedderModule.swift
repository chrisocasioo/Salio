import ExpoModulesCore
import MediaPipeTasksVision
import UIKit

/// Wraps MediaPipe Tasks Vision's Image Embedder (MobileNetV3-Small, bundled as
/// mobilenet_embedder.tflite) to turn a photo into a comparable embedding vector for the Custom
/// Object dismiss mission. Cosine similarity against the 2-3 reference embeddings captured at
/// registration is computed in JS (src/services/customObjectMatch.ts) — a plain dot-product/norm
/// calculation doesn't need a native round trip.
///
/// Unlike UppyAlarmKitModule (AlarmKit, iOS 26, no Mac available to verify), every type and
/// method here was checked against the real MediaPipeTasksVision 1.0.0 headers (ImageEmbedder,
/// ImageEmbedderOptions, MPImage, EmbeddingResult, Embedding) — see this module's README — so
/// this should compile as-is; Google still labels Image Embedder itself a "Solutions Preview"
/// (build brief Section 6), and running inference has not been exercised on a real device.
public class UppyObjectEmbedderModule: Module {
  private var embedder: ImageEmbedder?

  public func definition() -> ModuleDefinition {
    Name("UppyObjectEmbedder")

    AsyncFunction("embedImage") { (uri: String) -> [Double] in
      guard let url = URL(string: uri), let data = try? Data(contentsOf: url), let uiImage = UIImage(data: data) else {
        throw UppyObjectEmbedderError.invalidImage
      }
      let mpImage = try MPImage(uiImage: uiImage)
      let embedder = try self.getEmbedder()
      let result = try embedder.embed(image: mpImage)
      let floatEmbedding = result.embeddingResult.embeddings.first?.floatEmbedding ?? []
      return floatEmbedding.map { $0.doubleValue }
    }
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
}

enum UppyObjectEmbedderError: Error {
  case invalidImage
  case modelNotFound
}
