// Re-export the native module. On web, it will be resolved to UppyObjectEmbedderModule.web.ts
// and on native platforms to UppyObjectEmbedderModule.ts
export { default } from './src/UppyObjectEmbedderModule';
export * from './src/UppyObjectEmbedder.types';
