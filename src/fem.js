(function () {

var appState;
var canvas;
var origin;
var graph;
var graphRenderer;
var gridRenderer;

function extend(destination, source) {
	for (var k in source) {
		if (source.hasOwnProperty(k)) {
			destination[k] = source[k];
		}
	}
	return destination; 
}

function AttachmentContainer() {
	this.attachments = [];
}

AttachmentContainer.prototype.addAttachment = function (object, offsetX, offsetY) {
	this.attachments.push({
		object: object,
		offsetX: offsetX,
		offsetY: offsetY
	});
}

AttachmentContainer.prototype.removeAttachment = function (object) {
	for (var i = 0; i < this.attachments.length; i++) {
		var attachmentObj = this.attachments[i].object;
		if (attachmentObj === object) {
			attachmentObj.canvas.remove(attachmentObj);
		}
	}
}

AttachmentContainer.prototype.clearAttachments = function () {
	this.attachments.forEach(function (attachment) {
		attachment.object.canvas.remove(attachment.object);
	});
	this.attachments = [];
}

AttachmentContainer.prototype.updateAttachments = function () {
	this.attachments.forEach(function (attachment) {
		attachment.object.set({
			left: this.getCenterPoint().x + attachment.offsetX,
			top: this.getCenterPoint().y + attachment.offsetY
		});
		attachment.object.setCoords();
	}.bind(this));
}

function NodeCircle(settings) {
	fabric.Circle.apply(this, [settings]);
	AttachmentContainer.apply(this);

	this.on('moving', function (e) {
		this.updateAttachments();
	}.bind(this));
}

NodeCircle.prototype = Object.create(fabric.Circle.prototype);
extend(NodeCircle.prototype, AttachmentContainer.prototype);

NodeCircle.prototype.remove = function () {
	this.clearAttachments();
	fabric.Circle.prototype.remove.call(this);
}

function GraphRenderer(canvas, graph, origin) {
	this.graph = graph;
	this.canvas = canvas;
	this.origin = origin;
	this.nodeMap = {};
	this.linkMap = {};

	this.graph.addListener(Graph.Event.ADD_NODE, this.addNode.bind(this));
	this.graph.addListener(Graph.Event.ADD_LINK, this.addLink.bind(this));
	this.graph.addListener(Graph.Event.REMOVE_NODE, this.removeNode.bind(this));
	this.graph.addListener(Graph.Event.REMOVE_LINK, this.removeLink.bind(this));
	this.graph.addListener(Graph.Event.UPDATE_NODE, this.updateNode.bind(this));
	this.graph.addListener(Graph.Event.UPDATE_LINK, this.updateLink.bind(this));
}

GraphRenderer.prototype.redraw = function () {
	//Remove rendered nodes/links that are no longer in the graph
	//TODO - do set comparison so this is not O(n^2)
	Object.keys(this.nodeMap).forEach(function (nodeId) {
		if (this.graph.findNodeById(nodeId) === null) {
			this.nodeMap[nodeId].remove();
			delete this.nodeMap[nodeId];
		}
	}.bind(this));

	Object.keys(this.linkMap).forEach(function (linkId) {
		if (this.graph.findLinkById(linkId) === null) {
			this.linkMap[linkId].remove();
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
}

GraphRenderer.prototype.addNode = function (node) {
	var nodeCircle = drawNode(node.position[0], this.origin[1] - node.position[1]);
	nodeCircle.on("moving", function (e) {
		//Update graph node position
		var x = nodeCircle.getCenterPoint().x;
		var y = this.origin[1] - nodeCircle.getCenterPoint().y;
		this.graph.updateNode(node, {position: [x, y]});

		//Redraw links that are connected to the node
		var links = this.graph.getLinks(node);
		links.forEach(function (link) {
			this.updateLink(link);
		}.bind(this));
	}.bind(this));
	this._associateNode(node, nodeCircle);

	this.addNodeAttachments(node);
}

GraphRenderer.prototype.addLink = function (link) {
	var fromNode = this.nodeMap[link.source['id']];
	var toNode = this.nodeMap[link.target['id']];
	var linkLine = drawLink(fromNode, toNode);
	this._associateLink(link, linkLine);
}

GraphRenderer.prototype.addNodeAttachments = function (node) {
	var renderNode = this.nodeMap[node['id']];

	//Supports
	if (node.constraint[0] === 'fixed' && node.constraint[1] === 'fixed') {
		drawPinSupport(renderNode);
	}
	else if (node.constraint[0] === 'free' && node.constraint[1] === 'fixed') {
		drawRollerSupport(renderNode);
	}

	//Forces
	if (node.force[1] !== 0) {
		drawForce(renderNode);
	}
}

GraphRenderer.prototype.removeNode = function (node) {
	var links = this.graph.getLinks(node);
	links.forEach(function (link) {
		this.removeLink(link);	
	}.bind(this));

	this.nodeMap[node['id']].remove();
	this._unassociateNode(node);
}

GraphRenderer.prototype.removeLink = function (link) {
	this.linkMap[link['id']].remove();
	this._unassociateLink(link);
}

GraphRenderer.prototype.removeNodeAttachments = function (node) {
	var renderNode = this.nodeMap[node['id']];
	renderNode.clearAttachments();
}

GraphRenderer.prototype.updateNode = function (node) {
	var renderNode = this.nodeMap[node['id']];

	//Position
	renderNode.set({
		left: node.position[0] - 10,
		top: this.origin[1] - node.position[1] - 10
	});

	//TODO - Modify existing externals instead of replacing them
	this.removeNodeAttachments(node);
	this.addNodeAttachments(node);
}

GraphRenderer.prototype.updateLink = function (link) {
	//Position
	var line = this.linkMap[link['id']];
	var sourceRenderNode = this.nodeMap[link.source['id']];
	var targetRenderNode = this.nodeMap[link.target['id']];
	line.set({
		x1: sourceRenderNode.getCenterPoint().x,
		y1: sourceRenderNode.getCenterPoint().y,
		x2: targetRenderNode.getCenterPoint().x,
		y2: targetRenderNode.getCenterPoint().y
	});
	line.setCoords();

	canvas.renderAll();
}

GraphRenderer.prototype.getGraphNode = function (renderNode) {
	return renderNode._graphNode;
}

GraphRenderer.prototype.getGraphLink = function (renderLink) {
	return renderLink._graphLink;
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

	for (var y = 0; y < this.canvas.height; y += this.ySpacing) {
		var line = new fabric.Line([0, y, this.canvas.width, y], Style.GridLine);
		this.canvas.add(line);
		line.sendToBack();
		this.lines.push(line);
	}

	for (var x = 0; x < this.canvas.width; x += this.xSpacing) {
		var line = new fabric.Line([x, 0, x, this.canvas.height], Style.GridLine);
		this.canvas.add(line);
		line.sendToBack();
		this.lines.push(line);
	}
}

GridRenderer.prototype.clear = function () {
	this.lines.forEach(function (line) {
		line.remove();
	});
	this.lines = [];
}

GridRenderer.prototype.snapObject = function (object, anchor) {
	var left;
	var top;

	if (anchor === "center") {
		left = Math.round((object.left + object.width / 2) / this.xSpacing) * this.xSpacing - object.width / 2;
		top = Math.round((object.top + object.height / 2) / this.ySpacing) * this.ySpacing - object.height / 2;
	}
	else {
		left = Math.round(object.left / this.xSpacing) * this.xSpacing;
		top = Math.round(object.top / this.ySpacing) * this.ySpacing;
	}

	object.set({
		left: left, 
		top: top
	});
}

function drawNode(canvasX, canvasY) {
	var circle = new NodeCircle(Style.Node);
	circle.set({
		left: canvasX - 10,
		top: canvasY - 10
	});
	canvas.add(circle);

	return circle;
}

function drawLink(fromNode, toNode) {
	var line = new fabric.Line(
		[fromNode.getCenterPoint().x, fromNode.getCenterPoint().y,
		 toNode.getCenterPoint().x, toNode.getCenterPoint().y],
		Style.Link);
	canvas.add(line);
	line.sendToBack();

	return line;
}

function drawPinSupport(nodeCircle) {
	var triangle = new fabric.Triangle(Style.PinSupport);
	triangle.set({
		left: nodeCircle.getCenterPoint().x - 12,
		top: nodeCircle.top + nodeCircle.height
	});
	canvas.add(triangle);
	nodeCircle.addAttachment(triangle, -12, nodeCircle.height / 2);
}

function drawRollerSupport(nodeCircle) {
	var triangle = new fabric.Triangle(Style.RollerSupport);
	triangle.set({
		left: nodeCircle.getCenterPoint().x - 12,
		top: nodeCircle.top + nodeCircle.height
	});
	canvas.add(triangle);
	nodeCircle.addAttachment(triangle, -12, nodeCircle.height / 2);	
}

function drawForce(nodeCircle) {
	var line1 = new fabric.Line([0, 32, 0, -32], Style.ForceArrow);
	var line2 = new fabric.Line([0, 32, -12, 16], Style.ForceArrow);
	var line3 = new fabric.Line([0, 32, 12, 16], Style.ForceArrow);
	var group = new fabric.Group([line1, line2, line3], {
		left: nodeCircle.getCenterPoint().x - 16, 
		top: nodeCircle.top - 72,
		width: 32,
		height: 64,
		hasControls: false,
		lockMovementX: true,
		lockMovementY: true
	});
	group.setCoords();
	canvas.add(group);
	nodeCircle.addAttachment(group, -16, -(nodeCircle.height / 2 + 72));
}

function StateManager(canvas) {
	this.canvas = canvas;
	this.stateMap = {};
	this.activeStateId = null;
}

StateManager.prototype.addState = function (id, object) {
	this.stateMap[id] = object;
}

StateManager.prototype.setState = function (stateId) {
	this.canvas.off();
	this.activeStateId = stateId;
	this.stateMap[stateId](this);
}

StateManager.prototype.getActiveStateId = function () {
	return this.activeStateId;
}

function selectionState() {
	canvas.on("object:selected", function (e) {
	}.bind(this));

	canvas.on("object:moving", function (e) {
		var selectedObject = canvas.getActiveObject();
		if (selectedObject instanceof NodeCircle) {
			gridRenderer.snapObject(selectedObject, "center");
		}
	}.bind(this));

	canvas.on("selection:cleared", function (e) {
	}.bind(this));

	canvas.on("mouse:up", function (e) {
	}.bind(this));

	canvas.on("mouse:move", function (e) {
	}.bind(this));
};

function addNodeState() {
	this.activeNode = new NodeCircle(Style.Node);
	canvas.add(this.activeNode);

	canvas.on("object:selected", function (e) {
	}.bind(this));

	canvas.on("object:moving", function (e) {
	}.bind(this));

	canvas.on("selection:cleared", function (e) {
	}.bind(this));

	canvas.on("mouse:up", function (e) {
		this.createNewNode();
		this.activeNode.remove();
		this.activeNode = null;

		appState.setState('selection');
	}.bind(this));

	canvas.on("mouse:move", function (e) {
		this.activeNode.set({
			left: e.e.x - 20,
			top: e.e.y - 20
		});
		gridRenderer.snapObject(this.activeNode, "center");
		canvas.renderAll();
	}.bind(this));

	this.createNewNode = function () {
		var node = new Node({
			id: Math.round(Math.random(1) * 100000),
			position: [this.activeNode.getCenterPoint().x, origin[1] - this.activeNode.getCenterPoint().y]
		});
		graph.addNode(node);
	}.bind(this);
};

function addLinkState() {
	var selectedObject = canvas.getActiveObject();
	var line = new fabric.Line(
				[selectedObject.getCenterPoint().x, selectedObject.getCenterPoint().y, 
				 selectedObject.getCenterPoint().x, selectedObject.getCenterPoint().y],
				Style.Link);
	canvas.add(line);
	line.sendToBack();
	
	this.activeLine = line;
	this.startNodeCircle = selectedObject;

	canvas.on("object:selected", function (e) {
		if (e.target instanceof NodeCircle && e.target !== this.startNodeCircle) {
			this.createNewLink();
			this.activeLine.remove();
			this.activeLine = null;
			this.startNodeCircle = null;

			appState.setState('selection');
		}
	}.bind(this));

	canvas.on("object:moving", function (e) {
	}.bind(this));

	canvas.on("selection:cleared", function (e) {
	}.bind(this));

	canvas.on("mouse:up", function (e) {
	}.bind(this));

	canvas.on("mouse:move", function (e) {
		if (this.activeLine) {
			this.activeLine.set('x2', e.e.x - 10);
			this.activeLine.set('y2', e.e.y - 10);
			canvas.renderAll();
		}
	}.bind(this));

	this.createNewLink = function () {
		var mat = new Material({id: "steel", elasticMod: 4});
		graph.addMaterial(mat);

		var sec = new Section({id: "spar", area: 100});
		graph.addSection(sec);

		var fromNode = graphRenderer.getGraphNode(this.startNodeCircle);
		var toNode = graphRenderer.getGraphNode(canvas.getActiveObject());
		var link = new Link({
			id: Math.round(Math.random(1) * 100000),
			source: fromNode,
			target: toNode,
			material: mat,
			section: sec
		});
		graph.addLink(link);
	}.bind(this);
};

function setupDOM() {
	document.getElementById("node-button").onclick = function () {
		if (appState.getActiveStateId() === 'selection') {
			appState.setState('add_node');
		}
	}

	document.getElementById("line-button").onclick = function () {
		var selectedObject = canvas.getActiveObject();
		if (appState.getActiveStateId() === 'selection' && selectedObject instanceof NodeCircle) {
			appState.setState('add_link');
		}
	}

	document.getElementById("pin-button").onclick = function () {
		var selectedObject = canvas.getActiveObject();
		if (appState.getActiveStateId() === 'selection' && selectedObject instanceof NodeCircle) {
			var node = graphRenderer.getGraphNode(selectedObject);
			graph.updateNode(node, {constraint: ['fixed', 'fixed']});
		}
	}

	document.getElementById("roller-button").onclick = function () {
		var selectedObject = canvas.getActiveObject();
		if (appState.getActiveStateId() === 'selection' && selectedObject instanceof NodeCircle) {
			var node = graphRenderer.getGraphNode(selectedObject);
			graph.updateNode(node, {constraint: ['free', 'fixed']});
		}	
	}

	document.getElementById("force-button").onclick = function () {
		var selectedObject = canvas.getActiveObject();
		if (appState.getActiveStateId() === 'selection' && selectedObject instanceof NodeCircle) {
			var node = graphRenderer.getGraphNode(selectedObject);
			graph.updateNode(node, {force: [0, -20]});
		}
	}

	document.getElementById("solve-button").onclick = function () {
		Solver.solve(graph);
	}

	var canvasWrapper = document.getElementById("canvas-wrapper");
	canvasWrapper.addEventListener("keydown", function (e) {
		var selectedObject = canvas.getActiveObject();
		if (appState.getActiveStateId() === 'selection' && selectedObject instanceof NodeCircle) {
			if (e.keyCode === 46) {
				var node = graphRenderer.getGraphNode(selectedObject);
				graph.removeNode(node);
			}
		}
	}, false);
	canvasWrapper.tabIndex = 1;
	canvasWrapper.focus();
}

function initialize() {
	setupDOM();

	canvas = new fabric.Canvas('stage');
	canvas.setDimensions({width: 640, height: 480});
	canvas.setBackgroundColor('rgba(255, 255, 255, 1.0)', canvas.renderAll.bind(canvas));

	origin = [0, canvas.height];
	//graph = new Graph();
	graph = Graph.fromJSON(test);

	gridRenderer = new GridRenderer(canvas);
	gridRenderer.setSpacing(32, 32);
	gridRenderer.redraw();

	graphRenderer = new GraphRenderer(canvas, graph, origin);
	graphRenderer.redraw();

	appState = new StateManager(canvas);
	appState.addState('selection', selectionState);
	appState.addState('add_node', addNodeState);
	appState.addState('add_link', addLinkState);

	appState.setState('selection');
}

window.onload = initialize;

})();