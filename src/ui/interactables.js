var Konva = require('../../lib/konva-0.9.5.js');
var Style = require('./style.js');

function extend(destination, source) {
	for (var k in source) {
		if (source.hasOwnProperty(k)) {
			destination[k] = source[k];
		}
	}
	return destination;
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

//------------------------------------------------------------------------------

function NodeCircle(settings) {
	Konva.Circle.apply(this, [settings]);
	AttachmentContainer.apply(this);
}

NodeCircle.create = function (x, y, style) {
	var circle = new NodeCircle(style || Style.Node);
	circle.setAttrs({
		x: x,
		y: y,
		draggable: true
	});

	return circle;
}

NodeCircle.prototype = Object.create(Konva.Circle.prototype);
extend(NodeCircle.prototype, AttachmentContainer.prototype);

//------------------------------------------------------------------------------

function LinkLine(settings) {
	Konva.Line.apply(this, [settings]);
}

LinkLine.create = function (fromNode, toNode, style) {
	var line = new LinkLine(style || Style.Link);
	line.setAttrs({
		points: [fromNode.x(), fromNode.y(), toNode.x(), toNode.y()]
	});

	return line;
}

LinkLine.prototype = Object.create(Konva.Line.prototype);

//------------------------------------------------------------------------------

function Force(settings) {
	Konva.Arrow.apply(this, [settings]);
	Attachment.apply(this);
}

Force.create = function (rotation, nodeCircle, style) {
	var force = new Force(style || Style.Force);
	force.setAttrs({
		x: nodeCircle.x() + 64 * Math.sin(rotation * Math.PI / 180),
		y: nodeCircle.y() - 64 * Math.cos(rotation * Math.PI / 180),
		rotation: rotation,
		draggable: true,
		dragBoundFunc: function (pos) {
			if (!this.isDragging())
				return pos;

			var x1 = nodeCircle.x();
			var y1 = nodeCircle.y();
			var x2 = stage.getPointerPosition().x;
			var y2 = stage.getPointerPosition().y;
			var radius = 64;
			var scale = radius / Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
			return {
				x: Math.round((x2 - x1) * scale) + x1,
				y: Math.round((y2 - y1) * scale) + y1
			};
		}.bind(force)
	});
	force.on('dragmove', function () {
		force.rotation((Math.atan2((force.y() - nodeCircle.y()), (force.x() - nodeCircle.x())) + Math.PI / 2) * 180 / Math.PI);
	});
	force.attachTo(nodeCircle, 0, -(nodeCircle.height() / 2 + 32));

	return force;
}

Force.prototype = Object.create(Konva.Arrow.prototype);
extend(Force.prototype, Attachment.prototype);

//------------------------------------------------------------------------------

function Support(settings) {
	Konva.Line.apply(this, [settings]);
	Attachment.apply(this);
}

Support.createSupport = function (rotation, nodeCircle, style) {
	var support = new Support(style);
	support.setAttrs({
		x: nodeCircle.x() - nodeCircle.height() / 2 * Math.sin(rotation * Math.PI / 180),
		y: nodeCircle.y() + nodeCircle.height() / 2 * Math.cos(rotation * Math.PI / 180),
		rotation: rotation,
		draggable: true,
		dragBoundFunc: function (pos) {
			if (!this.isDragging())
				return pos;

			var x1 = nodeCircle.x();
			var y1 = nodeCircle.y();
			var x2 = stage.getPointerPosition().x;
			var y2 = stage.getPointerPosition().y;
			var radius = nodeCircle.height() / 2;
			var scale = radius / Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
			return {
				x: Math.round((x2 - x1) * scale) + x1,
				y: Math.round((y2 - y1) * scale) + y1
			};
		}.bind(support)
	});
	support.on('dragmove', function () {
		support.rotation((Math.atan2((support.y() - nodeCircle.y()), (support.x() - nodeCircle.x())) - Math.PI / 2) * 180 / Math.PI);
	});
	support.attachTo(nodeCircle, 0, nodeCircle.height() / 2);

	return support;
}

Support.prototype = Object.create(Konva.Line.prototype);
extend(Support.prototype, Attachment.prototype);

if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
    module.exports = {
    	NodeCircle: NodeCircle,
    	LinkLine: LinkLine,
    	Force: Force,
    	Support: Support
    };
}