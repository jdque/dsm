var Builder = require('systemjs-builder');
var builder = new Builder();

builder
.buildStatic('src/app.js', 'bin/fem.js', {
	globalName: 'App',
	minify: true
})
.then(function () {
	console.log("Build Complete")
});