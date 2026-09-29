/**
 * Expo config for the demo app.
 * The offline SDK is linked with `file:` and needs its folder watched.
 * SDK code asks for `expo-file-system`; Expo 54's main entry is the new File API,
 * so those imports resolve to the legacy module.
 */
const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const projectRoot = __dirname;
const sdkPackageRoot = path.resolve(
  projectRoot,
  "../../posetracker-rn-sdk/packages/pose-estimation-react-native"
);
const engineRoot = path.resolve(projectRoot, "../../posetracker-rn-sdk/engine");

const config = getDefaultConfig(projectRoot);

config.watchFolders = [sdkPackageRoot, engineRoot];
// The SDK package ships its own node_modules/react-native (0.74). Hierarchical
// lookup follows the file: symlink and bundles that copy. Expo Go only
// registers turbo modules for this app's React Native (0.81), so PlatformConstants
// is missing and the app dies before the runtime is ready.
config.resolver.disableHierarchicalLookup = true;
config.resolver.nodeModulesPaths = [path.join(projectRoot, "node_modules")];
config.resolver.extraNodeModules = {
  react: path.join(projectRoot, "node_modules/react"),
  "react-native": path.join(projectRoot, "node_modules/react-native"),
};

const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const previousBlockList = config.resolver.blockList;
config.resolver.blockList = [
  ...(Array.isArray(previousBlockList) ? previousBlockList : previousBlockList ? [previousBlockList] : []),
  /pose-estimation-react-native[/\\]node_modules[/\\].*/,
  new RegExp(`${escapeRegExp(engineRoot + path.sep)}node_modules${escapeRegExp(path.sep)}.*`),
];

const defaultResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  let resolvedName = moduleName;
  if (
    moduleName === "expo-file-system" &&
    context.originModulePath.includes("pose-estimation-react-native")
  ) {
    resolvedName = "expo-file-system/legacy";
  }
  if (defaultResolveRequest) {
    return defaultResolveRequest(context, resolvedName, platform);
  }
  return context.resolveRequest(context, resolvedName, platform);
};

module.exports = config;
