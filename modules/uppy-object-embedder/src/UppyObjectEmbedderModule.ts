import { NativeModule, requireNativeModule } from 'expo';

declare class UppyObjectEmbedderModule extends NativeModule<{}> {
  /** Runs the bundled MediaPipe Image Embedder model on a local photo URI. */
  embedImage(uri: string): Promise<number[]>;
}

export default requireNativeModule<UppyObjectEmbedderModule>('UppyObjectEmbedder');
