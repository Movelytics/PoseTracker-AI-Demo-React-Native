/**
 * Expo config for the demo app.
 * Movement previews live in lib/enginePreview so a store build does not
 * depend on files outside this project. The pose SDK comes from npm.
 * Expo 54's expo-file-system root export is the new File API, so SDK
 * imports resolve to the legacy module.
 */
const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const projectRoot = __dirname;
const config = getDefaultConfig(projectRoot);

config.resolver.disableHierarchicalLookup = true;
config.resolver.nodeModulesPaths = [path.join(projectRoot, "node_modules")];
config.resolver.extraNodeModules = {
  react: path.join(projectRoot, "node_modules/react"),
  "react-native": path.join(projectRoot, "node_modules/react-native"),
};

const defaultResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  let resolvedName = moduleName;
  const fromSdk =
    context.originModulePath.includes("react-native-pose-estimation") ||
    context.originModulePath.includes("pose-estimation-react-native");
  if (moduleName === "expo-file-system" && fromSdk) {
    resolvedName = "expo-file-system/legacy";
  }
  if (defaultResolveRequest) {
    return defaultResolveRequest(context, resolvedName, platform);
  }
  return context.resolveRequest(context, resolvedName, platform);
};

module.exports = config;
