// filepath: c:\Users\DELTIS\Documents\My Web Sites\cards\webpack.config.js
const path = require('path');

module.exports = {
  resolve: {
    fallback: {
      "crypto": require.resolve("crypto-browserify"),
      "path": require.resolve("path-browserify"),
      "fs": false
    }
  },
  // Other Webpack configurations...
};