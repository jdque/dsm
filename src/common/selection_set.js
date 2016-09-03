SelectionSet = function () {
	this.selectedObject = null;
}

SelectionSet.prototype.select = function (object) {
	console.log(object);
	this.selectedObject = object;
}

SelectionSet.prototype.clear = function () {
	this.selectedObject = null;
}

SelectionSet.prototype.get = function () {
	return this.selectedObject;
}

module.exports = SelectionSet;