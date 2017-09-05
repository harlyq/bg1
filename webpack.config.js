const path = require('path')

const PATHS = {
  app: path.join(__dirname, 'app'),
  dist: path.join(__dirname, 'dist'),
}

module.exports = {
  entry: {
    'game-canasta': `${PATHS.dist}/canasta/game-canasta.js`,
    'game-mancala': `${PATHS.dist}/mancala/game-mancala.js`,
    'game-sword-and-sail': `${PATHS.dist}/sword-and-sail/game-sword-and-sail.js`,
    'game-for-sale': `${PATHS.dist}/for-sale/game-for-sale.js`,
    'test-ui': `${PATHS.dist}/ui/test/test-ui.js`,
    'ui-for-sale': `${PATHS.dist}/for-sale/ui-for-sale.js`, // HACK
  },
  output: {
    path: PATHS.dist,
    publicPath: '/dist/', // webpack-dev-server will make the output file 'appear' here (note, it is never saved to disk)
    filename: '[name]-dist.js',
  },
  module: {
    loaders: [
      { test: /\.css$/, loader: 'style-loader!css-loader' },
    ]
  },
}
