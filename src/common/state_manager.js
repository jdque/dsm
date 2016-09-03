function StateManager(stage) {
	this.stage = stage;
	this.stateMap = {};
	this.activeStateId = null;
}

StateManager.prototype.addState = function (id, object) {
	this.stateMap[id] = object;
}

StateManager.prototype.setState = function (stateId) {
	if (this.activeStateId) {
		this.stateMap[this.activeStateId].exit();
	}
	this.activeStateId = stateId;
	this.stage.off();
	this.stateMap[stateId].enter();
}

StateManager.prototype.getActiveStateId = function () {
	return this.activeStateId;
}

module.exports = StateManager;