module.exports = {
  dependencies: {
    // GoogleMLKit/ImageLabeling's iOS pod transitively pulls in GoogleToolboxForMac and
    // GTMSessionFetcher, both of which MediaPipeTasksCommon's prebuilt static graph library
    // (used by modules/uppy-object-embedder for the Custom Object mission) also statically embeds
    // its own copies of — linking both causes ~220 duplicate-symbol errors at the final link
    // step. Random Object detection uses MediaPipe's Image Classifier on iOS instead (see
    // modules/uppy-object-embedder/ios), so this package's native iOS side is never used there;
    // Android is unaffected and keeps using it as normal.
    '@react-native-ml-kit/image-labeling': {
      platforms: {
        ios: null,
      },
    },
  },
};
