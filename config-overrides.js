// filepath: c:\Users\DELTIS\Documents\My Web Sites\cards\config-overrides.js
const path = require('path');

module.exports = function override(config, env) {
  config.resolve.fallback = {
    ...config.resolve.fallback,
    "crypto": require.resolve("crypto-browserify"),
    "path": require.resolve("path-browserify"),
    "fs": false,
    "buffer": require.resolve("buffer/"),
    "stream": require.resolve("stream-browserify"),
    "vm": require.resolve("vm-browserify")
  };
  return config;
};