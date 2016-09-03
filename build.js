var Builder = require('systemjs-builder');
var builder = new Builder();

builder
.buildStatic('src/app.js', 'bin/fem.js', {
	externals: ['konva', 'numeric'],
	globalName: 'App',
	globalDeps: {
		'konva': 'Konva',
		'numeric': 'numeric'
	},
	minify: true
})
.then(function () {
	console.log("Build Complete")
});