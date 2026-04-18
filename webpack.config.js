const createExpoWebpackConfigAsync = require('@expo/webpack-config');
const path = require('path');

module.exports = async function (env, argv) {
  const appRoot = path.resolve(__dirname, 'app');
  process.env.EXPO_ROUTER_APP_ROOT = appRoot;

  const config = await createExpoWebpackConfigAsync(
    { ...env, projectRoot: __dirname },
    argv
  );

  // Forzar la variable en DefinePlugin para que Webpack la resuelva correctamente
  const definePlugin = config.plugins.find(
    (p) => p.constructor && p.constructor.name === 'DefinePlugin'
  );
  if (definePlugin) {
    definePlugin.definitions['process.env.EXPO_ROUTER_APP_ROOT'] = JSON.stringify(appRoot);
  }

  // Deshabilitar el overlay de errores que rompe en web
  if (config.devServer) {
    config.devServer.client = {
      overlay: false,
    };
  }

  return config;
};
