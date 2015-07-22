(function () {

var canvas;
var origin = [0, 0];
var activeState = null;

var graph;

function NodeCircle(settings) {
	fabric.Circle.call(this, settings);

	this.externals = [];

	this.on("moving", function (e) {
		this.snapToGrid(32);
		this.updateExternals();

		//Update graph node position
		var node = graph.getGraphObject(this);
		node.position[0] = this.getCenterPoint().x;
		node.position[1] = origin[1] - this.getCenterPoint().y;

		//Redraw links that are connected to the node
		var links = graph.getLinks(node);
		links.forEach(function (link) {
			var line = graph.getRenderObject(link);
			line.set({
				x1: graph.getRenderObject(link.source).getCenterPoint().x,
				y1: graph.getRenderObject(link.source).getCenterPoint().y,
				x2: graph.getRenderObject(link.target).getCenterPoint().x,
				y2: graph.getRenderObject(link.target).getCenterPoint().y
			});
			line.setCoords();
		});
		canvas.renderAll();
	}.bind(this));
}

NodeCircle.prototype = Object.create(fabric.Circle.prototype);

NodeCircle.prototype.addExternal = function (object, offsetX, offsetY) {
	this.externals.push({
		object: object,
		offsetX: offsetX,
		offsetY: offsetY
	});
}

NodeCircle.prototype.updateExternals = function () {
	this.externals.forEach(function (ext) {
		ext.object.set({
			left: this.getCenterPoint().x + ext.offsetX,
			top: this.getCenterPoint().y + ext.offsetY
		});
		ext.object.setCoords();
	}.bind(this));
}

NodeCircle.prototype.snapToGrid = function (spacing) {
	this.set({
		left: Math.round((this.left + this.width / 2) / spacing) * spacing - this.width / 2,
		top: Math.round((this.top + this.height / 2) / spacing) * spacing - this.height / 2
	});
}

function drawFromGraph(fromGraph) {
	fromGraph.nodes.forEach(function (node) {
		var nodeCircle = drawNode(node.position[0], origin[1] - node.position[1]);

		//Supports
		if (node.constraint[0] === 'fixed' && node.constraint[1] === 'fixed') {
			drawPinSupport(nodeCircle);
		}
		else if (node.constraint[0] === 'free' && node.constraint[1] === 'fixed') {
			drawRollerSupport(nodeCircle);
		}

		//Forces
		if (node.force[1] !== 0) {
			drawForce(nodeCircle);
		}

		graph.associate(nodeCircle, node);
	});

	fromGraph.links.forEach(function (link) {
		var fromNode = graph.getRenderObject(link.source);
		var toNode = graph.getRenderObject(link.target);
		var linkLine = drawLink(fromNode, toNode);

		graph.associate(linkLine, link);
	});
}

function drawNode(canvasX, canvasY) {
	var circle = new NodeCircle(Style.Node);
	circle.set({
		left: canvasX - 20,
		top: canvasY - 20
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
	nodeCircle.addExternal(triangle, -12, nodeCircle.height / 2);
}

function drawRollerSupport(nodeCircle) {
	var triangle = new fabric.Triangle(Style.RollerSupport);
	triangle.set({
		left: nodeCircle.getCenterPoint().x - 12,
		top: nodeCircle.top + nodeCircle.height
	});
	canvas.add(triangle);
	nodeCircle.addExternal(triangle, -12, nodeCircle.height / 2);	
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
	nodeCircle.addExternal(group, -16, -(nodeCircle.height / 2 + 72));
}

function drawGrid(spacing) {
	for (var y = 0; y < canvas.height; y += spacing) {
		canvas.add(new fabric.Line([0, y, canvas.width, y], Style.GridLine));
	}
	
	for (var x = 0; x < canvas.width; x += spacing) {
		canvas.add(new fabric.Line([x, 0, x, canvas.height], Style.GridLine));
	}
}

function setState(state) {
	canvas.off();
	activeState = state;
	state.activate();
}

function SelectionState() {
}

SelectionState.prototype.activate = function () {
	canvas.on("object:selected", function (e) {
	}.bind(this));

	canvas.on("object:moving", function (e) {
	}.bind(this));

	canvas.on("selection:cleared", function (e) {
	}.bind(this));

	canvas.on("mouse:up", function (e) {
	}.bind(this));

	canvas.on("mouse:move", function (e) {
	}.bind(this));
}

function AddNodeState() {
	this.activeNode = null;
}

AddNodeState.prototype.activate = function () {
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

		setState(new SelectionState());
	}.bind(this));

	canvas.on("mouse:move", function (e) {
		this.activeNode.set({
			left: e.e.x - 20,
			top: e.e.y - 20
		});
		this.activeNode.snapToGrid(32);
		canvas.renderAll();
	}.bind(this));
}

AddNodeState.prototype.createNewNode = function () {
	var node = new Node({
		position: [this.activeNode.getCenterPoint().x, origin[1] - this.activeNode.getCenterPoint().y]
	});
	graph.addNode(node);

	var nodeCircle = drawNode(this.activeNode.getCenterPoint().x + 10, this.activeNode.getCenterPoint().y + 10);
	graph.associate(nodeCircle, node);
}

function AddLinkState() {
	this.activeLine = null;
	this.startNodeCircle = null;
}

AddLinkState.prototype.activate = function () {
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

			setState(new SelectionState());
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
}

AddLinkState.prototype.createNewLink = function () {
	var mat = new Material({id: "steel", elasticMod: 4});
	graph.addMaterial(mat);

	var sec = new Section({id: "spar", area: 100});
	graph.addSection(sec);

	var fromNode = graph.getGraphObject(this.startNodeCircle);
	var toNode = graph.getGraphObject(canvas.getActiveObject());
	var link = new Link({
		id: Math.round(Math.random(1) * 100000),
		source: fromNode,
		target: toNode,
		material: mat,
		section: sec
	});
	graph.addLink(link);
	
	var linkLine = drawLink(this.startNodeCircle, canvas.getActiveObject());
	graph.associate(linkLine, link);
}

function initialize() {
	canvas = new fabric.Canvas('stage');
	canvas.setDimensions({width: 640, height: 480});
	canvas.setBackgroundColor('rgba(255, 255, 255, 1.0)', canvas.renderAll.bind(canvas));

	document.getElementById("node-button").onclick = function () {
		if (activeState instanceof SelectionState) {
			setState(new AddNodeState());
		}
	}

	document.getElementById("line-button").onclick = function () {
		var selectedObject = canvas.getActiveObject();
		if (activeState instanceof SelectionState && selectedObject instanceof NodeCircle) {
			setState(new AddLinkState());
		}
	}

	document.getElementById("pin-button").onclick = function () {
		var selectedObject = canvas.getActiveObject();
		if (activeState instanceof SelectionState && selectedObject instanceof NodeCircle) {
			var node = graph.getGraphObject(selectedObject);
			node.constraint = ['fixed', 'fixed'];
			drawPinSupport(selectedObject);
		}
	}

	document.getElementById("roller-button").onclick = function () {
		var selectedObject = canvas.getActiveObject();
		if (activeState instanceof SelectionState && selectedObject instanceof NodeCircle) {
			var node = graph.getGraphObject(selectedObject);
			node.constraint = ['free', 'fixed'];
			drawRollerSupport(selectedObject);
		}	
	}

	document.getElementById("force-button").onclick = function () {
		var selectedObject = canvas.getActiveObject();
		if (activeState instanceof SelectionState && selectedObject instanceof NodeCircle) {
			var node = graph.getGraphObject(selectedObject);
			node.force = [0, -20];
			drawForce(selectedObject);
		}
	}

	document.getElementById("solve-button").onclick = function () {
		Solver.solve(graph);
	}

	drawGrid(32);
	origin = [0, canvas.height];
	//graph = Graph.fromJSON(test);
	//drawFromGraph(graph);
	graph = new Graph();

	setState(new SelectionState());
}

window.onload = initialize;

})();