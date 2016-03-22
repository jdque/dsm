function StateManager(stage) {
	this.stage = stage;
	this.stateMap = {};
	this.activeStateId = null;
}

StateManager.prototype.addState = function (id, object) {
	this.stateMap[id] = object;
}

StateManager.prototype.setState = function (stateId) {
	this.stage.off();
	this.activeStateId = stateId;
	this.stateMap[stateId](this);
}

StateManager.prototype.getActiveStateId = function () {
	return this.activeStateId;
}

if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
    module.exports = StateManager;
}