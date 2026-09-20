package expo.modules.uppyobjectembedder

import android.content.Context
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.net.Uri
import com.google.mediapipe.framework.image.BitmapImageBuilder
import com.google.mediapipe.tasks.core.BaseOptions
import com.google.mediapipe.tasks.vision.imageembedder.ImageEmbedder
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

/**
 * Wraps MediaPipe Tasks Vision's Image Embedder (MobileNetV3-Small, bundled as
 * android/src/main/assets/mobilenet_embedder.tflite) to turn a photo into a comparable embedding
 * vector for the Custom Object dismiss mission. Cosine similarity against the 2-3 reference
 * embeddings captured at registration is computed in JS (src/services/customObjectMatch.ts) — a
 * plain dot-product/norm calculation doesn't need a native round trip.
 *
 * Google still labels Image Embedder a "Solutions Preview" (see build brief Section 6); this was
 * written against the 1.0.0 tasks-vision release without a real Android device to run it on.
 */
class UppyObjectEmbedderModule : Module() {
  private var embedder: ImageEmbedder? = null

  override fun definition() = ModuleDefinition {
    Name("UppyObjectEmbedder")

    AsyncFunction("embedImage") { uri: String ->
      val context = appContext.reactContext ?: throw IllegalStateException("React context is not available yet")
      val bitmap = loadBitmap(context, uri)
      val mpImage = BitmapImageBuilder(bitmap).build()
      val result = getEmbedder(context).embed(mpImage)
      result.embeddingResult().embeddings()[0].floatEmbedding().toList()
    }

    OnDestroy {
      embedder?.close()
      embedder = null
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

  private fun loadBitmap(context: Context, uriString: String): Bitmap {
    val uri = Uri.parse(uriString)
    return context.contentResolver.openInputStream(uri)?.use { stream ->
      BitmapFactory.decodeStream(stream)
    } ?: throw IllegalArgumentException("Could not open image at $uriString")
  }
}
