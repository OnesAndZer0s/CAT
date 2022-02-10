const MiniCssExtractPlugin = require( "mini-css-extract-plugin" ),
      { merge } = require( "webpack-merge" ),

      paths = require( "./paths" ),
      common = require( "./webpack.common" );

module.exports = merge( common, {
  mode: "production",
  devtool: false,
  output: {
    path: paths.build,
    publicPath: "/",
    filename: "js/[name].[contenthash].bundle.js"
  },
  module: {
    rules: [ {
      test: /\.(css)$/,
      use: [
        MiniCssExtractPlugin.loader,
        {
          loader: "css-loader",
          options: {
            importLoaders: 2,
            sourceMap: false,
            modules: false
          }
        }
      ]
    } ]
  },
  performance: {
    hints: false,
    maxEntrypointSize: 512000,
    maxAssetSize: 512000
  }
} );