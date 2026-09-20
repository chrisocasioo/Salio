import { NativeModule, requireNativeModule } from 'expo';
import type { ClassificationCategory } from './UppyObjectEmbedder.types';

declare class UppyObjectEmbedderModule extends NativeModule<{}> {
  /** Runs the bundled MediaPipe Image Embedder model on a local photo URI. */
  embedImage(uri: string): Promise<number[]>;
  /** iOS only: runs the bundled MediaPipe Image Classifier model on a local photo URI. */
  classifyImage(uri: string): Promise<ClassificationCategory[]>;
}

export default requireNativeModule<UppyObjectEmbedderModule>('UppyObjectEmbedder');
