function StateManager(states) {
    this.stateMap = {};
    this.activeStateId = null;

    if (states instanceof Array) {
        states.forEach(function (stateId) {
            this.addState(stateId);
        }.bind(this));
    }
}

StateManager.prototype.addState = function (stateId) {
    this.stateMap[stateId] = [];
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