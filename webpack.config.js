const path = require('path');
const webpack = require('webpack');

const isProduction = process.env.NODE_ENV == 'production';
const filePath = process.env.FILE_PATH || 'src/index.js';
console.log(`target file: ${filePath}`);

const config = {
  entry: path.resolve(__dirname, filePath), //file which you want to build
  output: {
    filename: 'main.js',
    path: path.resolve(__dirname, 'dist'),
  },
  plugins: [
    new webpack.EnvironmentPlugin({
      SERIAL: "",
      AES_KEY: "",
      TEST: false,
      API_SERVER: "miniegg-plus-backend-dev.ainize.ai",
      npm_package_version: process.env.npm_package_version
    }),
  ],
  externals: {
    'events': 'commonjs events',
    'gpio': 'commonjs gpio',
    'led': 'commonjs led',
    'button': 'commonjs button',
    'pwm': 'commonjs pwm',
    'adc': 'commonjs adc',
    'i2c': 'commonjs i2c',
    'spi': 'commonjs spi',
    'uart': 'commonjs uart',
    'rp2': 'commonjs rp2',
    'rtc': 'commonjs rtc',
    'graphics': 'commonjs graphics',
    'at': 'commonjs at',
    'stream': 'commonjs stream',
    'net': 'commonjs net',
    'dgram': 'commonjs dgram',
    'http': 'commonjs http',
    'wifi': 'commonjs wifi',
    'url': 'commonjs url',
    'fs': 'commonjs fs',
    'vfs_lfs': 'commonjs vfs_lfs',
    'flash': 'commonjs flash'
  },
  devtool: 'source-map',
  resolve: {
    extensions: ['.js', '.json'],
    modules: [path.resolve(__dirname, "src/modules"), "node_modules"],
  },
};

module.exports = () => {
  if (isProduction) {
    config.mode = 'production';        
  } else {
    config.mode = 'development';
  }
  return config;
};