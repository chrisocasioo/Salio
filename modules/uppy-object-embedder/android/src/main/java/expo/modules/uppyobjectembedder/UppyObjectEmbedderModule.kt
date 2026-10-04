package expo.modules.uppyobjectembedder

import android.content.Context
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.Matrix
import android.media.ExifInterface
import android.net.Uri
import com.google.mediapipe.framework.image.BitmapImageBuilder
import com.google.mediapipe.tasks.core.BaseOptions
import com.google.mediapipe.tasks.vision.imageembedder.ImageEmbedder
import com.google.mediapipe.tasks.vision.objectdetector.ObjectDetector
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

/**
 * Wraps two MediaPipe Tasks Vision tasks used by the two dismiss missions:
 *
 * - Image Embedder (MobileNetV3-Small, bundled as android/src/main/assets/mobilenet_embedder.tflite)
 *   turns a photo into a comparable embedding vector for the Custom Object mission. Cosine
 *   similarity against the 2-3 reference embeddings captured at registration is computed in JS
 *   (src/services/customObjectMatch.ts) — a plain dot-product/norm calculation doesn't need a
 *   native round trip.
 * - Object Detector (EfficientDet-Lite2, android/src/main/assets/efficientdet_lite2.tflite) is the
 *   Random Object detector, identical to iOS's. This replaced @react-native-ml-kit/image-labeling
 *   on Android: that labeler's ~430-label vocabulary (checked against Google's published label
 *   map) has no label at all for toilet, microwave, scissors, fork, knife, spoon, bowl, vase,
 *   hair dryer, toaster, toothbrush, refrigerator or oven, so most of the pool could never match.
 *   The pool is designed against COCO's 80 classes, which this detector outputs verbatim.
 *
 * Google still labels Image Embedder a "Solutions Preview" (see build brief Section 6); this was
 * written against the 1.0.0 tasks-vision release without a real Android device to run it on.
 */
class UppyObjectEmbedderModule : Module() {
  private var embedder: ImageEmbedder? = null
  private var detector: ObjectDetector? = null

  override fun definition() = ModuleDefinition {
    Name("UppyObjectEmbedder")

    AsyncFunction("embedImage") { uri: String ->
      val context = appContext.reactContext ?: throw IllegalStateException("React context is not available yet")
      val bitmap = loadBitmap(context, uri)
      val mpImage = BitmapImageBuilder(bitmap).build()
      val result = getEmbedder(context).embed(mpImage)
      result.embeddingResult().embeddings()[0].floatEmbedding().toList()
    }

    AsyncFunction("classifyImage") { uri: String ->
      val context = appContext.reactContext ?: throw IllegalStateException("React context is not available yet")
      val bitmap = loadUprightBitmap(context, uri)
      val mpImage = BitmapImageBuilder(bitmap).build()
      val result = getDetector(context).detect(mpImage)
      // One or more objects can be detected per frame; each carries its own top category. Flatten
      // them into one flat label list -- the JS matching logic just looks for any label in the
      // list that matches the target.
      result.detections().flatMap { detection ->
        detection.categories().map { category ->
          mapOf<String, Any>(
            "text" to (category.categoryName() ?: ""),
            "confidence" to category.score().toDouble(),
          )
        }
      }
    }

    OnDestroy {
      embedder?.close()
      embedder = null
      detector?.close()
      detector = null
    }
  }

  private fun getEmbedder(context: Context): ImageEmbedder {
    return embedder ?: run {
      val baseOptions = BaseOptions.builder()
        .setModelAssetPath("mobilenet_embedder.tflite")
        .build()
      val options = ImageEmbedder.ImageEmbedderOptions.builder()
        .setBaseOptions(baseOptions)
        .setL2Normalize(true)
        .setQuantize(false)
        .build()
      ImageEmbedder.createFromOptions(context, options).also { embedder = it }
    }
  }

  private fun getDetector(context: Context): ObjectDetector {
    return detector ?: run {
      val baseOptions = BaseOptions.builder()
        .setModelAssetPath("efficientdet_lite2.tflite")
        .build()
      val options = ObjectDetector.ObjectDetectorOptions.builder()
        .setBaseOptions(baseOptions)
        // Results come back sorted by score, so a low-scoring true match (small items like a fork
        // or toothbrush often score well under the confident-detection range) is silently dropped
        // if maxResults is small and the frame also contains a person/table/etc. The JS side
        // applies the real match threshold; this floor only keeps obvious noise out.
        .setMaxResults(50)
        .setScoreThreshold(0.1f)
        .build()
      ObjectDetector.createFromOptions(context, options).also { detector = it }
    }
  }

  // Longest side the detector ever needs: Lite2 takes 448x448 input, so anything much larger just
  // costs memory and time. A raw 12MP camera frame decodes to ~48MB.
  private val detectionMaxSide = 1280

  /**
   * Decodes a photo for object detection: downsampled, and rotated upright per its EXIF tag. The
   * camera writes portrait photos as sideways pixels plus an orientation tag, which BitmapFactory
   * ignores -- and a sideways object is detected far worse. (embedImage deliberately does not do
   * this: Custom Object references were already registered from un-rotated embeddings, and both
   * sides of that comparison must keep going through the same path.)
   */
  private fun loadUprightBitmap(context: Context, uriString: String): Bitmap {
    val uri = Uri.parse(uriString)

    val bounds = BitmapFactory.Options().apply { inJustDecodeBounds = true }
    context.contentResolver.openInputStream(uri)?.use { BitmapFactory.decodeStream(it, null, bounds) }
    var sample = 1
    while (maxOf(bounds.outWidth, bounds.outHeight) / (sample * 2) >= detectionMaxSide) sample *= 2

    val decoded = context.contentResolver.openInputStream(uri)?.use { stream ->
      BitmapFactory.decodeStream(stream, null, BitmapFactory.Options().apply { inSampleSize = sample })
    } ?: throw IllegalArgumentException("Could not open image at $uriString")

    val orientation = context.contentResolver.openInputStream(uri)?.use { stream ->
      ExifInterface(stream).getAttributeInt(ExifInterface.TAG_ORIENTATION, ExifInterface.ORIENTATION_NORMAL)
    } ?: ExifInterface.ORIENTATION_NORMAL

    val matrix = Matrix()
    when (orientation) {
      ExifInterface.ORIENTATION_ROTATE_90 -> matrix.postRotate(90f)
      ExifInterface.ORIENTATION_ROTATE_180 -> matrix.postRotate(180f)
      ExifInterface.ORIENTATION_ROTATE_270 -> matrix.postRotate(270f)
      ExifInterface.ORIENTATION_FLIP_HORIZONTAL -> matrix.postScale(-1f, 1f)
      ExifInterface.ORIENTATION_FLIP_VERTICAL -> matrix.postScale(1f, -1f)
      ExifInterface.ORIENTATION_TRANSPOSE -> { matrix.postRotate(90f); matrix.postScale(-1f, 1f) }
      ExifInterface.ORIENTATION_TRANSVERSE -> { matrix.postRotate(270f); matrix.postScale(-1f, 1f) }
      else -> return decoded
    }
    return Bitmap.createBitmap(decoded, 0, 0, decoded.width, decoded.height, matrix, true)
  }

  private fun loadBitmap(context: Context, uriString: String): Bitmap {
    val uri = Uri.parse(uriString)
    return context.contentResolver.openInputStream(uri)?.use { stream ->
      BitmapFactory.decodeStream(stream)
    } ?: throw IllegalArgumentException("Could not open image at $uriString")
  }
}
