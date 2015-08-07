(function () {

var appState;
var stage;
var canvas;
var origin;
var graph;
var graphRenderer;
var gridRenderer;
var mainSelection;

function NodeCircle(settings) {
	Konva.Circle.apply(this, [settings]);
	AttachmentContainer.apply(this);
}

NodeCircle.prototype = Object.create(Konva.Circle.prototype);
extend(NodeCircle.prototype, AttachmentContainer.prototype);

function Force(settings) {
	Konva.Arrow.apply(this, [settings]);
	Attachment.apply(this);
}

Force.prototype = Object.create(Konva.Arrow.prototype);
extend(Force.prototype, Attachment.prototype);

function Support(settings) {
	Konva.Line.apply(this, [settings]);
	Attachment.apply(this);
}

Support.prototype = Object.create(Konva.Line.prototype);
extend(Support.prototype, Attachment.prototype);

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
			this.nodeMap[nodeId].destroy();
			delete this.nodeMap[nodeId];
		}
	}.bind(this));

	Object.keys(this.linkMap).forEach(function (linkId) {
		if (this.graph.findLinkById(linkId) === null) {
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

	canvas.draw();
}

GraphRenderer.prototype.addNode = function (node) {
	var nodeCircle = drawNode(node.position[0], this.origin[1] - node.position[1]);
	canvas.draw();

	this._associateNode(node, nodeCircle);
	this.addNodeAttachments(node);
}

GraphRenderer.prototype.addLink = function (link) {
	var fromNode = this.nodeMap[link.source['id']];
	var toNode = this.nodeMap[link.target['id']];
	var linkLine = drawLink(fromNode, toNode);
	canvas.draw();

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

	this.removeNodeAttachments(node);

	this.nodeMap[node['id']].destroy();
	canvas.draw();

	this._unassociateNode(node);
}

GraphRenderer.prototype.removeLink = function (link) {
	this.linkMap[link['id']].destroy();
	canvas.draw();

	this._unassociateLink(link);
}

GraphRenderer.prototype.removeNodeAttachments = function (node) {
	var renderNode = this.nodeMap[node['id']];
	renderNode.clearAttachments();
	canvas.draw();
}

GraphRenderer.prototype.updateNode = function (node) {
	var renderNode = this.nodeMap[node['id']];

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

	canvas.draw();
}

GraphRenderer.prototype.updateLink = function (link) {
	//Position
	var line = this.linkMap[link['id']];
	var sourceRenderNode = this.nodeMap[link.source['id']];
	var targetRenderNode = this.nodeMap[link.target['id']];
	line.setAttrs({
		points: [sourceRenderNode.x(), sourceRenderNode.y(),
				 targetRenderNode.x(), targetRenderNode.y()]
	});

	canvas.draw();
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

function drawNode(canvasX, canvasY) {
	var circle = new NodeCircle(Style.Node);
	circle.setAttrs({
		x: canvasX,
		y: canvasY,
		draggable: true
	});
	canvas.add(circle);

	return circle;
}

function drawLink(fromNode, toNode) {
	var line = new Konva.Line(Style.Link);
	line.setAttrs({
		points: [fromNode.x(), fromNode.y(), toNode.x(), toNode.y()]
	});
	canvas.add(line);
	line.moveToBottom();

	return line;
}

function drawPinSupport(nodeCircle) {
	var support = new Support(Style.PinSupport);
	support.setAttrs({
		x: nodeCircle.x(),
		y: nodeCircle.y() + nodeCircle.height() / 2,
		draggable: true,
		dragBoundFunc: function (pos) {
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
		}
	});
	support.on('dragmove', function () {
		support.rotation((Math.atan2((support.y() - nodeCircle.y()), (support.x() - nodeCircle.x())) - Math.PI / 2) * 180 / Math.PI);
	})
	support.attachTo(nodeCircle, 0, nodeCircle.height() / 2);
	canvas.add(support);

	return support;
}

function drawRollerSupport(nodeCircle) {
	var support = new Support(Style.RollerSupport);
	support.setAttrs({
		x: nodeCircle.x(),
		y: nodeCircle.y() + nodeCircle.height() / 2,
		draggable: true,
		dragBoundFunc: function (pos) {
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
		}
	});
	support.on('dragmove', function () {
		support.rotation((Math.atan2((support.y() - nodeCircle.y()), (support.x() - nodeCircle.x())) - Math.PI / 2) * 180 / Math.PI);
	});
	support.attachTo(nodeCircle, 0, nodeCircle.height() / 2);
	canvas.add(support);

	return support;
}

function drawForce(nodeCircle) {
	var force = new Force(Style.Force);
	force.setAttrs({
		x: nodeCircle.x(),
		y: nodeCircle.y() - 64,
		draggable: true,
		dragBoundFunc: function (pos) {
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
		}
	});
	force.on('dragmove', function () {
		force.rotation((Math.atan2((force.y() - nodeCircle.y()), (force.x() - nodeCircle.x())) + Math.PI / 2) * 180 / Math.PI);
	});
	force.attachTo(nodeCircle, 0, -(nodeCircle.height() / 2 + 32));
	canvas.add(force);

	return force;
}

function selectionState() {
	stage.on("dragstart", function (e) {
		mainSelection.select(e.target);
	});

	stage.on("dragmove", function (e) {
		var selectedObject = mainSelection.get();
		if (selectedObject instanceof NodeCircle) {
			gridRenderer.snapObject(selectedObject, "center");
			canvas.draw();
			graph.updateNode(graphRenderer.getGraphNode(selectedObject), {
				position: [selectedObject.x(), origin[1] - selectedObject.y()]
			});
		}
	}.bind(this));

	stage.on("click", function (e) {
		mainSelection.select(e.target);
	}.bind(this));

	stage.on("contentMouseup", function () {
	}.bind(this));

	stage.on("contentMousemove", function () {
	}.bind(this));
};

function addNodeState() {
	this.activeNode = drawNode(0, 0);
	canvas.draw();

	stage.on("contentClick", function () {
		this.createNewNode();
		this.activeNode.destroy();
		this.activeNode = null;
		canvas.draw();

		appState.setState('selection');
	}.bind(this));

	stage.on("contentMousemove", function () {
		this.activeNode.setAttrs({
			x: stage.getPointerPosition().x,
			y: stage.getPointerPosition().y
		});
		gridRenderer.snapObject(this.activeNode, "center");
		canvas.draw();
	}.bind(this));

	this.createNewNode = function () {
		var node = new Graph.Node({
			id: Math.round(Math.random(1) * 100000),
			position: [this.activeNode.x(), origin[1] - this.activeNode.y()]
		});
		graph.addNode(node);
	}.bind(this);
};

function addLinkState() {
	var selectedObject = mainSelection.get();
	var line = drawLink(selectedObject, selectedObject);
	canvas.draw();
	
	this.activeLine = line;
	this.startNodeCircle = selectedObject;

	stage.on("click", function (e) {
		if (e.target instanceof NodeCircle && e.target !== this.startNodeCircle) {
			this.createNewLink(this.startNodeCircle, e.target);
			this.activeLine.destroy();
			this.activeLine = null;
			this.startNodeCircle = null;
			canvas.draw();

			appState.setState('selection');
		}
	}.bind(this));

	stage.on("contentMousemove", function () {
		line.setAttrs({
			points: [this.startNodeCircle.x(), this.startNodeCircle.y(),
					 stage.getPointerPosition().x, stage.getPointerPosition().y]
		});
		canvas.draw();
	}.bind(this));

	this.createNewLink = function (startNodeCircle, endNodeCircle) {
		var mat = new Graph.Material({id: "steel", elasticMod: 4});
		graph.addMaterial(mat);

		var sec = new Graph.Section({id: "spar", area: 100});
		graph.addSection(sec);

		var fromNode = graphRenderer.getGraphNode(startNodeCircle);
		var toNode = graphRenderer.getGraphNode(endNodeCircle);
		var link = new Graph.Link({
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
		var selectedObject = mainSelection.get();
		if (appState.getActiveStateId() === 'selection' && selectedObject instanceof NodeCircle) {
			appState.setState('add_link');
		}
	}

	document.getElementById("pin-button").onclick = function () {
		var selectedObject = mainSelection.get();
		if (appState.getActiveStateId() === 'selection' && selectedObject instanceof NodeCircle) {
			var node = graphRenderer.getGraphNode(selectedObject);
			graph.updateNode(node, {constraint: ['fixed', 'fixed']});
		}
	}

	document.getElementById("roller-button").onclick = function () {
		var selectedObject = mainSelection.get();
		if (appState.getActiveStateId() === 'selection' && selectedObject instanceof NodeCircle) {
			var node = graphRenderer.getGraphNode(selectedObject);
			graph.updateNode(node, {constraint: ['free', 'fixed']});
		}	
	}

	document.getElementById("force-button").onclick = function () {
		var selectedObject = mainSelection.get();
		if (appState.getActiveStateId() === 'selection' && selectedObject instanceof NodeCircle) {
			var node = graphRenderer.getGraphNode(selectedObject);
			graph.updateNode(node, {force: [0, -20]});
		}
	}

	document.getElementById("solve-button").onclick = function () {
		Solver.solve(graph);
	}

	var canvasWrapper = document.getElementById("canvas-wrapper");
	canvasWrapper.addEventListener("mousedown", function (e) {
		if (document.activeElement !== canvasWrapper)
			canvasWrapper.focus();
	});
	canvasWrapper.addEventListener("keydown", function (e) {
		var selectedObject = mainSelection.get();
		if (appState.getActiveStateId() === 'selection') {
			if (selectedObject instanceof NodeCircle) {
				if (e.keyCode === 46) {
					var node = graphRenderer.getGraphNode(selectedObject);
					graph.removeNode(node);
				}
			}
			else if (selectedObject instanceof Force) {
				if (e.keyCode === 46) {
					var node = graphRenderer.getGraphNode(selectedObject.getAttachParent());
					graph.updateNode(node, {force: [0, 0]});
				}
			}
			else if (selectedObject instanceof Support) {
				if (e.keyCode === 46) {
					var node = graphRenderer.getGraphNode(selectedObject.getAttachParent());
					graph.updateNode(node, {constraint: ["free", "free"]});
				}
			}
		}
	}, false);
	canvasWrapper.tabIndex = 1;
	canvasWrapper.focus();
}

function initialize() {
	setupDOM();

	stage = new Konva.Stage({
		container: 'canvas-wrapper',
		width: 640,
		height: 480
	});

	var gridLayer = new Konva.Layer();
	gridLayer.disableHitGraph();
	var objectLayer = new Konva.Layer();
	stage.add(gridLayer, objectLayer);

	canvas = objectLayer;

	origin = [0, canvas.height()];
	//graph = new Graph();
	graph = Graph.fromJSON(test);

	gridRenderer = new GridRenderer(gridLayer);
	gridRenderer.setSpacing(32, 32);
	gridRenderer.redraw();

	graphRenderer = new GraphRenderer(objectLayer, graph, origin);
	graphRenderer.redraw();

	mainSelection = new SelectionSet();

	appState = new StateManager(stage);
	appState.addState('selection', selectionState);
	appState.addState('add_node', addNodeState);
	appState.addState('add_link', addLinkState);

	appState.setState('selection');
}

window.onload = initialize;

})();