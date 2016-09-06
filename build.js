var Builder = require('systemjs-builder');

var builder = new Builder('src');

builder
.buildStatic('app.js', 'bin/fem.js', {
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
	externals: ['konva.js', 'numeric.js'],
	globalName: 'App',
	globalDeps: {
		'konva.js': 'Konva',
		'numeric.js': 'numeric'
	},
	minify: false,
	runtime: true,
	sourceMaps: true
})
.then(function () {
	console.log("Build Complete")
});