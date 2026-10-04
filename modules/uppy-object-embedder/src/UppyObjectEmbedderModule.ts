import { NativeModule, requireNativeModule } from 'expo';
import type { ClassificationCategory } from './UppyObjectEmbedder.types';

declare class UppyObjectEmbedderModule extends NativeModule<{}> {
  /** Runs the bundled MediaPipe Image Embedder model on a local photo URI. */
  embedImage(uri: string): Promise<number[]>;
  /** Runs the bundled MediaPipe Object Detector (COCO's 80 classes) on a local photo URI. */
  classifyImage(uri: string): Promise<ClassificationCategory[]>;
}

export default requireNativeModule<UppyObjectEmbedderModule>('UppyObjectEmbedder');
