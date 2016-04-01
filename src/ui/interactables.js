var Konva = require('../../lib/konva-0.12.2.js');
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

function NodeCircle(settings) {
	Konva.Group.apply(this, [settings]);
}

NodeCircle.Name = "NodeCircle";

NodeCircle.create = function (x, y, style) {
	var node = new NodeCircle();
	node.setAttrs({
		x: x,
		y: y,
		width: 10,
		height: 10,
		draggable: true
	});

	node.circle = new Konva.Circle(style || Style.Node);
	node.circle.setAttrs({
		name: NodeCircle.Name,
		x: 0,
		y: 0
	});
	node.add(node.circle)

	return node;
}

NodeCircle.prototype = Object.create(Konva.Group.prototype);

NodeCircle.prototype.destroyAttachments = function () {
	var attachments = this.getChildren(function (node) {
		return node !== this.circle;
	}.bind(this));
	attachments.forEach(function (node) {
		node.destroy();
	});
}

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
}

Force.create = function (rotation, nodeCircle, style) {
	var force = new Force(style || Style.Force);
	force.setAttrs({
		x: (nodeCircle.circle.height() / 2 + force.height() + 4) * Math.sin(rotation * Math.PI / 180),
		y: -(nodeCircle.circle.height() / 2 + force.height() + 4) * Math.cos(rotation * Math.PI / 180),
		rotation: rotation,
		draggable: true,
		dragBoundFunc: function (pos) {
			if (!this.isDragging())
				return pos;

			var dx = this.getStage().getPointerPosition().x - nodeCircle.x();
			var dy = this.getStage().getPointerPosition().y - nodeCircle.y();
			var dlength = Math.sqrt(Math.pow(dx, 2) + Math.pow(dy, 2));
			if (dlength === 0)
				return pos;

			var radius = nodeCircle.circle.height() / 2 + force.height() + 4;
			var scale = radius / dlength;
			return {
				x: Math.round((dx) * scale) + nodeCircle.x(),
				y: Math.round((dy) * scale) + nodeCircle.y()
			};
		}.bind(force)
	});
	force.rotation((Math.atan2(force.y(), force.x()) + Math.PI / 2) * 180 / Math.PI);
	force.on('dragmove', function () {
		force.rotation((Math.atan2(force.y(), force.x()) + Math.PI / 2) * 180 / Math.PI);
	});

	return force;
}

Force.prototype = Object.create(Konva.Arrow.prototype);

//------------------------------------------------------------------------------

function Support(settings) {
	Konva.Line.apply(this, [settings]);
}

Support.create = function (rotation, nodeCircle, style) {
	var support = new Support(style);
	support.setAttrs({
		x: nodeCircle.circle.height() / 2 * Math.sin(-rotation * Math.PI / 180),
		y: nodeCircle.circle.height() / 2 * Math.cos(rotation * Math.PI / 180),
		draggable: true,
		dragBoundFunc: function (pos) {
			if (!this.isDragging())
				return pos;

			var dx = this.getStage().getPointerPosition().x - nodeCircle.x();
			var dy = this.getStage().getPointerPosition().y - nodeCircle.y();
			var dlength = Math.sqrt(Math.pow(dx, 2) + Math.pow(dy, 2));
			if (dlength === 0)
				return pos;

			var radius = nodeCircle.circle.height() / 2;
			var scale = radius / dlength;
			return {
				x: Math.round(dx * scale) + nodeCircle.x(),
				y: Math.round(dy * scale) + nodeCircle.y()
			};
		}.bind(support)
	});
	support.rotation((Math.atan2(support.y(), support.x()) - Math.PI / 2) * 180 / Math.PI);
	support.on('dragmove', function () {
		support.rotation((Math.atan2(support.y(), support.x()) - Math.PI / 2) * 180 / Math.PI);
	});

	return support;
}

Support.prototype = Object.create(Konva.Line.prototype);

if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
    module.exports = {
    	NodeCircle: NodeCircle,
    	LinkLine: LinkLine,
    	Force: Force,
    	Support: Support
    };
}