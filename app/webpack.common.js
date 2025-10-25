const path = require("path")
const HtmlWebpackPlugin = require("html-webpack-plugin")
const ForkTsCheckerWebpackPlugin = require("fork-ts-checker-webpack-plugin")
const webpack = require("webpack")
const Dotenv = require("dotenv-webpack")
const CopyPlugin = require("copy-webpack-plugin")

module.exports = {
  context: __dirname,
  entry: {
    browserMain: "./src/index.tsx",
    browserAuth: "./src/auth/index.tsx",
    browserCommunity: "./src/community.tsx",
  },
  output: {
    filename: "[name]-[chunkhash].js",
    clean: true,
    publicPath: "/",
  },
  module: {
    rules: [
      {
        test: /\.(png|jpg|jpeg|gif|woff|woff2|eot|ttf)$/,
        loader: "url-loader",
      },
    ],
  },
  resolve: {
    extensions: [".js", ".jsx", ".ts", ".tsx"],
  },
  plugins: [
    new webpack.DefinePlugin({
      "process.env.BUILD_TIME": JSON.stringify(new Date().toISOString()),
      "process.env.VERCEL_GIT_COMMIT_SHA": JSON.stringify(
        process.env.VERCEL_GIT_COMMIT_SHA || "local-dev"
      ),
    }),
    new Dotenv({
      path: path.join(__dirname, "../.env"),
      systemvars: true,
    }),
    new HtmlWebpackPlugin({
      inject: true,
      filename: "edit.html",
      chunks: ["browserMain"],
      template: path.join(__dirname, "public", "edit.html"),
    }),
    new HtmlWebpackPlugin({
      inject: true,
      filename: "auth.html",
      chunks: ["browserAuth"],
      template: path.join(__dirname, "public", "auth.html"),
    }),
    new HtmlWebpackPlugin({
      inject: true,
      filename: "community.html",
      chunks: ["browserCommunity"],
      template: path.join(__dirname, "public", "community.html"),
    }),
    new ForkTsCheckerWebpackPlugin({
      formatter: { type: "codeframe", pathType: "absolute" },
    }),
    new CopyPlugin({
      patterns: [
        {
          from: "public",
          to: ".",
          globOptions: {
            // Ignore template HTML files (processed by HtmlWebpackPlugin)
            // but allow index.html to be copied for root path routing
            ignore: ["**/edit.html", "**/auth.html", "**/community.html"],
          },
        },
      ],
    }),
  ],
}
