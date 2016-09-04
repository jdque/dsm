var StateManager = require('./common/state_manager');
var SelectionSet = require('./common/selection_set');
var Graph = require('./model/graph');
var ResultGraph = require('./model/result_graph');
var Solver = require('analysis/solver');
var Style = require('./ui/style');
var Interactables = require('./ui/interactables');
var Renderers = require('./ui/renderers');

var testData = require('./test_data');

var appState;
var stage;
var canvas;
var origin;
var graph;
var graphRenderer;
var resultRenderer;
var gridRenderer;
var transientRenderer;
var mainSelection;

//------------------------------------------------------------------------------

var selectionState = {
	enter: function () {
		this.clickedObject = null;

		stage.on("dragstart", function (e) {
			mainSelection.select(e.target);
		});

		stage.on("dragmove", function (e) {
			var selectedObject = mainSelection.get();
			if (selectedObject instanceof Interactables.NodeCircle) {
				gridRenderer.snapObject(selectedObject, "center");
				canvas.draw();
				graph.updateNode(graphRenderer.getGraphNode(selectedObject), {
					position: [selectedObject.x(), origin[1] - selectedObject.y()]
				});
			}
			transientRenderer.updateBoundingBox();
			transientRenderer.redraw();
		}.bind(this));

		stage.on("dragend", function (e) {
			var selectedObject = mainSelection.get();
			if (selectedObject instanceof Interactables.Support) {
				var support = graphRenderer.getGraphSupport(selectedObject);
				var node = support.parentNode;
				support.rotation = -selectedObject.rotation();
				graph.updateNode(node, {
					support: support
				});
			}
			else if (selectedObject instanceof Interactables.Force) {
				var force = graphRenderer.getGraphForce(selectedObject);
				var node = force.parentNode;
				var angle = selectedObject.rotation() * Math.PI / 180;
				var magnitude = Math.sqrt(Math.pow(force.vector[0], 2) + Math.pow(force.vector[1], 2));
				force.vector = [-magnitude * Math.sin(angle), -magnitude * Math.cos(angle), force.vector[2]];
				graph.updateNode(node, {
					forces: node.forces
				});
			}
		}.bind(this));

		stage.on("click", function (e) {
			this.clickedObject = e.target;
			mainSelection.select(e.target);
			transientRenderer.setBoundingBox(e.target);
			transientRenderer.redraw();
		}.bind(this));

		stage.on("contentClick", function (e) {
			if (!this.clickedObject) {
				mainSelection.clear();
				transientRenderer.setBoundingBox(null);
				transientRenderer.redraw();
			}
			this.clickedObject = null;
		}.bind(this));

		stage.on("contentMouseup", function () {
		}.bind(this));

		stage.on("contentMousemove", function () {
			var object = stage.getIntersection(stage.getPointerPosition());
			transientRenderer.clearHighlights();
			if (object) {
				transientRenderer.highlight(object);
			}
			transientRenderer.redraw();
		}.bind(this));
	},

	exit: function () {
		this.clickedObject = null;
	}
};

var drawState = {
	enter: function () {
		//TODO - deactivate dragging on nodes
		this.activeEndNode = Interactables.NodeCircle.create({x: null, y: null});
		canvas.add(this.activeEndNode);

		var selectedObject = mainSelection.get();
		if (selectedObject && selectedObject.name() === Interactables.NodeCircle.Name) {
			this.startNodeCircle = selectedObject.getParent();

			this.activeLine = Interactables.LinkLine.create(this.startNodeCircle.position(), this.startNodeCircle.position());
			canvas.add(this.activeLine);
			this.activeLine.moveToBottom();

			this.activeStartNode = Interactables.NodeCircle.create(this.startNodeCircle.position());
			canvas.add(this.activeStartNode);
		}
		canvas.draw();

		stage.on("contentClick contentTouchend", function () {
			var placementPosition = this.activeEndNode.x() !== null && this.activeEndNode.y() !== null ?
				this.activeEndNode.position() : stage.getPointerPosition();
			var intersectObject = stage.getIntersection(placementPosition);
			if (intersectObject) {
				if (intersectObject.name() === Interactables.NodeCircle.Name && intersectObject.getParent() !== this.startNodeCircle) {
					if (this.activeLine) {
						createNewLink(this.startNodeCircle, intersectObject.getParent());
						mainSelection.select(intersectObject);
					}
				}
			}
			else {
				var newNodeCircle = createNewNode(placementPosition);
				if (this.activeLine) {
					createNewLink(this.startNodeCircle, newNodeCircle);
				}
				mainSelection.select(newNodeCircle.circle);
			}
			appState.setState('draw');
		}.bind(this));

		stage.on("contentMousemove contentTouchmove", function () {
			this.activeEndNode.setAttrs({
				x: stage.getPointerPosition().x,
				y: stage.getPointerPosition().y
			});
			gridRenderer.snapObject(this.activeEndNode, "center");

			if (this.activeLine) {
				this.activeLine.setAttrs({
					points: [this.startNodeCircle.x(), this.startNodeCircle.y(),
							 this.activeEndNode.x(), this.activeEndNode.y()]
				});
			}
			canvas.draw();
		}.bind(this));
	},

	exit: function () {
		this.activeEndNode.destroy();
		if (this.activeStartNode) {
			this.activeStartNode.destroy();
		}
		if (this.activeLine) {
			this.activeLine.destroy();
		}
		canvas.draw();
		this.activeStartNode = null;
		this.activeEndNode = null;
		this.activeLine = null;
		this.startNodeCircle = null;
	}
};

function createNewNode(position) {
	var node = new Graph.Node({
		id: Math.round(Math.random(1) * 100000),
		position: [position.x, origin[1] - position.y]
	});
	graph.addNode(node);
	return graphRenderer.getRenderNode(node);
}

function createNewLink(startNodeCircle, endNodeCircle) {
	var mat = new Graph.Material({id: "steel", elasticMod: 4});
	graph.addMaterial(mat);

	var sec = new Graph.Section({id: "spar", area: 100, momInertia: 1000000});
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
	return graphRenderer.getRenderLink(link);
}

function setupDOM() {
	document.getElementById("draw-button").onclick = function () {
		if (appState.getActiveStateId() === 'selection') {
			appState.setState('draw');
		}
		else if (appState.getActiveStateId() === 'draw') {
			appState.setState('selection');
		}
	}

	document.getElementById("fixed-button").onclick = function () {
		if (appState.getActiveStateId() === 'selection') {
			var selectedObject = mainSelection.get();
			if (selectedObject && selectedObject.name() === Interactables.NodeCircle.Name) {
				var node = graphRenderer.getGraphNode(selectedObject.getParent());
				node.support.freedom = [false, false, false];
				graph.updateNode(node, {support: node.support});
			}
		}
	}

	document.getElementById("pin-button").onclick = function () {
		if (appState.getActiveStateId() === 'selection') {
			var selectedObject = mainSelection.get();
			if (selectedObject && selectedObject.name() === Interactables.NodeCircle.Name) {
				var node = graphRenderer.getGraphNode(selectedObject.getParent());
				node.support.freedom = [false, false, true];
				graph.updateNode(node, {support: node.support});
			}
		}
	}

	document.getElementById("roller-button").onclick = function () {
		if (appState.getActiveStateId() === 'selection') {
			var selectedObject = mainSelection.get();
			if (selectedObject && selectedObject.name() === Interactables.NodeCircle.Name) {
				var node = graphRenderer.getGraphNode(selectedObject.getParent());
				node.support.freedom = [true, false, true];
				graph.updateNode(node, {support: node.support});
			}
		}
	}

	document.getElementById("force-button").onclick = function () {
		if (appState.getActiveStateId() === 'selection') {
			var selectedObject = mainSelection.get();
			if (selectedObject && selectedObject.name() === Interactables.NodeCircle.Name) {
				var node = graphRenderer.getGraphNode(selectedObject.getParent());
				node.forces.push(new Graph.Force({
					parentNode: node,
					vector: [0, -100, 0]
				}));
				graph.updateNode(node, {forces: node.forces});
			}
		}
	}

	document.getElementById("solve-button").onclick = function () {
		var resultGraph = new ResultGraph(graph);
		var solver = new Solver();
		solver.solveNodes(resultGraph);
		solver.solveElements(resultGraph);
		console.log(resultGraph);

		resultRenderer.setGraph(resultGraph);
		resultRenderer.redraw();
	}

	var canvasWrapper = document.getElementById("canvas-wrapper");
	canvasWrapper.addEventListener("mousedown", function (e) {
		if (document.activeElement !== canvasWrapper)
			canvasWrapper.focus();
	});
	canvasWrapper.addEventListener("keydown", function (e) {
		if (appState.getActiveStateId() === 'selection') {
			var selectedObject = mainSelection.get();
			if (!selectedObject)
				return;

			if (selectedObject.name() === Interactables.NodeCircle.Name) {
				if (e.keyCode === 46) {
					var node = graphRenderer.getGraphNode(selectedObject.getParent());
					graph.removeNode(node);
					mainSelection.clear();
					transientRenderer.setBoundingBox(null);
					transientRenderer.redraw();
				}
			}
			else if (selectedObject instanceof Interactables.LinkLine) {
				if (e.keyCode === 46) {
					var link = graphRenderer.getGraphLink(selectedObject);
					graph.removeLink(link);
					mainSelection.clear();
					transientRenderer.setBoundingBox(null);
					transientRenderer.redraw();
				}
			}
			else if (selectedObject instanceof Interactables.Force) {
				if (e.keyCode === 46) {
					var force = graphRenderer.getGraphForce(selectedObject);
					var node = force.parentNode;
					node.forces.splice(node.forces.indexOf(force), 1);
					graph.updateNode(node, {forces: node.forces});
					mainSelection.clear();
					transientRenderer.setBoundingBox(null);
					transientRenderer.redraw();
				}
			}
			else if (selectedObject instanceof Interactables.Support) {
				if (e.keyCode === 46) {
					var support = graphRenderer.getGraphSupport(selectedObject);
					var node = support.parentNode;
					support.freedom = [true, true, true];
					support.rotation = 0;
					graph.updateNode(node, {
						support: support
					});
					mainSelection.clear();
					transientRenderer.setBoundingBox(null);
					transientRenderer.redraw();
				}
			}
		}
	}, false);
	canvasWrapper.tabIndex = 1;
	canvasWrapper.focus();
}

function run() {
	setupDOM();

	stage = new Konva.Stage({
		container: 'canvas-wrapper',
		width: 1024,
		height: 768
	});

	var gridLayer = new Konva.Layer();
	gridLayer.disableHitGraph();
	var transientLayer = new Konva.Layer();
	transientLayer.disableHitGraph();
	var objectLayer = new Konva.Layer();
	stage.add(gridLayer, objectLayer, transientLayer);

	canvas = transientLayer;

	origin = [0, canvas.height()];
	//graph = new Graph();
	graph = Graph.fromJSON(testData.test3);

	gridRenderer = new Renderers.GridRenderer(gridLayer);
	gridRenderer.setSpacing(32, 32);
	gridRenderer.redraw();

	transientRenderer = new Renderers.TransientRenderer(transientLayer);

	graphRenderer = new Renderers.GraphRenderer(objectLayer, origin);
	graphRenderer.setGraph(graph);
	graphRenderer.redraw();

	resultRenderer = new Renderers.ResultGraphRenderer(objectLayer, origin);

	mainSelection = new SelectionSet();

	appState = new StateManager(stage);
	appState.addState('selection', selectionState);
	appState.addState('draw', drawState);

	appState.setState('selection');
}

var App = {
    run: run
};

module.exports = App;