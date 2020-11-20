const webpack = require('webpack')
const path = require('path')

module.exports = {
  transpileDependencies: ['vuetify'],
  configureWebpack: {
    plugins: [
      new webpack.ProvidePlugin({
        acorn: path.resolve(path.join(__dirname, 'src/interpreter/acorn.js')),
      }),
    ],
    module: {
      rules: [
        {
          test: /interpreter\/polyfills\/.*\.js$/,
          use: 'raw-loader',
        },
      ],
    },
  },
}
