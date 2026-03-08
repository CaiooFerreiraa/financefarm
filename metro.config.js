const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");
const path = require('path');

const projectRoot = __dirname;

const config = getDefaultConfig(projectRoot);

// Configuração simplificada para projeto standalone
config.watchFolders = [projectRoot];
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
];
config.resolver.extraNodeModules = {
  'react-native-css-interop': path.resolve(projectRoot, 'node_modules/react-native-css-interop'),
};
config.resolver.disableHierarchicalLookup = false;

module.exports = withNativeWind(config, { input: require.resolve("./global.css") });
