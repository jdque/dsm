function StateManager(stage) {
	this.stateMap = {};
	this.activeStateId = null;
}

StateManager.prototype.addState = function (id) {
	this.stateMap[id] = [];
}

StateManager.prototype.setState = function (stateId) {
	if (this.activeStateId) {
		this.stateMap[this.activeStateId].forEach(function (handler) {
			handler.exit();
		})
	}
	this.activeStateId = stateId;
	this.stateMap[stateId].forEach(function (handler) {
		handler.enter();
	});
}

StateManager.prototype.getActiveStateId = function () {
	return this.activeStateId;
}

StateManager.prototype.on = function (stateId, handler) {
	if (!this.stateMap[stateId])
		return;

	this.stateMap[stateId].push(handler);
}

module.exports = StateManager;