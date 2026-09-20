import { registerWebModule, NativeModule } from 'expo';

// UppyObjectEmbedderModule is not available on the web platform.
class UppyObjectEmbedderModule extends NativeModule<{}> {}

export default registerWebModule(UppyObjectEmbedderModule, 'UppyObjectEmbedderModule');
