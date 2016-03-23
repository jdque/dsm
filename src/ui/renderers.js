var Konva = require('../../lib/konva-0.9.5.js');
var Graph = require('../model/Graph.js');
var Style = require('./style.js');
var Interactables = require('./interactables.js');

function GraphRenderer(canvas, origin) {
	this.canvas = canvas;
	this.origin = origin;
	this.graph = new Graph();
	this.nodeMap = {};
	this.linkMap = {};

}

GraphRenderer.prototype.redraw = function () {
	//Remove rendered nodes/links that are no longer in the graph
	//TODO - do set comparison so this is not O(n^2)
	Object.keys(this.nodeMap).forEach(function (nodeId) {
		if (this.graph.findNodeById(parseInt(nodeId) || nodeId) === null) {
			this.nodeMap[nodeId].destroy();
			delete this.nodeMap[nodeId];
		}
	}.bind(this));

	Object.keys(this.linkMap).forEach(function (linkId) {
		if (this.graph.findLinkById(parseInt(linkId) || linkId) === null) {
			this.linkMap[linkId].destroy();
			delete this.linkMap[linkId];
		}
	}.bind(this));

	//Add new graph nodes/links or update existing ones
	this.graph.nodes.forEach(function (node) {
		if (this.nodeMap.hasOwnProperty(node['id'])) {
			this.updateNode(node);
		}
		else {
			this.addNode(node);
		}
	}.bind(this));

	this.graph.links.forEach(function (link) {
		if (this.linkMap.hasOwnProperty(link['id'])) {
			this.updateLink(link);
		}
		else {
			this.addLink(link);
		}
	}.bind(this));

	this.canvas.draw();
}

GraphRenderer.prototype.clear = function () {
	Object.keys(this.nodeMap).forEach(function (nodeId) {
		this.nodeMap[nodeId].destroy();
		delete this.nodeMap[nodeId];
	}.bind(this));

	Object.keys(this.linkMap).forEach(function (linkId) {
		this.linkMap[linkId].destroy();
		delete this.linkMap[linkId];
	}.bind(this));
}

GraphRenderer.prototype.setGraph = function (graph) {
	this.clear();
	this.graph = graph;
	//TODO remove listeners from previous graph
	this.graph.on(Graph.Event.ADD_NODE, this.addNode.bind(this));
	this.graph.on(Graph.Event.ADD_LINK, this.addLink.bind(this));
	this.graph.on(Graph.Event.REMOVE_NODE, this.removeNode.bind(this));
	this.graph.on(Graph.Event.REMOVE_LINK, this.removeLink.bind(this));
	this.graph.on(Graph.Event.UPDATE_NODE, this.updateNode.bind(this));
	this.graph.on(Graph.Event.UPDATE_LINK, this.updateLink.bind(this));
}

GraphRenderer.prototype.addNode = function (node) {
	var nodeCircle = Interactables.NodeCircle.create(node.position[0], this.origin[1] - node.position[1]);
	this.canvas.add(nodeCircle);
	this.canvas.draw();

	this._associateNode(node, nodeCircle);
	this.addNodeAttachments(node);
}

GraphRenderer.prototype.addLink = function (link) {
	var fromNode = this.getRenderNode(link.source);
	var toNode = this.getRenderNode(link.target);

	var linkLine = Interactables.LinkLine.create(fromNode, toNode);
	this.canvas.add(linkLine);
	linkLine.moveToBottom();
	this.canvas.draw();

	this._associateLink(link, linkLine);
}

GraphRenderer.prototype.addNodeAttachments = function (node) {
	var renderNode = this.getRenderNode(node);

	//Supports
	var xFree = node.freedom[0];
	var yFree = node.freedom[1];
	var rotFree = node.freedom[2];
	if (!xFree & !yFree & !rotFree) {
		var fixedSupport = Interactables.Support.createSupport(-node.rotation, renderNode, Style.FixedSupport);
		this.canvas.add(fixedSupport);
	}
	else if (!xFree && !yFree && rotFree) {
		var pinSupport = Interactables.Support.createSupport(-node.rotation, renderNode, Style.PinSupport);
		this.canvas.add(pinSupport);
	}
	else if ((xFree && !yFree || !xFree && yFree) && !rotFree) {
		//slider support
	}
	else if ((xFree && !yFree || !xFree && yFree) && rotFree) {
		var rollerSupport = Interactables.Support.createSupport(-node.rotation, renderNode, Style.RollerSupport);
		this.canvas.add(rollerSupport);
	}

	//Forces
	if (node.force[0] !== 0 || node.force[1] !== 0) {
		var angle = -Math.atan2(node.force[1], node.force[0]) * 180 / Math.PI - 90;
		var force = Interactables.Force.create(angle, renderNode);
		this.canvas.add(force);
	}
}

GraphRenderer.prototype.removeNode = function (node) {
	var links = this.graph.getLinks(node);
	links.forEach(function (link) {
		this.removeLink(link);
	}.bind(this));

	this.removeNodeAttachments(node);

	this.getRenderNode(node).destroy();
	this.canvas.draw();

	this._unassociateNode(node);
}

GraphRenderer.prototype.removeLink = function (link) {
	this.getRenderLink(link).destroy();
	this.canvas.draw();

	this._unassociateLink(link);
}

GraphRenderer.prototype.removeNodeAttachments = function (node) {
	var renderNode = this.getRenderNode(node);
	renderNode.clearAttachments();
	this.canvas.draw();
}

GraphRenderer.prototype.updateNode = function (node) {
	var renderNode = this.getRenderNode(node);

	//Position
	renderNode.setAttrs({
		x: node.position[0],
		y: this.origin[1] - node.position[1]
	});

	//Redraw links that are connected to the node
	var links = this.graph.getLinks(node);
	links.forEach(function (link) {
		this.updateLink(link);
	}.bind(this));

	//TODO - Modify existing externals instead of replacing them
	this.removeNodeAttachments(node);
	this.addNodeAttachments(node);

	this.canvas.draw();
}

GraphRenderer.prototype.updateLink = function (link) {
	//Position
	var renderLink = this.getRenderLink(link);
	var sourceRenderNode = this.getRenderNode(link.source);
	var targetRenderNode = this.getRenderNode(link.target);
	renderLink.setAttrs({
		points: [sourceRenderNode.x(), sourceRenderNode.y(),
				 targetRenderNode.x(), targetRenderNode.y()]
	});

	this.canvas.draw();
}

GraphRenderer.prototype.getGraphNode = function (renderNode) {
	return renderNode._graphNode;
}

GraphRenderer.prototype.getGraphLink = function (renderLink) {
	return renderLink._graphLink;
}

GraphRenderer.prototype.getRenderNode = function (graphNode) {
	return this.nodeMap[graphNode['id']];
}

GraphRenderer.prototype.getRenderLink = function (graphLink) {
	return this.linkMap[graphLink['id']];
}

GraphRenderer.prototype._associateNode = function (node, renderObject) {
	this.nodeMap[node['id']] = renderObject;
	renderObject._graphNode = node;
}

GraphRenderer.prototype._associateLink = function (link, renderObject) {
	this.linkMap[link['id']] = renderObject;
	renderObject._graphLink = link;
}

GraphRenderer.prototype._unassociateNode = function (node) {
	delete this.nodeMap[node['id']];
}

GraphRenderer.prototype._unassociateLink = function (link) {
	delete this.linkMap[link['id']];
}

//------------------------------------------------------------------------------

function ResultGraphRenderer(canvas, origin) {
	this.canvas = canvas;
	this.origin = origin;
	this.graph = new Graph();
	this.nodeMap = {};
	this.linkMap = {};
}

ResultGraphRenderer.prototype.redraw = function () {
	//Add new graph nodes/links or update existing ones
	this.graph.nodes.forEach(function (node) {
		if (this.nodeMap.hasOwnProperty(node.nodeRef['id'].toString())) {
			this.updateNode(node);
		}
		else {
			this.addNode(node);
		}
	}.bind(this));

	this.graph.links.forEach(function (link) {
		if (this.linkMap.hasOwnProperty(link.linkRef['id'].toString())) {
			this.updateLink(link);
		}
		else {
			this.addLink(link);
		}
	}.bind(this));

	this.canvas.draw();
}

ResultGraphRenderer.prototype.clear = function () {
	Object.keys(this.nodeMap).forEach(function (nodeId) {
		this.nodeMap[nodeId].destroy();
		delete this.nodeMap[nodeId];
	}.bind(this));

	Object.keys(this.linkMap).forEach(function (linkId) {
		this.linkMap[linkId].destroy();
		delete this.linkMap[linkId];
	}.bind(this));
}

ResultGraphRenderer.prototype.setGraph = function (graph) {
	this.clear();
	this.graph = graph;
}

ResultGraphRenderer.prototype.addNode = function (node) {
	var nodeCircle = Interactables.NodeCircle.create(
		node.position[0], this.origin[1] - node.position[1], Style.ResultNode);
	this.canvas.add(nodeCircle);
	this.canvas.draw();

	this._associateNode(node, nodeCircle);
	this.addNodeAttachments(node);
}

ResultGraphRenderer.prototype.addLink = function (link) {
	var fromNode = this.getRenderNode(link.source);
	var toNode = this.getRenderNode(link.target);
	var linkLine = Interactables.LinkLine.create(fromNode, toNode, Style.ResultLink);
	this.canvas.add(linkLine);
	linkLine.moveToBottom();
	this.canvas.draw();

	this._associateLink(link, linkLine);
}

ResultGraphRenderer.prototype.addNodeAttachments = function (node) {
	var renderNode = this.getRenderNode(node);

	//Forces
	/*if (node.force[0] !== 0 || node.force[1] !== 0) {
		var angle = -Math.atan2(node.force[1], node.force[0]) * 180 / Math.PI - 90;
		var force = Interactables.Force.create(angle, renderNode);
		this.canvas.add(force);
	}*/
}

ResultGraphRenderer.prototype.removeNodeAttachments = function (node) {
	var renderNode = this.getRenderNode(node);
	renderNode.clearAttachments();
	this.canvas.draw();
}

ResultGraphRenderer.prototype.updateNode = function (node) {
	var renderNode = this.getRenderNode(node);

	//Position
	renderNode.setAttrs({
		x: node.position[0],
		y: this.origin[1] - node.position[1]
	});

	//Redraw links that are connected to the node
	var links = this.graph.getLinks(node);
	links.forEach(function (link) {
		this.updateLink(link);
	}.bind(this));

	//TODO - Modify existing externals instead of replacing them
	this.removeNodeAttachments(node);
	this.addNodeAttachments(node);

	this.canvas.draw();
}

ResultGraphRenderer.prototype.updateLink = function (link) {
	//Position
	var renderLink = this.getRenderLink(link);
	var sourceRenderNode = this.getRenderNode(link.source);
	var targetRenderNode = this.getRenderNode(link.target);
	renderLink.setAttrs({
		points: [sourceRenderNode.x(), sourceRenderNode.y(),
				 targetRenderNode.x(), targetRenderNode.y()]
	});

	this.canvas.draw();
}

ResultGraphRenderer.prototype.getGraphNode = function (renderNode) {
	return renderNode._graphNode;
}

ResultGraphRenderer.prototype.getGraphLink = function (renderLink) {
	return renderLink._graphLink;
}

ResultGraphRenderer.prototype.getRenderNode = function (graphNode) {
	return this.nodeMap[graphNode.nodeRef['id']];
}

ResultGraphRenderer.prototype.getRenderLink = function (graphLink) {
	return this.linkMap[graphLink.linkRef['id']];
}

ResultGraphRenderer.prototype._associateNode = function (node, renderObject) {
	this.nodeMap[node.nodeRef['id']] = renderObject;
	renderObject._graphNode = node;
}

ResultGraphRenderer.prototype._associateLink = function (link, renderObject) {
	this.linkMap[link.linkRef['id']] = renderObject;
	renderObject._graphLink = link;
}

ResultGraphRenderer.prototype._unassociateNode = function (node) {
	delete this.nodeMap[node.nodeRef['id']];
}

ResultGraphRenderer.prototype._unassociateLink = function (link) {
	delete this.linkMap[link.linkRef['id']];
}

//------------------------------------------------------------------------------

function GridRenderer(canvas) {
	this.canvas = canvas;
	this.lines = [];
	this.xSpacing = 32;
	this.ySpacing = 32;
}

GridRenderer.prototype.setSpacing = function (xSpacing, ySpacing) {
	this.xSpacing = xSpacing;
	this.ySpacing = ySpacing;
}

GridRenderer.prototype.redraw = function () {
	this.clear();

	for (var y = 0; y < this.canvas.height(); y += this.ySpacing) {
		var line = new Konva.Line(Style.GridLine);
		line.points([0, y, this.canvas.width(), y]);
		this.canvas.add(line);
		this.lines.push(line);
	}

	for (var x = 0; x < this.canvas.width(); x += this.xSpacing) {
		var line = new Konva.Line(Style.GridLine);
		line.points([x, 0, x, this.canvas.height()]);
		this.canvas.add(line);
		this.lines.push(line);
	}

	this.canvas.draw();
}

GridRenderer.prototype.clear = function () {
	this.lines.forEach(function (line) {
		line.destroy();
	});
	this.lines = [];
	this.canvas.draw();
}

GridRenderer.prototype.snapObject = function (object, anchor) {
	var x, y;

	if (anchor === "center") {
		x = Math.round(object.x() / this.xSpacing) * this.xSpacing;
		y = Math.round(object.y() / this.ySpacing) * this.ySpacing;
	}
	else {
		x = Math.round(object.x() / this.xSpacing) * this.xSpacing;
		y = Math.round(object.y() / this.ySpacing) * this.ySpacing;
	}

	object.setAttrs({
		x: x,
		y: y
	});
}

if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
    module.exports = {
    	GraphRenderer: GraphRenderer,
    	ResultGraphRenderer: ResultGraphRenderer,
    	GridRenderer: GridRenderer
    };
}