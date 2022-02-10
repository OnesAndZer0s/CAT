const { CleanWebpackPlugin } = require( "clean-webpack-plugin" ),
      CopyWebpackPlugin = require( "copy-webpack-plugin" ),
      HtmlWebpackPlugin = require( "html-webpack-plugin" ),
      MiniCssExtractPlugin = require( "mini-css-extract-plugin" ),

      paths = require( "./paths" );

module.exports = {
  // Where webpack looks to start building the bundle
  entry: [ paths.src + "/js/index.js" ],
  stats:{ children: true },
  // Where webpack outputs the assets and bundles
  output: {
    path: paths.build,
    filename: "index.bundle.js"
    // publicPath: "/"
  },

  // Customize the webpack build process
  plugins: [
    // Removes/cleans build folders and unused assets when rebuilding
    new CleanWebpackPlugin(),
    new MiniCssExtractPlugin( {
      // filename: "css/[name].[contenthash].css",
      // chunkFilename: "[id].css"
    } ),
    // Copies files from target to destination folder
    new CopyWebpackPlugin( {
      patterns: [ 
        {
          from: paths.public,
          to: ".",
          globOptions: { ignore: [ "*.DS_Store" ] },
          noErrorOnMissing: false
        } 
      ]
    } ),

    // Generates an HTML file from a template
    // Generates deprecation warning: https://github.com/jantimon/html-webpack-plugin/issues/1501
    new HtmlWebpackPlugin( {
      // title: "Classroom Analysi",
      favicon: paths.src + "/assets/favicon.ico",
      template: paths.src + "/html/index.html", // template file
      filename: "index.html" // output file
    } )
  ],

  // Determine how modules within the project are treated
  module: {
    rules: [
      // JavaScript: Use Babel to transpile JavaScript files
      // { test: /\.js$/, use: [ "babel-loader" ] },

      // Images: Copy image files to build folder
      { test: /\.(?:ico|gif|png|jpg|jpeg)$/i, type: "asset/resource" },

      // Fonts and SVGs: Inline files
      { test: /\.(woff(2)?|eot|ttf|otf|svg|)$/, type: "asset/inline" },
      {
        test: /\.css$/i,
        use: [ MiniCssExtractPlugin.loader, "css-loader" ]
      },
      {
        test: /\.m?js$/,
        exclude: /(node_modules|bower_components)/,
        use: {
          loader: "babel-loader",
          options: { presets: [ "@babel/preset-env" ] }
        }
      }
    ]
  },

  resolve: {
    modules: [ paths.src, "node_modules" ],
    extensions: [ ".js", ".jsx", ".json" ],
    alias: {
      "@": paths.src,
      assets: paths.public
    }
  }
};