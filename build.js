var Builder = require('systemjs-builder');

var builder = new Builder('src');

builder
.buildStatic('app.js', 'bin/dsm.js', {
    config: {
        defaultJSExtensions: true,
        packages: {
            'ui': {
                main: 'index.js'
            },
            'model': {
                main: 'index.js'
            },
            'common': {
                main: 'index.js'
            },
            'analysis': {
                main: 'index.js'
            },
            'components': {
                main: 'index.js'
            }
        }
    },
    externals: ['konva.js', 'numeric.js', 'split.js'],
    globalName: 'App',
    globalDeps: {
        'konva.js': 'Konva',
        'numeric.js': 'numeric',
        'split.js': 'Split'
    },
    minify: false,
    runtime: true,
    sourceMaps: true
})
.then(function () {
    console.log("Build Complete")
});