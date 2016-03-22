function extend(destination, source) {
	for (var k in source) {
		if (source.hasOwnProperty(k)) {
			destination[k] = source[k];
		}
	}
	return destination; 
}

//------------------------------------------------------------------------------
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

//------------------------------------------------------------------------------
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

//------------------------------------------------------------------------------
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

//------------------------------------------------------------------------------
function Attachment() {
	this.attachParent = null;
}

Attachment.prototype.attachTo = function (attachmentContainer, offsetX, offsetY) {
	this.attachParent = attachmentContainer;
	attachmentContainer.addAttachment(this, offsetX, offsetY);
}

Attachment.prototype.getAttachParent = function () {
	return this.attachParent;
}

function AttachmentContainer(object, offX, offY) {
	this.attachments = [];
}

//------------------------------------------------------------------------------
AttachmentContainer.prototype.addAttachment = function (object, offX, offY) {
	this.attachments.push({
		object: object,
		offX: offX,
		offY: offY
	});
}

AttachmentContainer.prototype.removeAttachment = function (object) {
	for (var i = 0; i < this.attachments.length; i++) {
		var attachmentObj = this.attachments[i].object;
		if (attachmentObj === object) {
			attachmentObj.destroy();
		}
	}
}

AttachmentContainer.prototype.clearAttachments = function () {
	this.attachments.forEach(function (attachment) {
		attachment.object.destroy();
	});
	this.attachments = [];
}

AttachmentContainer.prototype.updateAttachments = function () {
	this.attachments.forEach(function (attachment) {
		attachment.object.setAttrs({
			x: this.x() + attachment.offX,
			y: this.y() + attachment.offY
		});
	}.bind(this));
}