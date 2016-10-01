var Notifier = require('./notifier');

SelectionSet = function () {
	Notifier.apply(this);

	this.selectedObject = null;
}

SelectionSet.prototype = Object.create(Notifier.prototype);

SelectionSet.prototype.select = function (object) {
	this.selectedObject = object;
	this.notify('select', this.selectedObject);
}

SelectionSet.prototype.clear = function () {
	this.selectedObject = null;
	this.notify('select', null);
}

SelectionSet.prototype.get = function () {
	return this.selectedObject;
}

module.exports = SelectionSet;