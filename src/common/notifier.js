function Notifier() {
	this.enabled = true;
	this.listeners = {};
}

Notifier.prototype.addListener = function (type, func) {
	if (!this.listeners.hasOwnProperty(type)) {
		this.listeners[type] = [];
	}

	this.listeners[type].push(func);
}

Notifier.prototype.removeListener = function (type, func) {
	if (!this.listeners.hasOwnProperty(type))
		return;

	this.listeners[type].splice(this.listeners[type].indexOf(func), 1);
}

Notifier.prototype.notify = function (type, data) {
	if (!this.listeners.hasOwnProperty(type))
		return;

	this.listeners[type].forEach(function (listenerFunc) {
		if (data instanceof Array) {
			listenerFunc.apply(null, data);
		}
		else {
			listenerFunc(data);
		}
	});
}

if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
    module.exports = Notifier;
}